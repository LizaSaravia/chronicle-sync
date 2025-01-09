import json
import os
import tempfile
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Optional

import CloudFlare  # type: ignore
import fakeredis
from dotenv import load_dotenv


class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj: Any) -> Any:
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


load_dotenv()


class StorageBase(ABC):
    @abstractmethod
    async def get(self, key: str) -> Optional[Any]:
        pass

    @abstractmethod
    async def put(self, key: str, value: Any) -> None:
        pass

    @abstractmethod
    async def delete(self, key: str) -> None:
        pass


class KVStorage(StorageBase):
    def __init__(self, is_local: bool = False, namespace_id: Optional[str] = None):
        self.is_local = is_local
        if is_local:
            self.redis = fakeredis.FakeStrictRedis()
        else:
            self.cf = CloudFlare.CloudFlare(
                token=os.getenv("CLOUDFLARE_API_TOKEN"),
                debug=os.getenv("DEBUG", "false").lower() == "true",
            )
            self.account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID")
            self.namespace_id = namespace_id or os.getenv("CLOUDFLARE_KV_NAMESPACE_ID")

    async def get(self, key: str) -> Optional[Any]:
        if self.is_local:
            value = self.redis.get(key)
            if not value or not isinstance(value, (str, bytes, bytearray)):
                return None
            return json.loads(value)
        else:
            try:
                value = self.cf.workers.kv.namespace(self.namespace_id).get(key)
                if not value or not isinstance(value, (str, bytes, bytearray)):
                    return None
                return json.loads(value)
            except CloudFlare.exceptions.CloudFlareAPIError:
                return None

    async def put(self, key: str, value: Any) -> None:
        if self.is_local:
            self.redis.set(key, json.dumps(value, cls=DateTimeEncoder))
        else:
            self.cf.workers.kv.namespace(self.namespace_id).put(
                key, json.dumps(value, cls=DateTimeEncoder)
            )

    async def delete(self, key: str) -> None:
        if self.is_local:
            self.redis.delete(key)
        else:
            self.cf.workers.kv.namespace(self.namespace_id).delete(key)


class ObjectStorage(StorageBase):
    def __init__(self, is_local: bool = False, bucket_name: Optional[str] = None):
        self.is_local = is_local
        if is_local:
            self.temp_dir = tempfile.mkdtemp()
        else:
            self.cf = CloudFlare.CloudFlare(
                token=os.getenv("CLOUDFLARE_API_TOKEN"),
                debug=os.getenv("DEBUG", "false").lower() == "true",
            )
            self.account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID")
            self.bucket_name = bucket_name or os.getenv("CLOUDFLARE_R2_BUCKET")

    async def get(self, key: str) -> Optional[Any]:
        if self.is_local:
            path = os.path.join(self.temp_dir, key)
            try:
                with open(path, "rb") as f:
                    return f.read()
            except FileNotFoundError:
                return None
        else:
            try:
                return self.cf.r2.bucket(self.bucket_name).get(key)
            except CloudFlare.exceptions.CloudFlareAPIError:
                return None

    async def put(self, key: str, value: Any) -> None:
        if self.is_local:
            path = os.path.join(self.temp_dir, key)
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "wb") as f:
                f.write(value if isinstance(value, bytes) else str(value).encode())
        else:
            self.cf.r2.bucket(self.bucket_name).put(
                key, value if isinstance(value, bytes) else str(value).encode()
            )

    async def delete(self, key: str) -> None:
        if self.is_local:
            path = os.path.join(self.temp_dir, key)
            try:
                os.remove(path)
            except FileNotFoundError:
                pass
        else:
            self.cf.r2.bucket(self.bucket_name).delete(key)
