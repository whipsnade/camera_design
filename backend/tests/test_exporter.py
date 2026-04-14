from base64 import b64decode

from fastapi.testclient import TestClient

from app.main import app
from app.models.project import Project
from app.services.exporter import export_project


PNG_BYTES = b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4d8AAAAASUVORK5CYII="
)


def build_project_with_two_cameras() -> Project:
    return Project(
        id="demo-project",
        name="demo-plan",
        scale={"pixelsPerMeter": 42, "source": "manual"},
        cameras=[
            {
                "id": "camera-1",
                "x": 48,
                "y": 72,
                "mode": "directional",
                "label": "CAM-01",
            },
            {
                "id": "camera-2",
                "x": 180,
                "y": 132,
                "mode": "panoramic",
                "label": "CAM-02",
            },
        ],
        walls=[
            {
                "id": "wall-1",
                "start": {"x": 12, "y": 12},
                "end": {"x": 220, "y": 12},
            }
        ],
        doors=[],
    )


def test_exporter_creates_png_pdf_and_project_bundle(tmp_path, monkeypatch):
    monkeypatch.setenv("CAMERA_PLAN_DATA_DIR", str(tmp_path))
    project = build_project_with_two_cameras()

    result = export_project(project, annotated_png_bytes=PNG_BYTES)

    assert result.png_path.exists()
    assert result.pdf_path.exists()
    assert result.project_path.exists()
    assert result.project_path.name == "project.camera-plan.json"
    assert result.project_path.parent.name == project.id
    assert result.project_path.read_text(encoding="utf-8").find('"label": "CAM-01"') >= 0
    assert result.pdf_path.read_bytes().startswith(b"%PDF")


def test_export_route_returns_artifact_paths(tmp_path, monkeypatch):
    monkeypatch.setenv("CAMERA_PLAN_DATA_DIR", str(tmp_path))
    client = TestClient(app)
    project = build_project_with_two_cameras()

    response = client.post(
        f"/api/projects/{project.id}/export",
        data={
            "metadata_json": project.model_dump_json(),
        },
        files={
            "annotated_png": ("annotated-plan.png", PNG_BYTES, "image/png"),
        },
    )

    payload = response.json()

    assert response.status_code == 200
    assert payload["project_path"].endswith("project.camera-plan.json")
    assert payload["png_path"].endswith(".png")
    assert payload["pdf_path"].endswith(".pdf")
