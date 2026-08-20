"""Parâmetros de negócio, separados da lógica (RNF-04 — regras parametrizáveis).

Os valores abaixo são a referência inicial da spec (seção Fase 5, classificação
comercial A–E). Alterar as faixas aqui NÃO exige mudança na lógica de
`classificacao.py`.
"""

from decimal import Decimal

# Ano de referência para cálculo da idade / KM médio anual do veículo.
ANO_REFERENCIA: int = 2026

# ---------------------------------------------------------------------------
# Classificação comercial A–E (RF-F5-RS-12) — aplicada de forma SEQUENCIAL.
# Avaria NULA nunca é tratada como zero: veículo fica "não avaliado".
# ---------------------------------------------------------------------------
PARAMETROS_CLASSIFICACAO: dict = {
    # Classe A: avaria igual a zero e KM médio anual de até 10 mil → Retail
    "classe_a": {
        "avaria_max": Decimal("0"),
        "km_medio_anual_max": 10_000,
    },
    # Classe B: avaria de até R$ 4 mil e KM médio anual de até 20 mil → Retail
    "classe_b": {
        "avaria_max": Decimal("4000"),
        "km_medio_anual_max": 20_000,
    },
    # Classe C: avaria de até R$ 7 mil, independentemente do KM → Wholesale
    # (com possibilidade de exceção)
    "classe_c": {
        "avaria_max": Decimal("7000"),
    },
    # Classe D: avaria de até 40% do valor FIPE → Wholesale
    "classe_d": {
        "avaria_max_percentual_fipe": Decimal("0.40"),
    },
    # Classe E: demais casos → Wholesale
}

# ---------------------------------------------------------------------------
# Nível de confiança (RF-F5-RS-08 / RF-F5-RS-11 / RF-F6-A-08 / RF-F6-A-09)
# Score parte de `score_base` e sofre penalidades conforme a qualidade dos
# insumos; o nível (alto/médio/baixo) é derivado dos limites abaixo.
# ---------------------------------------------------------------------------
PARAMETROS_CONFIANCA: dict = {
    "score_base": 95,
    # Comparáveis de mercado
    "min_comparaveis": 5,
    "penalidade_poucos_comparaveis": 35,
    "comparaveis_moderados": 10,
    "penalidade_comparaveis_moderados": 10,
    # Atualidade da referência externa de mercado
    "max_dias_referencia": 30,
    "penalidade_referencia_desatualizada": 20,
    # Avaria não avaliada (nula) — RF-F5-RS-11
    "penalidade_avaria_nao_avaliada": 25,
    # Limites de nível
    "limite_alto": 80,   # score >= 80 → "alto"
    "limite_medio": 55,  # score >= 55 → "medio"; abaixo → "baixo"
}
