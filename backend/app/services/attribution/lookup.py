import json
import logging
from typing import Dict, Optional
from app.schemas.vasp import ConfidenceLevel, VaspCategory, VaspInfo

logger = logging.getLogger(__name__)


class DirectVaspLookup:
    """Matches wallet addresses against known exchange deposit/hot wallet databases."""

    def __init__(self, seed_file_path: Optional[str] = None):
        # In-memory label map: key -> (address.lower(), chain)
        self._label_db: Dict[str, VaspInfo] = {}
        self._load_seed_labels(seed_file_path)

    def _load_seed_labels(self, seed_file_path: Optional[str]):
        """Populates seed address dataset for major exchanges (Binance, Bybit, KuCoin, WazirX, etc.)."""
        # Default fallback dataset for instant hackathon execution
        mock_seed_data = [
            {
                "address": "0x_suspect_layer_1a_cex_deposit",
                "chain": "TRON",
                "vasp_id": "VASP_BINANCE_01",
                "name": "Binance Hot Wallet",
                "category": VaspCategory.CEX,
                "jurisdiction": "Cayman Islands / Global",
                "compliance_email": "compliance@binance.com",
            },
            {
                "address": "T_suspect_wallet_9988_layer_1a_cex_deposit",
                "chain": "TRON",
                "vasp_id": "VASP_BYBIT_01",
                "name": "Bybit Deposit Wallet",
                "category": VaspCategory.CEX,
                "jurisdiction": "Dubai, UAE",
                "compliance_email": "cdd@bybit.com",
            },
        ]

        for item in mock_seed_data:
            key = f"{item['chain'].upper()}:{item['address'].lower()}"
            self._label_db[key] = VaspInfo(
                vasp_id=item["vasp_id"],
                name=item["name"],
                category=item["category"],
                jurisdiction=item["jurisdiction"],
                compliance_email=item.get("compliance_email"),
            )

    def lookup(self, address: str, chain: str) -> Optional[VaspInfo]:
        """Performs exact lookup against labeled wallet database."""
        key = f"{chain.upper()}:{address.lower()}"
        return self._label_db.get(key)