from fastapi import APIRouter, Query
from app.schemas.vasp import AttributionResult
from app.services.attribution.attribution_service import VaspAttributionService

router = APIRouter()
attribution_service = VaspAttributionService()


@router.get("/attribute", response_model=AttributionResult)
async def attribute_wallet_address(
    address: str = Query(..., description="Target crypto wallet address"),
    chain: str = Query("TRON", description="Blockchain network (TRON, ETHEREUM, BITCOIN)"),
    in_degree: int = Query(1, description="Number of incoming transaction connections"),
    out_degree: int = Query(1, description="Number of outgoing transaction connections"),
    total_inflow: float = Query(0.0, description="Total funds received by wallet"),
    total_outflow: float = Query(0.0, description="Total funds transferred out"),
):
    """Identifies the underlying Exchange / VASP for a given destination address."""
    return attribution_service.attribute_address(
        address=address,
        chain=chain,
        in_degree=in_degree,
        out_degree=out_degree,
        total_inflow=total_inflow,
        total_outflow=total_outflow,
    )