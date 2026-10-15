
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TraceRequest(BaseModel):
    wallet_address: str
    chain: str = "ETHEREUM"
    max_hops: int = Field(default=3, ge=1, le=4)


class TraceResponse(BaseModel):
    status: str
    wallet_address: str
    chain: str
    max_hops: int
    total_nodes: int = 0
    total_edges: int = 0
    execution_time_ms: float = 0.0
    data: Optional[Dict[str, Any]] = None


class GraphFilterParams(BaseModel):
    wallet_address: str
    chain: str = "ETHEREUM"
    max_hops: int = Field(default=3, ge=1, le=4)
    start_timestamp: Optional[int] = None
    end_timestamp: Optional[int] = None
    tokens: Optional[List[str]] = None
    min_amount_usd: Optional[float] = 0.0


class GraphNodeInspectDetail(BaseModel):
    id: str
    address: str
    label: Optional[str] = None
    is_vasp: bool = False
    vasp_name: Optional[str] = None
    risk_score: int = 0
    total_inflow_usd: float = 0.0
    total_outflow_usd: float = 0.0
    token_balances: Dict[str, float] = Field(default_factory=dict)
    associated_case_id: Optional[str] = None


class VisEdge(BaseModel):
    from_address: str
    to_address: str
    amount: str
    amount_usd: Optional[float] = None
    token: str
    tx_hash: str
    timestamp: int
    block_number: int = 0
    token_contract: Optional[str] = None


class VisNode(BaseModel):
    id: str
    address: str
    label: str
    hop: int
    is_suspect: bool = False
    is_vasp: bool = False
    vasp_name: Optional[str] = None
    risk_score: int = 0


class FundFlowGraphResponse(BaseModel):
    nodes: List[VisNode]
    edges: List[VisEdge]
    token_breakdown: Dict[str, float] = Field(
        default_factory=dict
    )
    filtered_tx_count: int = 0
    source: str = "Etherscan V2"
    is_live: bool = True
    truncated: bool = True
    notice: str = ""
