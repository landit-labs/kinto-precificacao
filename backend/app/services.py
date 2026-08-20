"""Camada de serviço — regras de consulta do inventário, fora dos routers.

Endpoints atendidos: RF-F6-A-01 (visão consolidada), RF-F6-A-02 (pesquisa por
placa), RF-F6-A-03 (filtros), RF-F6-A-11 (histórico) e detalhe com o resultado
completo do modelo (RF-F5-RS-01 a RS-14).
"""

from typing import Optional

from app.data import INVENTARIO
from app.models import CanalFiltro, ClasseFiltro


class ErroApi(Exception):
    """Erro de negócio no padrão api-land: {"error": {code, message, details}}."""

    def __init__(self, status_code: int, code: str, message: str,
                 details: Optional[list] = None):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or []


class VeiculoNaoEncontrado(ErroApi):
    def __init__(self, placa: str):
        super().__init__(
            status_code=404,
            code="VEICULO_NAO_ENCONTRADO",
            message=f"Veículo com placa {placa.upper()} não encontrado no inventário.",
        )


def _buscar_por_placa(placa: str) -> dict:
    placa_norm = placa.strip().upper()
    for veiculo in INVENTARIO:
        if veiculo["placa"] == placa_norm:
            return veiculo
    raise VeiculoNaoEncontrado(placa_norm)


def listar_inventario(
    placa: Optional[str] = None,
    modelo: Optional[str] = None,
    versao: Optional[str] = None,
    ano: Optional[int] = None,
    classe: Optional[ClasseFiltro] = None,
    canal: Optional[CanalFiltro] = None,
    page: int = 1,
    page_size: int = 20,
) -> dict:
    """Visão consolidada do inventário com pesquisa e filtros.

    - `placa`: busca parcial, case-insensitive (RF-F6-A-02);
    - demais filtros: igualdade case-insensitive (RF-F6-A-03);
    - `classe=NAO_AVALIADO` retorna os veículos com avaria nula (sem classe).
    """
    resultado = INVENTARIO

    if placa:
        termo = placa.strip().upper()
        resultado = [v for v in resultado if termo in v["placa"]]
    if modelo:
        resultado = [v for v in resultado if v["modelo"].lower() == modelo.strip().lower()]
    if versao:
        resultado = [v for v in resultado if v["versao"].lower() == versao.strip().lower()]
    if ano is not None:
        resultado = [v for v in resultado if v["ano"] == ano]
    if classe is not None:
        if classe == ClasseFiltro.NAO_AVALIADO:
            resultado = [v for v in resultado if v["classe"] is None]
        else:
            resultado = [v for v in resultado if v["classe"] == classe.value]
    if canal is not None:
        resultado = [v for v in resultado if v["canal_sugerido"] == canal.value]

    total = len(resultado)
    inicio = (page - 1) * page_size
    pagina = resultado[inicio:inicio + page_size]

    return dict(
        items=[_resumo(v) for v in pagina],
        total=total,
        page=page,
        page_size=page_size,
    )


def _resumo(v: dict) -> dict:
    """Projeção resumida para a listagem (RF-F6-A-01/04/08/09)."""
    return dict(
        placa=v["placa"],
        marca=v["marca"],
        modelo=v["modelo"],
        versao=v["versao"],
        ano=v["ano"],
        km=v["km"],
        km_medio_anual=v["km_medio_anual"],
        classe=v["classe"],
        classe_label=v["classe_label"],
        canal_sugerido=v["canal_sugerido"],
        preco_recomendado=v["preco_recomendado"],
        confianca=v["confianca"],
        alerta_qualidade_dados=v["alerta_qualidade_dados"]["ativo"],
    )


def obter_detalhe(placa: str) -> dict:
    """Detalhe do veículo com o resultado completo do modelo (RF-F5-RS-01..14,
    RF-F6-A-04..09)."""
    v = _buscar_por_placa(placa)
    return dict(
        veiculo=dict(
            placa=v["placa"], marca=v["marca"], modelo=v["modelo"],
            versao=v["versao"], ano=v["ano"], km=v["km"],
            km_medio_anual=v["km_medio_anual"], cor=v["cor"],
            combustivel=v["combustivel"], avaria_valor=v["avaria_valor"],
            valor_fipe=v["valor_fipe"],
            data_entrada_estoque=v["data_entrada_estoque"],
        ),
        precificacao=dict(
            preco_interno_estimado=v["preco_interno_estimado"],
            referencia_externa_mercado=v["referencia_externa_mercado"],
            preco_recomendado=v["preco_recomendado"],
            faixa_operacional=v["faixa_operacional"],
            faixa_conservadora=v["faixa_conservadora"],
            percentis=v["percentis"],
            quantidade_comparaveis=v["quantidade_comparaveis"],
            confianca=v["confianca"],
            data_referencia_mercado=v["data_referencia_mercado"],
            matching=v["matching"],
            motivos_baixa_confianca=v["motivos_baixa_confianca"],
            fatores_explicacao=v["fatores_explicacao"],
        ),
        classificacao=dict(
            classe=v["classe"],
            classe_label=v["classe_label"],
            canal_sugerido=v["canal_sugerido"],
            regra_aplicada=v["regra_aplicada"],
            excecao_possivel=v["excecao_possivel"],
        ),
        alerta_qualidade_dados=v["alerta_qualidade_dados"],
        comparaveis=v["comparaveis"],
    )


def obter_historico(placa: str) -> dict:
    """Histórico de preços e atualizações do veículo (RF-F6-A-11)."""
    v = _buscar_por_placa(placa)
    return dict(placa=v["placa"], eventos=v["historico"])


def obter_filtros() -> dict:
    """Valores distintos para popular os filtros do frontend (RF-F6-A-03)."""
    classes_presentes = sorted({v["classe"] for v in INVENTARIO if v["classe"]})
    classes = [dict(valor=c, label=f"Classe {c}") for c in classes_presentes]
    if any(v["classe"] is None for v in INVENTARIO):
        classes.append(dict(valor="NAO_AVALIADO", label="Não avaliado"))
    return dict(
        modelos=sorted({v["modelo"] for v in INVENTARIO}),
        versoes=sorted({v["versao"] for v in INVENTARIO}),
        anos=sorted({v["ano"] for v in INVENTARIO}),
        classes=classes,
        canais=sorted({v["canal_sugerido"] for v in INVENTARIO if v["canal_sugerido"]}),
    )
