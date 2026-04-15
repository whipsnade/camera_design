import json
from pathlib import Path

from app.services.dwg_importer import import_dwg_file, normalize_dwg_payload


FIXTURES_DIR = Path(__file__).parent / "fixtures"


def load_fixture_json(name: str) -> dict:
    return json.loads((FIXTURES_DIR / name).read_text(encoding="utf-8"))


def test_normalize_dwg_payload_extracts_segments_and_bounds():
    result = normalize_dwg_payload(load_fixture_json("dwgread_simple_room.json"))

    assert result.units_per_meter == 1000.0
    assert result.unit_source == "header:insunits=4"
    assert result.viewport.width > 0
    assert result.viewport.height > 0
    assert len(result.walls) >= 4
    assert len(result.doors) >= 1
    assert any(warning.id.startswith("unsupported-entity-") for warning in result.warnings)
    assert any(segment.layer == "A-DOOR" for segment in result.doors)


def test_import_dwg_file_smoke(monkeypatch):
    dwg_path = FIXTURES_DIR / "simple_room.dwg"

    class FakeEntity:
        def __init__(self, dxftype: str, handle: int, dxf: dict):
            self.dxftype = dxftype
            self.handle = handle
            self.dxf = dxf

    class FakeLayout:
        def __init__(self, name: str, entities: list[FakeEntity]):
            self.name = name
            self._entities = entities

        def query(self, types=None, include_styles=True):
            if types is None:
                return iter(self._entities)

            if isinstance(types, str):
                wanted = {item.upper() for item in types.split()}
            else:
                wanted = {str(item).upper() for item in types}

            return (entity for entity in self._entities if entity.dxftype in wanted)

        def __iter__(self):
            return iter(self._entities)

    class FakeBlocks:
        def __init__(self, layouts: list[FakeLayout]):
            self._layouts = {layout.name: layout for layout in layouts}

        def __iter__(self):
            return iter(self._layouts.values())

        def get(self, name: str):
            return self._layouts.get(name)

    class FakeDocument:
        def __init__(self):
            self._modelspace = FakeLayout(
                "MODELSPACE",
                [
                    FakeEntity("LINE", 10, {"layer": "A-WALL", "start": (0.0, 0.0, 0.0), "end": (4000.0, 0.0, 0.0)}),
                    FakeEntity("INSERT", 20, {"layer": "A-DOOR", "name": "DOOR_SWING", "insert": (1600.0, 0.0, 0.0)}),
                    FakeEntity("TEXT", 30, {"layer": "A-NOTE", "insert": (100.0, 100.0, 0.0)}),
                ],
            )
            self.blocks = FakeBlocks(
                [
                    FakeLayout(
                        "DOOR_SWING",
                        [
                            FakeEntity("LINE", 40, {"layer": "A-DOOR", "start": (0.0, 0.0, 0.0), "end": (900.0, 0.0, 0.0)})
                        ],
                    )
                ]
            )

        def modelspace(self):
            return self._modelspace

    monkeypatch.setattr("app.services.dwg_importer.ezdwg.read", lambda _path: FakeDocument())

    result = import_dwg_file(dwg_path)

    assert result.viewport.width > 0
    assert result.walls
    assert result.doors
