"""Aplicação FastAPI — backend MOCK da Plataforma de Precificação (SDP #5211).

- CORS liberado para o dev server do Vite (http://localhost:5173).
- Erros no padrão api-land: {"error": {"code", "message", "details"}}.
"""

from typing import Optional

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.routers import router
from app.services import ErroApi

app = FastAPI(
    title="Precificação de Seminovos — API Mock (Fase 6, Alternativa A)",
    description=(
        "Backend 100% mockado (sem banco, sem Snowflake) que serve o painel "
        "analítico do time de Precificação. Atende RF-F6-A-01 a RF-F6-A-11 e "
        "expõe os resultados do modelo (RF-F5-RS-01 a RS-14)."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


def _envelope_erro(status_code: int, code: str, message: str,
                   details: Optional[list] = None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message,
                           "details": details or []}},
    )


@app.exception_handler(ErroApi)
async def tratar_erro_api(_request: Request, exc: ErroApi) -> JSONResponse:
    """Erros de negócio (ex.: 404 VEICULO_NAO_ENCONTRADO)."""
    return _envelope_erro(exc.status_code, exc.code, exc.message, exc.details)


@app.exception_handler(RequestValidationError)
async def tratar_erro_validacao(_request: Request,
                                exc: RequestValidationError) -> JSONResponse:
    """Parâmetros inválidos na borda → 400 com detalhes por campo."""
    details = [
        {"field": ".".join(str(p) for p in erro.get("loc", []) if p != "query"),
         "message": erro.get("msg", "valor inválido")}
        for erro in exc.errors()
    ]
    return _envelope_erro(400, "PARAMETRO_INVALIDO",
                          "Parâmetros de entrada inválidos.", details)


@app.exception_handler(StarletteHTTPException)
async def tratar_http_exception(_request: Request,
                                exc: StarletteHTTPException) -> JSONResponse:
    """Padroniza 404 de rota inexistente e demais HTTPException no envelope."""
    codigo = "RECURSO_NAO_ENCONTRADO" if exc.status_code == 404 else "ERRO_HTTP"
    return _envelope_erro(exc.status_code, codigo, str(exc.detail))


@app.get("/health", include_in_schema=False)
def health() -> dict:
    return {"status": "ok"}
