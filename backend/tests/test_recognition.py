from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.services.recognition import RecognitionResult, recognize_plan


FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_recognition_extracts_scale_and_structure_with_confidence_items():
    result = recognize_plan(FIXTURES_DIR / "scale_floorplan.png")

    assert isinstance(result, RecognitionResult)
    assert result.scale is not None
    assert result.scale.source == "auto"
    assert result.scale.pixelsPerMeter == 40
    assert len(result.walls) >= 4
    assert len(result.doors) >= 1
    assert result.confidence_items


def test_recognition_api_returns_detected_segments_and_scale():
    client = TestClient(app)
    fixture_path = FIXTURES_DIR / "simple_floorplan.png"

    with fixture_path.open("rb") as image_file:
        response = client.post(
            "/api/recognition/plan",
            files={"file": ("simple_floorplan.png", image_file, "image/png")},
        )

    payload = response.json()

    assert response.status_code == 200
    assert payload["scale"] is None
    assert len(payload["walls"]) >= 4
    assert len(payload["doors"]) >= 1
    assert payload["confidence_items"]
