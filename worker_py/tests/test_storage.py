import os
from datetime import datetime, timezone

import pytest

from src.storage import KVStorage, ObjectStorage


@pytest.fixture
def kv_storage() -> KVStorage:
    return KVStorage(is_local=True)


@pytest.fixture
def obj_storage() -> ObjectStorage:
    return ObjectStorage(is_local=True)


@pytest.mark.asyncio
async def test_kv_storage_basic_operations(kv_storage: KVStorage) -> None:
    key = "test-key"
    value = {
        "data": {"key": "value"},
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "device_id": "test-device",
    }

    # Test put and get
    await kv_storage.put(key, value)
    result = await kv_storage.get(key)
    assert result == value

    # Test delete
    await kv_storage.delete(key)
    result = await kv_storage.get(key)
    assert result is None


@pytest.mark.asyncio
async def test_kv_storage_json_handling(kv_storage: KVStorage) -> None:
    key = "test-key"
    value = {
        "string": "test",
        "number": 42,
        "bool": True,
        "null": None,
        "array": [1, 2, 3],
        "object": {"nested": "value"},
        "datetime": datetime.now(timezone.utc),
    }

    # Test JSON serialization/deserialization
    await kv_storage.put(key, value)
    result = await kv_storage.get(key)
    assert result is not None
    assert isinstance(result, dict)
    assert result["string"] == value["string"]
    assert result["number"] == value["number"]
    assert result["bool"] == value["bool"]
    assert result["null"] is None
    assert result["array"] == value["array"]
    assert result["object"] == value["object"]
    assert isinstance(result["datetime"], str)


@pytest.mark.asyncio
async def test_obj_storage_basic_operations(obj_storage: ObjectStorage) -> None:
    key = "test/file.txt"
    value = b"test content"

    # Test put and get
    await obj_storage.put(key, value)
    result = await obj_storage.get(key)
    assert result == value

    # Test delete
    await obj_storage.delete(key)
    result = await obj_storage.get(key)
    assert result is None


@pytest.mark.asyncio
async def test_obj_storage_binary_data(obj_storage: ObjectStorage) -> None:
    key = "test/binary.dat"
    value = bytes(range(256))  # All possible byte values

    # Test binary data handling
    await obj_storage.put(key, value)
    result = await obj_storage.get(key)
    assert result == value


@pytest.mark.asyncio
async def test_obj_storage_nested_paths(obj_storage: ObjectStorage) -> None:
    key = "test/nested/path/file.txt"
    value = b"test content"

    # Test nested path handling
    await obj_storage.put(key, value)
    result = await obj_storage.get(key)
    assert result == value

    # Verify the directory structure was created
    if obj_storage.is_local:
        path = os.path.join(obj_storage.temp_dir, key)
        assert os.path.exists(path)
        assert os.path.isfile(path)


@pytest.mark.asyncio
async def test_obj_storage_string_conversion(obj_storage: ObjectStorage) -> None:
    key = "test/string.txt"
    value = "test string content"

    # Test string to bytes conversion
    await obj_storage.put(key, value)
    result = await obj_storage.get(key)
    assert result == value.encode()


@pytest.mark.asyncio
async def test_obj_storage_cleanup(obj_storage: ObjectStorage) -> None:
    if not obj_storage.is_local:
        pytest.skip("Cleanup test only applies to local storage")

    key = "test/file.txt"
    value = b"test content"
    temp_dir = obj_storage.temp_dir

    # Verify temp directory exists
    assert os.path.exists(temp_dir)
    assert os.path.isdir(temp_dir)

    # Test file operations
    await obj_storage.put(key, value)
    file_path = os.path.join(temp_dir, key)
    assert os.path.exists(file_path)

    # Test cleanup
    await obj_storage.delete(key)
    assert not os.path.exists(file_path)
