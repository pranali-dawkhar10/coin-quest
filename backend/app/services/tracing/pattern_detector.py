from typing import List
from app.schemas.trace import TransactionEdge


class ObfuscationPatternDetector:
    """Evaluates transaction structures to detect money laundering typologies."""

    @staticmethod
    def is_peel_chain(outgoing_txs: List[TransactionEdge]) -> bool:
        """
        Detects peel chains: One large transfer (>80% value) moving down the chain
        and one small change transfer staying behind.
        """
        if len(outgoing_txs) != 2:
            return False

        total_val = sum(t.amount for t in outgoing_txs)
        if total_val == 0:
            return False

        max_val = max(t.amount for t in outgoing_txs)
        ratio = max_val / total_val
        return ratio >= 0.80

    @staticmethod
    def is_fan_out(outgoing_txs: List[TransactionEdge], threshold: int = 5) -> bool:
        """Detects fan-out behavior: Splitting funds across many secondary wallets."""
        return len(outgoing_txs) >= threshold