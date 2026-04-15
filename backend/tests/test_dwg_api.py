from fastapi.testclient import TestClient

from app.main import app
from app.models.cad import CadImportResult, CadPoint, CadSegment, CadViewport, CadWarning


def test_dwg_import_route_returns_normalized_geometry(monkeypatch):
    client = TestClient(app)

    expected_result = CadImportResult(
        units_per_meter=1000.0,
        unit_source="header:insunits=4",
        viewport=CadViewport(
            min_x=0.0,
            min_y=0.0,
            max_x=4000.0,
            max_y=3000.0,
            width=4000.0,
            height=3000.0,
        ),
        walls=[
            CadSegment(
                id="wall-1",
                kind="wall",
                source_type="LINE",
                layer="A-WALL",
                start=CadPoint(x=0.0, y=0.0),
                end=CadPoint(x=4000.0, y=0.0),
                source_path="modelspace[1]",
                source_handle="10",
            )
        ],
        doors=[
            CadSegment(
                id="door-1",
                kind="door",
                source_type="LINE",
                layer="A-DOOR",
                start=CadPoint(x=1600.0, y=0.0),
                end=CadPoint(x=2500.0, y=0.0),
                source_path="modelspace[5]>DOOR_SWING[1]",
                source_handle="20",
            )
        ],
        warnings=[
            CadWarning(
                id="unsupported-entity-1",
                message="暂不支持的实体类型 TEXT，已跳过。",
                severity="warning",
                source_path="modelspace[6]",
                source_type="TEXT",
            )
        ],
    )

    def fake_import_dwg_file(_path):
        return expected_result

    monkeypatch.setattr("app.api.dwg.import_dwg_file", fake_import_dwg_file)

    response = client.post(
        "/api/dwg/import",
        files={"file": ("simple_room.dwg", b"placeholder dwg", "application/acad")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["units_per_meter"] == 1000.0
    assert payload["unit_source"] == "header:insunits=4"
    assert payload["viewport"]["width"] == 4000.0
    assert payload["walls"][0]["layer"] == "A-WALL"
    assert payload["doors"][0]["layer"] == "A-DOOR"
    assert payload["warnings"][0]["id"] == "unsupported-entity-1"
