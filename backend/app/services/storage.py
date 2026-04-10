import os
from pathlib import Path
from uuid import uuid4

from app.models.project import Project, ProjectCreate


def get_projects_data_dir() -> Path:
    configured_dir = os.getenv("CAMERA_PLAN_DATA_DIR")
    if configured_dir:
        return Path(configured_dir)
    return Path(__file__).resolve().parents[3] / "data" / "projects"


def get_project_file_path(project_id: str) -> Path:
    data_dir = get_projects_data_dir().resolve()
    data_dir.mkdir(parents=True, exist_ok=True)
    project_path = (data_dir / f"{project_id}.json").resolve()

    if data_dir not in project_path.parents:
        raise ValueError("Project path escapes data directory")

    return project_path


def save_project(project: ProjectCreate) -> Project:
    persisted_project = Project(id=uuid4().hex, **project.model_dump())
    project_path = get_project_file_path(persisted_project.id)

    project_path.write_text(
        persisted_project.model_dump_json(indent=2),
        encoding="utf-8",
    )

    return persisted_project


def load_project(project_id: str) -> Project | None:
    try:
        project_path = get_project_file_path(project_id)
    except ValueError:
        return None

    if not project_path.exists():
        return None
    return Project.model_validate_json(project_path.read_text(encoding="utf-8"))
