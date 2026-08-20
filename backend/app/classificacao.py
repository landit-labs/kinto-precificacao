"""Classificação comercial A–E e canal sugerido (RF-F5-RS-12 / RF-F5-RS-13).

Domínio puro (sem framework): função sequencial e parametrizável (RNF-04).
Regra crítica da spec: valor NULO de avaria NÃO é considerado zero — o
veículo fica sem classe ("não avaliado") e sem canal sugerido.
"""

from dataclasses import dataclass
from decimal import Decimal
from typing import Optional

from app.parametros import PARAMETROS_CLASSIFICACAO


@dataclass(frozen=True)
class ResultadoClassificacao:
    """Resultado da classificação comercial de um veículo."""

    classe: Optional[str]           # "A".."E" ou None (avaria não avaliada)
    classe_label: str               # "Classe A" .. "Classe E" | "Não avaliado"
    canal_sugerido: Optional[str]   # "Retail" | "Wholesale" | None
    regra_aplicada: str             # descrição da regra que capturou o veículo
    excecao_possivel: bool          # Classe C admite exceção comercial


def calcular_km_medio_anual(km: int, ano: int, ano_referencia: int) -> int:
    """KM médio anual do veículo; idade mínima de 1 ano para evitar divisão por zero."""
    idade = max(1, ano_referencia - ano)
    return round(km / idade)


def classificar(
    avaria_valor: Optional[Decimal],
    km_medio_anual: int,
    valor_fipe: Decimal,
    parametros: dict = PARAMETROS_CLASSIFICACAO,
) -> ResultadoClassificacao:
    """Aplica as regras A–E de forma SEQUENCIAL (spec Fase 5).

    A primeira regra satisfeita define a classe. Avaria nula interrompe a
    avaliação: retorna classe None ("não avaliado"), nunca classe A.
    """
    # Regra crítica: avaria nula não é zero (RF-F5-RS-11 / RF-F6-A-09).
    if avaria_valor is None:
        return ResultadoClassificacao(
            classe=None,
            classe_label="Não avaliado",
            canal_sugerido=None,
            regra_aplicada=(
                "Avaria não avaliada (valor nulo) — veículo sem classificação; "
                "avaria nula não é tratada como zero"
            ),
            excecao_possivel=False,
        )

    a = parametros["classe_a"]
    if avaria_valor <= a["avaria_max"] and km_medio_anual <= a["km_medio_anual_max"]:
        return ResultadoClassificacao(
            classe="A",
            classe_label="Classe A",
            canal_sugerido="Retail",
            regra_aplicada=(
                f"Classe A — avaria igual a R$ {a['avaria_max']:.0f} e "
                f"KM médio anual ≤ {a['km_medio_anual_max']:,} km".replace(",", ".")
            ),
            excecao_possivel=False,
        )

    b = parametros["classe_b"]
    if avaria_valor <= b["avaria_max"] and km_medio_anual <= b["km_medio_anual_max"]:
        return ResultadoClassificacao(
            classe="B",
            classe_label="Classe B",
            canal_sugerido="Retail",
            regra_aplicada=(
                f"Classe B — avaria ≤ R$ {b['avaria_max']:.0f} e "
                f"KM médio anual ≤ {b['km_medio_anual_max']:,} km".replace(",", ".")
            ),
            excecao_possivel=False,
        )

    c = parametros["classe_c"]
    if avaria_valor <= c["avaria_max"]:
        return ResultadoClassificacao(
            classe="C",
            classe_label="Classe C",
            canal_sugerido="Wholesale",
            regra_aplicada=(
                f"Classe C — avaria ≤ R$ {c['avaria_max']:.0f}, "
                "independentemente do KM"
            ),
            excecao_possivel=True,  # "Wholesale, com possibilidade de exceção"
        )

    d = parametros["classe_d"]
    limite_d = valor_fipe * d["avaria_max_percentual_fipe"]
    if avaria_valor <= limite_d:
        return ResultadoClassificacao(
            classe="D",
            classe_label="Classe D",
            canal_sugerido="Wholesale",
            regra_aplicada=(
                f"Classe D — avaria ≤ {d['avaria_max_percentual_fipe'] * 100:.0f}% "
                f"do valor FIPE (R$ {limite_d:.0f})"
            ),
            excecao_possivel=False,
        )

    return ResultadoClassificacao(
        classe="E",
        classe_label="Classe E",
        canal_sugerido="Wholesale",
        regra_aplicada="Classe E — demais casos (avaria acima de 40% do valor FIPE)",
        excecao_possivel=False,
    )
