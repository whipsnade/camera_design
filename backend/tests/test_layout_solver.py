from fastapi.testclient import TestClient

from app.main import app
from app.models.layout import (
    LayoutSolveRequest,
    Point,
    ScaleState,
    Segment,
)
from app.services.layout_solver import solve_layout


def build_request() -> LayoutSolveRequest:
    return LayoutSolveRequest(
        scale=ScaleState(pixelsPerMeter=30, source="manual"),
        coverage_distance_m=3,
        camera_modes=["directional", "panoramic"],
        walls=[
            Segment(
                id="wall-1",
                start=Point(x=60, y=0),
                end=Point(x=60, y=120),
            )
        ],
        doors=[
            Segment(
                id="door-1",
                start=Point(x=60, y=45),
                end=Point(x=60, y=75),
            )
        ],
        region_polygon=[
            Point(x=0, y=0),
            Point(x=120, y=0),
            Point(x=120, y=120),
            Point(x=0, y=120),
        ],
    )


def test_solver_routes_coverage_through_door_opening():
    response = solve_layout(build_request())

    assert response.recommended_camera_count >= 2
    assert response.coverage_ratio > 0.8
    assert any(camera.mode == "directional" for camera in response.cameras)
    assert any(camera.mode == "panoramic" for camera in response.cameras)
    assert any(
        any(point.x > 60 for point in camera.coverage_polygon)
        for camera in response.cameras
        if camera.position.x < 60
    )
    assert all(point.x <= 60 for point in response.blind_spots)


def test_layout_api_returns_solver_payload():
    client = TestClient(app)

    response = client.post("/api/layout/solve", json=build_request().model_dump(mode="json"))
    payload = response.json()

    assert response.status_code == 200
    assert payload["recommended_camera_count"] >= 2
    assert payload["coverage_ratio"] > 0.8
    assert len(payload["cameras"]) == payload["recommended_camera_count"]
