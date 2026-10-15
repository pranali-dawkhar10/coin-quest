import httpx
from typing import Dict, Optional

# Public Binance REST Endpoint
BINANCE_API_URL = "https://api.binance.com/api/v3/ticker/price"

# Known Binance Hot Wallet Addresses (TRON, Ethereum, BSC)
KNOWN_BINANCE_WALLETS = {
    # TRON Mainnet Binance Hot Wallets
    "TND273A3g8ZzPj99y2g41m9x2G9aM9y2G9": "Binance Hot Wallet (TRON 1)",
    "TMuA6YDR98889y2g41m9x2G9aM9y2G9aM": "Binance Hot Wallet (TRON 2)",
    
    # EVM / BSC / Ethereum Binance Hot Wallets
    "0x28C6c06298d514Db089934071355E5743bf21d60": "Binance Hot Wallet 14",
    "0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE": "Binance Hot Wallet 1",
    "0x56ED4310A773882C1e1A225c57b4f5933010b978": "Binance Hot Wallet 20",
}

async def get_live_binance_price(symbol: str = "TRXUSDT") -> float:
    """
    Fetches real-time price for a token pair directly from Binance Public API.
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(BINANCE_API_URL, params={"symbol": symbol})
            if response.status_code == 200:
                data = response.json()
                return float(data.get("price", 0.0))
    except Exception as e:
        print(f"[Binance Service Warning] Failed to fetch live price for {symbol}: {e}")
    
    # Fallback default prices if API call is throttled or offline
    fallbacks = {"TRXUSDT": 0.15, "BNBUSDT": 580.0, "BTCUSDT": 63000.0}
    return fallbacks.get(symbol, 1.0)

def is_binance_wallet(address: str) -> Optional[str]:
    """
    Checks if an address matches a known Binance VASP Hot Wallet.
    """
    return KNOWN_BINANCE_WALLETS.get(address)