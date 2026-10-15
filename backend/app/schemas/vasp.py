from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class ConfidenceLevel(str, Enum):
    HIGH = "HIGH"          # Direct database address label match
    MEDIUM = "MEDIUM"      # Strong heuristic cluster / sweep pattern match
    LOW = "LOW"            # Behavioral anomaly suggestive of VASP
    UNKNOWN = "UNKNOWN"    # Unidentified non-custodial wallet


class VaspCategory(str, Enum):
    CEX = "Centralized Exchange"
    DEX = "Decentralized Exchange"
    MIXER = "Mixer / Tumbler"
    BRIDGE = "Cross-Chain Bridge"
    MERCHANT = "Payment Processor"
    HIGH_RISK_EXCHANGE = "High-Risk / Non-KYC Exchange"


class VaspInfo(BaseModel):
    vasp_id: str
    name: str
    category: VaspCategory
    jurisdiction: str
    compliance_email: Optional[str] = None
    official_website: Optional[str] = None


class AttributionResult(BaseModel):
    wallet_address: str
    chain: str
    is_attributed: bool
    confidence: ConfidenceLevel
    confidence_score: float = Field(..., ge=0.0, le=100.0)
    matched_via: str  # e.g., "DIRECT_LABEL_MATCH", "SWEEP_HEURISTIC", "FAN_IN_CLUSTER"
    vasp: Optional[VaspInfo] = None
    reasoning: str