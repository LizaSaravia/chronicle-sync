from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from src.worker import ChronicleWorker


@pytest.fixture
def client() -> TestClient:
    worker = ChronicleWorker(is_local=True)
    return TestClient(worker.app)


def test_health_endpoint(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_sync_endpoint(client: TestClient) -> None:
    group_id = "test-group"
    headers = {"X-Group-ID": group_id}

    # Test POST
    sync_data = {
        "data": {"key": "value"},
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "device_id": "test-device",
    }

    response = client.post("/api/sync", json=sync_data, headers=headers)
    assert response.status_code == 200
    assert response.json() == {"status": "success"}

    # Test GET
    response = client.get("/api/sync", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["key"] == "value"


def test_storage_endpoints(client: TestClient) -> None:
    test_data = b"test content"
    test_key = "test/file.txt"

    # Test PUT
    response = client.put(f"/api/storage/{test_key}", content=test_data)
    assert response.status_code == 200
    assert response.json() == {"status": "success"}

    # Test GET
    response = client.get(f"/api/storage/{test_key}")
    assert response.status_code == 200
    assert response.content == test_data

    # Test DELETE
    response = client.delete(f"/api/storage/{test_key}")
    assert response.status_code == 200
    assert response.json() == {"status": "success"}

    # Verify deletion
    response = client.get(f"/api/storage/{test_key}")
    assert response.status_code == 404


def test_cors_headers(client: TestClient) -> None:
    headers = {"Origin": "https://chroniclesync.xyz"}
    response = client.get("/health", headers=headers)
    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers
    assert response.headers["access-control-allow-origin"] == "*"

    # Test CORS preflight request
    response = client.options(
        "/api/sync",
        headers={
            "Origin": "https://chroniclesync.xyz",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "X-Group-ID",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "*"
    assert "POST" in response.headers["access-control-allow-methods"]
    assert "X-Group-ID" in response.headers["access-control-allow-headers"]


def test_sync_validation_errors(client: TestClient) -> None:
    # Test missing group ID
    response = client.get("/api/sync")
    assert response.status_code == 422
    assert "x-group-id" in response.json()["detail"][0]["loc"]

    # Test invalid sync data
    headers = {"X-Group-ID": "test-group"}
    invalid_data = {
        "data": {"key": "value"},
        # Missing required fields
    }
    response = client.post("/api/sync", json=invalid_data, headers=headers)
    assert response.status_code == 422
    error_detail = response.json()["detail"]
    assert any("timestamp" in err["loc"] for err in error_detail)
    assert any("device_id" in err["loc"] for err in error_detail)

    # Test invalid JSON
    response = client.post("/api/sync", content=b"invalid json", headers=headers)
    assert response.status_code == 422


def test_storage_error_cases(client: TestClient) -> None:
    test_key = "test/file.txt"

    # Test GET non-existent file
    response = client.get(f"/api/storage/{test_key}")
    assert response.status_code == 404
    assert response.json()["detail"] == "Object not found"

    # Test PUT empty body
    response = client.put(f"/api/storage/{test_key}", content=b"")
    assert response.status_code == 400
    assert response.json()["detail"] == "Missing body"

    # Test DELETE non-existent file (should succeed)
    response = client.delete(f"/api/storage/{test_key}")
    assert response.status_code == 200
    assert response.json() == {"status": "success"}
