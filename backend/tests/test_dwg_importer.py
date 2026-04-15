import json
import shutil
import subprocess
from pathlib import Path

import pytest

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
    if shutil.which("dwgread") is None:
        pytest.skip("dwgread is not installed")

    payload = load_fixture_json("dwgread_simple_room.json")
    dwg_path = FIXTURES_DIR / "simple_room.dwg"

    class FakeCompletedProcess:
        returncode = 0
        stdout = json.dumps(payload)
        stderr = ""

    def fake_run(*args, **kwargs):
        return FakeCompletedProcess()

    monkeypatch.setattr(subprocess, "run", fake_run)

    result = import_dwg_file(dwg_path)

    assert result.viewport.width > 0
    assert result.walls
    assert result.doors
