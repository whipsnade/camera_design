from fastapi.testclient import TestClient

from app.main import app


def test_create_project_ignores_client_supplied_id(tmp_path, monkeypatch):
    monkeypatch.setenv("CAMERA_PLAN_DATA_DIR", str(tmp_path))
    client = TestClient(app)

    payload = {
        "id": "../escape",
        "name": "demo-plan",
        "scale": {"pixelsPerMeter": 42.0, "source": "manual"},
        "cameras": [],
        "walls": [],
        "doors": [],
    }

    response = client.post("/api/projects", json=payload)
    created_project = response.json()

    persisted_files = list(tmp_path.glob("*.json"))

    assert response.status_code == 201
    assert created_project["id"] != payload["id"]
    assert persisted_files
    assert all(path.parent == tmp_path for path in persisted_files)
    assert all(path.stem == created_project["id"] for path in persisted_files)


def test_create_and_fetch_project_round_trip(tmp_path, monkeypatch):
    monkeypatch.setenv("CAMERA_PLAN_DATA_DIR", str(tmp_path))
    client = TestClient(app)

    payload = {
        "name": "demo-plan",
        "scale": {"pixelsPerMeter": 42.0, "source": "manual"},
        "cameras": [],
        "walls": [],
        "doors": [],
    }

    create_response = client.post("/api/projects", json=payload)
    project_id = create_response.json()["id"]

    fetch_response = client.get(f"/api/projects/{project_id}")

    assert create_response.status_code == 201
    assert fetch_response.status_code == 200
    assert fetch_response.json()["name"] == "demo-plan"
    assert fetch_response.json()["scale"]["pixelsPerMeter"] == 42.0
