from fastapi import FastAPI

from app.api.health import router as health_router
from app.api.projects import router as projects_router

app = FastAPI()
app.include_router(health_router, prefix="/api")
app.include_router(projects_router, prefix="/api")
