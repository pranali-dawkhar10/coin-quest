from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ============================================================
# COINQUEST BACKEND - MAIN APPLICATION
# ============================================================

# Existing transaction tracing and VASP routes
from app.api.v1.endpoints import trace, vasp

# Real Ethereum blockchain tracing
from ethereum_live import router as ethereum_router

# PDF investigation report generation
from report_api import router as report_router

# SHA-256 PDF integrity validator
from validator_api import router as validator_router

# Investigation case management
from cases_api import router as cases_router


# ============================================================
# FASTAPI APPLICATION
# ============================================================

app = FastAPI(
    title="CoinQuest - Crypto Fraud Attribution API",
    description=(
        "Blockchain transaction tracing, wallet analysis, "
        "investigation reports, VASP directory and "
        "cryptographic report integrity verification."
    ),
    version="2.3.0",
)


# ============================================================
# CORS CONFIGURATION
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# TRANSACTION GRAPH ROUTES
# ============================================================

app.include_router(
    trace.router,
    prefix="/api/v1/trace",
    tags=["Transaction Graph"],
)


# ============================================================
# LIVE ETHEREUM TRACING ROUTES
# ============================================================

app.include_router(
    ethereum_router,
    prefix="/api/v1/trace",
    tags=["Live Ethereum Tracing"],
)


# ============================================================
# VASP DIRECTORY ROUTES
# ============================================================

app.include_router(
    vasp.router,
    prefix="/api/v1/vasp",
    tags=["VASP Directory"],
)


# ============================================================
# INVESTIGATION PDF REPORT ROUTES
# ============================================================

app.include_router(
    report_router,
    prefix="/api/v1/reports",
    tags=["Investigation Reports"],
)


# ============================================================
# REPORT INTEGRITY VALIDATOR ROUTES
# ============================================================

app.include_router(
    validator_router,
    prefix="/api/v1/validator",
    tags=["Report Integrity Validator"],
)


# ============================================================
# INVESTIGATION CASE MANAGEMENT ROUTES
# ============================================================

app.include_router(
    cases_router,
    prefix="/api/v1/cases",
    tags=["Investigation Case Management"],
)


# ============================================================
# HOME ENDPOINT
# ============================================================

@app.get("/")
async def home():
    return {
        "status": "online",
        "project": "CoinQuest",
        "version": "2.3.0",
        "message": "CoinQuest backend is running",
        "features": {
            "transaction_graph": True,
            "ethereum_live_tracing": True,
            "vasp_directory": True,
            "pdf_report_generation": True,
            "report_integrity_validator": True,
        },
        "endpoints": {
            "docs": "/docs",
            "health": "/health",
            "validator_health": "/api/v1/validator/health",
            "validator_verify": "/api/v1/validator/verify",
        },
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "CoinQuest Backend",
        "version": "2.3.0",
    }


# ============================================================
# SHOW REGISTERED ROUTES ON STARTUP
# ============================================================

@app.on_event("startup")
async def show_registered_routes():
    print("\n==========================================")
    print("       COINQUEST BACKEND STARTED")
    print("==========================================")

    for route in app.routes:
        methods = getattr(route, "methods", None)
        path = getattr(route, "path", None)

        if methods and path:
            print(f"{', '.join(sorted(methods))}  {path}")

    print("==========================================")
    print("REPORT VALIDATOR ROUTES REGISTERED")
    print("==========================================\n")