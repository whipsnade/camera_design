import os
from pathlib import Path
from uuid import uuid4

from app.models.project import Project


def get_projects_data_dir() -> Path:
    configured_dir = os.getenv("CAMERA_PLAN_DATA_DIR")
    if configured_dir:
        return Path(configured_dir)
    return Path(__file__).resolve().parents[3] / "data" / "projects"


def save_project(project: Project) -> Project:
    data_dir = get_projects_data_dir()
    data_dir.mkdir(parents=True, exist_ok=True)

    persisted_project = project.model_copy(update={"id": project.id or uuid4().hex})
    project_path = data_dir / f"{persisted_project.id}.json"
    project_path.write_text(
        persisted_project.model_dump_json(indent=2),
        encoding="utf-8",
    )

    return persisted_project


def load_project(project_id: str) -> Project | None:
    project_path = get_projects_data_dir() / f"{project_id}.json"
    if not project_path.exists():
        return None
    return Project.model_validate_json(project_path.read_text(encoding="utf-8"))
