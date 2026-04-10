from fastapi import APIRouter, HTTPException, status

from app.models.project import Project, ProjectCreate
from app.services.storage import load_project, save_project

router = APIRouter(prefix="/projects", tags=["projects"])


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
