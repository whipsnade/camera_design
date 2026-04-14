from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.models.project import Project, ProjectCreate
from app.services.exporter import export_project
from app.services.storage import load_project, save_project

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectExportResponse(BaseModel):
    png_path: str
    pdf_path: str
    project_path: str


@router.post("", response_model=Project, status_code=status.HTTP_201_CREATED)
def create_project(project: ProjectCreate) -> Project:
    return save_project(project)


@router.get("/{project_id}", response_model=Project)
def get_project(project_id: str) -> Project:
    project = load_project(project_id)
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    return project


@router.post("/{project_id}/export", response_model=ProjectExportResponse)
async def export_project_bundle(
    project_id: str,
    metadata_json: str = Form(...),
    annotated_png: UploadFile | None = File(default=None),
) -> ProjectExportResponse:
    project = Project.model_validate_json(metadata_json)
    if project.id != project_id:
        project = project.model_copy(update={"id": project_id})

    png_bytes = await annotated_png.read() if annotated_png is not None else None
    artifacts = export_project(project, annotated_png_bytes=png_bytes)
    return ProjectExportResponse(
        png_path=str(artifacts.png_path),
        pdf_path=str(artifacts.pdf_path),
        project_path=str(artifacts.project_path),
    )
