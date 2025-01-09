import json
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

# Cloudflare bindings (defined at runtime)
# These are injected by the Cloudflare Workers runtime
SYNC_KV: Any = None  # type: ignore
STORAGE: Any = None  # type: ignore


# Storage classes
class StorageBase:
    def __init__(self, is_local: bool = False):
        self.is_local = is_local

    async def get(self, key: str) -> Optional[Any]:
        raise NotImplementedError

    async def put(self, key: str, value: Any) -> None:
        raise NotImplementedError

    async def delete(self, key: str) -> None:
        raise NotImplementedError


class KVStorage(StorageBase):
    def __init__(self, is_local: bool = False):
        super().__init__(is_local)
        self.kv = SYNC_KV  # Cloudflare KV binding

    async def get(self, key: str) -> Optional[Any]:
        try:
            value = await self.kv.get(key)
            return json.loads(value) if value else None
        except Exception:
            return None

    async def put(self, key: str, value: Any) -> None:
        await self.kv.put(key, json.dumps(value))

    async def delete(self, key: str) -> None:
        await self.kv.delete(key)


class ObjectStorage(StorageBase):
    def __init__(self, is_local: bool = False):
        super().__init__(is_local)
        self.bucket = STORAGE  # Cloudflare R2 binding

    async def get(self, key: str) -> Optional[Any]:
        try:
            obj = await self.bucket.get(key)
            return await obj.body() if obj else None
        except Exception:
            return None

    async def put(self, key: str, value: Any) -> None:
        await self.bucket.put(key, value if isinstance(value, bytes) else str(value).encode())

    async def delete(self, key: str) -> None:
        await self.bucket.delete(key)


# API Models
class SyncData(BaseModel):
    data: Dict[str, Any]
    timestamp: datetime
    device_id: str


# FastAPI Application
app = FastAPI(title="Chronicle Sync Worker")
kv_storage = KVStorage()
obj_storage = ObjectStorage()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "healthy"}


@app.get("/api/sync")
async def get_sync_data(x_group_id: str = Header(...)) -> dict[str, Any]:
    data = await kv_storage.get(f"sync:{x_group_id}")
    return data or {}


@app.post("/api/sync")
async def update_sync_data(sync_data: SyncData, x_group_id: str = Header(...)) -> dict[str, str]:
    await kv_storage.put(f"sync:{x_group_id}", sync_data.model_dump())
    return {"status": "success"}


@app.get("/api/storage/{key:path}")
async def get_object(key: str) -> Response:
    data = await obj_storage.get(key)
    if data is None:
        raise HTTPException(status_code=404, detail="Object not found")
    return Response(content=data, media_type="application/octet-stream")


@app.put("/api/storage/{key:path}")
async def put_object(key: str, request: Request) -> dict[str, str]:
    body = await request.body()
    if not body:
        raise HTTPException(status_code=400, detail="Missing body")
    await obj_storage.put(key, body)
    return {"status": "success"}


@app.delete("/api/storage/{key:path}")
async def delete_object(key: str) -> dict[str, str]:
    await obj_storage.delete(key)
    return {"status": "success"}
