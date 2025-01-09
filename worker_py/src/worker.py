from datetime import datetime
from typing import Any, Dict

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from .storage import KVStorage, ObjectStorage


class SyncData(BaseModel):
    data: Dict[str, Any]
    timestamp: datetime
    device_id: str


class ChronicleWorker:
    def __init__(self, is_local: bool = False):
        self.app = FastAPI(title="Chronicle Sync Worker")
        self.kv_storage = KVStorage(is_local=is_local)
        self.obj_storage = ObjectStorage(is_local=is_local)

        # Setup CORS
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=False,
            allow_methods=["*"],
            allow_headers=["*"],
        )

        # Register routes
        self.setup_routes()

    def setup_routes(self) -> None:
        @self.app.get("/health")
        async def health_check() -> dict[str, str]:
            return {"status": "healthy"}

        @self.app.get("/api/sync")
        async def get_sync_data(x_group_id: str = Header(...)) -> dict[str, Any]:
            data = await self.kv_storage.get(f"sync:{x_group_id}")
            return data or {}

        @self.app.post("/api/sync")
        async def update_sync_data(
            sync_data: SyncData, x_group_id: str = Header(...)
        ) -> dict[str, str]:
            await self.kv_storage.put(f"sync:{x_group_id}", sync_data.model_dump())
            return {"status": "success"}

        @self.app.get("/api/storage/{key:path}")
        async def get_object(key: str) -> Response:
            data = await self.obj_storage.get(key)
            if data is None:
                raise HTTPException(status_code=404, detail="Object not found")
            return Response(content=data, media_type="application/octet-stream")

        @self.app.put("/api/storage/{key:path}")
        async def put_object(key: str, request: Request) -> dict[str, str]:
            body = await request.body()
            if not body:
                raise HTTPException(status_code=400, detail="Missing body")

            await self.obj_storage.put(key, body)
            return {"status": "success"}

        @self.app.delete("/api/storage/{key:path}")
        async def delete_object(key: str) -> dict[str, str]:
            await self.obj_storage.delete(key)
            return {"status": "success"}
