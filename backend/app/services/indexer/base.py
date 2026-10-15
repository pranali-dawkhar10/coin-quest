from abc import ABC, abstractmethod
from typing import Dict, List


class BaseChainIndexer(ABC):
    """Abstract base interface for chain-specific indexers."""

    @abstractmethod
    async def get_outgoing_transactions(self, address: str) -> List[Dict]:
        """Fetch normalized outgoing transactions for a given wallet address."""
        pass