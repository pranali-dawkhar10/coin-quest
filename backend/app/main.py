
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# =====================================================
# EXISTING BACKEND ROUTES
# =====================================================

from app.api.v1.endpoints import trace, vasp

# =====================================================
# REAL ETHEREUM BLOCKCHAIN INTEGRATION
# =====================================================

from ethereum_live import router as ethereum_router

# =====================================================
# PDF INVESTIGATION REPORTS
# =====================================================

from report_api import router as report_router

# =====================================================
# REPORT INTEGRITY VALIDATOR
# =====================================================

from validator_api import router as validator_router


# =====================================================
# FASTAPI APPLICATION
# =====================================================

app = FastAPI(
    title="CoinQuest - Crypto Fraud Attribution API",
    description=(
        "Ethereum blockchain transaction tracing, "
        "interactive wallet analysis, "
        "investigation PDF generation, "
        "and SHA-256 report integrity verification."
    ),
    version="2.2.0",
)


# =====================================================
# CORS CONFIGURATION
# =====================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =====================================================
# DEMONSTRATION TRANSACTION GRAPH
# =====================================================

app.include_router(
    trace.router,
    prefix="/api/v1/trace",
    tags=["Demo Transaction Graph"],
)


# =====================================================
# REAL ETHEREUM MAINNET TRANSACTION GRAPH
# =====================================================

app.include_router(
    ethereum_router,
    prefix="/api/v1/trace",
    tags=["Live Ethereum Transactions"],
)


# =====================================================
# VASP DIRECTORY ENDPOINTS
# =====================================================

app.include_router(
    vasp.router,
    prefix="/api/v1/vasp",
    tags=["VASP Directory"],
)


# =====================================================
# PDF INVESTIGATION REPORT GENERATION
# =====================================================

app.include_router(
    report_router,
    prefix="/api/v1/reports",
    tags=["Investigation Reports"],
)


# =====================================================
# REPORT VALIDATOR
# =====================================================

app.include_router(
    validator_router,
    prefix="/api/v1/validator",
    tags=["Report Integrity Validator"],
)


# =====================================================
# HOME ENDPOINT
# =====================================================

@app.get("/")
async def home():
    return {
        "status": "online",
        "project": "CoinQuest",
        "version": "2.2.0",
        "features": {
            "demo_transaction_graph": True,
            "ethereum_live_tracing": True,
            "vasp_directory": True,
            "pdf_report_generation": True,
            "sha256_report_validation": True,
        },
        "documentation": "/docs",
    }


# =====================================================
# HEALTH CHECK
# =====================================================

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "message": "CoinQuest backend is running",
    }
