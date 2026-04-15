from __future__ import annotations

from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.models.cad import CadImportResult
from app.services.dwg_importer import DwgImportError, import_dwg_file


router = APIRouter(prefix="/dwg", tags=["dwg"])


@router.post("/import", response_model=CadImportResult)
async def import_dwg_route(file: UploadFile = File(...)) -> CadImportResult:
    suffix = Path(file.filename or "upload.dwg").suffix or ".dwg"
    temp_path: Path | None = None

    try:
        with NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(await file.read())
            temp_path = Path(temp_file.name)

        return import_dwg_file(temp_path)
    except DwgImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)
