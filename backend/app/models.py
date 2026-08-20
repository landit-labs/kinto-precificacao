"""Schemas Pydantic de saída da API (contrato consumido pelo frontend-react).

Valores monetários são calculados internamente com Decimal e expostos como
número JSON (float) — a formatação pt-BR é responsabilidade do frontend.
"""

from datetime import date
from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums de filtro (validação na borda — valores inválidos geram erro 400)
# ---------------------------------------------------------------------------
class ClasseFiltro(str, Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"
    E = "E"
    NAO_AVALIADO = "NAO_AVALIADO"


class CanalFiltro(str, Enum):
    RETAIL = "Retail"
    WHOLESALE = "Wholesale"


# ---------------------------------------------------------------------------
# Blocos reutilizáveis
# ---------------------------------------------------------------------------
class Faixa(BaseModel):
    """Faixa de preço (RF-F5-RS-04 / RF-F5-RS-05)."""

    minimo: float
    maximo: float


class Percentis(BaseModel):
    """Percentis de preço (RF-F5-RS-06)."""

    p10: float
    p25: float
    p50: float
    p75: float
    p90: float


class Confianca(BaseModel):
    """Nível de confiança da recomendação (RF-F5-RS-08)."""

    nivel: Literal["alto", "medio", "baixo"]
    score: int = Field(ge=0, le=100)


class Classificacao(BaseModel):
    """Classificação comercial e canal (RF-F5-RS-12 / RF-F5-RS-13)."""

    classe: Optional[Literal["A", "B", "C", "D", "E"]]
    classe_label: str
    canal_sugerido: Optional[Literal["Retail", "Wholesale"]]
    regra_aplicada: str
    excecao_possivel: bool


class AlertaQualidadeDados(BaseModel):
    """Alertas de ausência ou baixa qualidade dos dados (RF-F6-A-09)."""

    ativo: bool
    motivos: list[str]


class Matching(BaseModel):
    """Modelo e versão utilizados no matching (RF-F5-RS-10)."""

    modelo: str
    versao: str
    nivel: int = Field(ge=1, le=7)
    regra: str


class FatorExplicacao(BaseModel):
    """Explicação dos principais fatores da recomendação (RF-F5-RS-14)."""

    fator: str
    impacto: Literal["positivo", "negativo", "neutro"]
    descricao: str


class Comparavel(BaseModel):
    """Comparável de mercado (RF-F6-A-07)."""

    fonte: str
    modelo_anuncio: str
    versao_anuncio: str
    ano: int
    km: int
    preco_anunciado: float
    data_anuncio: date
    nivel_matching: int = Field(ge=1, le=7)
    regra_matching: str


# ---------------------------------------------------------------------------
# Inventário — visão consolidada (RF-F6-A-01/02/03)
# ---------------------------------------------------------------------------
class VeiculoResumo(BaseModel):
    placa: str
    marca: str
    modelo: str
    versao: str
    ano: int
    km: int
    km_medio_anual: int
    classe: Optional[Literal["A", "B", "C", "D", "E"]]
    classe_label: str
    canal_sugerido: Optional[Literal["Retail", "Wholesale"]]
    preco_recomendado: float
    confianca: Confianca
    alerta_qualidade_dados: bool


class ListaInventario(BaseModel):
    """Envelope de listagem (padrão api-land)."""

    items: list[VeiculoResumo]
    total: int
    page: int
    page_size: int


# ---------------------------------------------------------------------------
# Detalhe do veículo (RF-F5-RS-01 a RS-14 + RF-F6-A-04..09)
# ---------------------------------------------------------------------------
class DadosVeiculo(BaseModel):
    placa: str
    marca: str
    modelo: str
    versao: str
    ano: int
    km: int
    km_medio_anual: int
    cor: str
    combustivel: str
    avaria_valor: Optional[float]  # None = avaria não avaliada (nunca zero)
    valor_fipe: float
    data_entrada_estoque: date


class Precificacao(BaseModel):
    preco_interno_estimado: float          # RF-F5-RS-01
    referencia_externa_mercado: float      # RF-F5-RS-02
    preco_recomendado: float               # RF-F5-RS-03
    faixa_operacional: Faixa               # RF-F5-RS-04
    faixa_conservadora: Faixa              # RF-F5-RS-05
    percentis: Percentis                   # RF-F5-RS-06
    quantidade_comparaveis: int            # RF-F5-RS-07
    confianca: Confianca                   # RF-F5-RS-08
    data_referencia_mercado: date          # RF-F5-RS-09
    matching: Matching                     # RF-F5-RS-10
    motivos_baixa_confianca: list[str]     # RF-F5-RS-11
    fatores_explicacao: list[FatorExplicacao]  # RF-F5-RS-14


class VeiculoDetalhe(BaseModel):
    veiculo: DadosVeiculo
    precificacao: Precificacao
    classificacao: Classificacao           # RF-F5-RS-12 / RS-13
    alerta_qualidade_dados: AlertaQualidadeDados  # RF-F6-A-09
    comparaveis: list[Comparavel]          # RF-F6-A-07


# ---------------------------------------------------------------------------
# Histórico de preços e atualizações (RF-F6-A-11)
# ---------------------------------------------------------------------------
class EventoHistorico(BaseModel):
    data: date
    evento: str
    preco_recomendado: float
    faixa_operacional: Faixa
    faixa_conservadora: Faixa
    confianca_nivel: Literal["alto", "medio", "baixo"]


class HistoricoVeiculo(BaseModel):
    placa: str
    eventos: list[EventoHistorico]  # ordenado da data mais antiga para a mais recente


# ---------------------------------------------------------------------------
# Filtros (apoio ao RF-F6-A-03)
# ---------------------------------------------------------------------------
class OpcaoClasse(BaseModel):
    valor: str   # "A".."E" | "NAO_AVALIADO" — usar como query param `classe`
    label: str   # "Classe A" .. | "Não avaliado"


class Filtros(BaseModel):
    modelos: list[str]
    versoes: list[str]
    anos: list[int]
    classes: list[OpcaoClasse]
    canais: list[str]
