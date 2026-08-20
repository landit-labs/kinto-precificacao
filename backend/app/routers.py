"""Rotas da API (finas — apenas orquestram a camada de serviço).

Prefixo `/api`, conforme contrato acordado com o frontend do painel
analítico da Fase 6 (Alternativa A).
"""

from typing import Optional

from fastapi import APIRouter, Path, Query

from app import services
from app.models import (
    CanalFiltro,
    ClasseFiltro,
    Filtros,
    HistoricoVeiculo,
    ListaInventario,
    VeiculoDetalhe,
)

router = APIRouter(prefix="/api", tags=["inventario"])


@router.get("/inventario", response_model=ListaInventario,
            summary="Visão consolidada do inventário (RF-F6-A-01/02/03)")
def listar_inventario(
    placa: Optional[str] = Query(None, max_length=7,
                                 description="Busca por placa, aceita parcial (RF-F6-A-02)"),
    modelo: Optional[str] = Query(None, description="Filtro por modelo (RF-F6-A-03)"),
    versao: Optional[str] = Query(None, description="Filtro por versão (RF-F6-A-03)"),
    ano: Optional[int] = Query(None, ge=1990, le=2030,
                               description="Filtro por ano-modelo (RF-F6-A-03)"),
    classe: Optional[ClasseFiltro] = Query(
        None, description="A–E ou NAO_AVALIADO (avaria nula) — RF-F6-A-03"),
    canal: Optional[CanalFiltro] = Query(
        None, description="Retail ou Wholesale — RF-F6-A-03"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> dict:
    return services.listar_inventario(
        placa=placa, modelo=modelo, versao=versao, ano=ano,
        classe=classe, canal=canal, page=page, page_size=page_size,
    )


@router.get("/inventario/{placa}", response_model=VeiculoDetalhe,
            summary="Detalhe do veículo com resultado completo do modelo (RF-F5-RS-01..14)")
def obter_detalhe(
    placa: str = Path(min_length=7, max_length=7,
                      description="Placa Mercosul completa, ex.: BRA2E19"),
) -> dict:
    return services.obter_detalhe(placa)


@router.get("/inventario/{placa}/historico", response_model=HistoricoVeiculo,
            summary="Histórico de preços e atualizações do veículo (RF-F6-A-11)")
def obter_historico(
    placa: str = Path(min_length=7, max_length=7),
) -> dict:
    return services.obter_historico(placa)


@router.get("/filtros", response_model=Filtros,
            summary="Valores distintos para popular os filtros (apoio ao RF-F6-A-03)")
def obter_filtros() -> dict:
    return services.obter_filtros()
