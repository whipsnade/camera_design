from fastapi import APIRouter

from app.models.layout import LayoutSolveRequest, LayoutSolveResponse
from app.services.layout_solver import solve_layout

router = APIRouter(prefix="/layout", tags=["layout"])


@router.post("/solve", response_model=LayoutSolveResponse)
def solve_layout_route(request: LayoutSolveRequest) -> LayoutSolveResponse:
    return solve_layout(request)
