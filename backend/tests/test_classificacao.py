"""Testes unitários do domínio de classificação A–E (RF-F5-RS-12/13).

Cobre os casos-limite exigidos pela spec: avaria nula (nunca zero),
aplicação sequencial e limites exatos de cada classe.
"""

from decimal import Decimal

import pytest

from app.classificacao import calcular_km_medio_anual, classificar

FIPE = Decimal("100000")


def test_avaria_nula_nao_e_zero_e_nao_classifica():
    """Regra crítica: avaria nula → 'não avaliado', nunca classe A."""
    r = classificar(None, km_medio_anual=5_000, valor_fipe=FIPE)
    assert r.classe is None
    assert r.classe_label == "Não avaliado"
    assert r.canal_sugerido is None


def test_classe_a_avaria_zero_e_km_ate_10mil():
    r = classificar(Decimal("0"), 10_000, FIPE)
    assert r.classe == "A"
    assert r.canal_sugerido == "Retail"


def test_avaria_zero_com_km_alto_cai_para_b():
    """Sequencial: avaria 0 mas KM > 10 mil/ano não é A; cai na regra B."""
    r = classificar(Decimal("0"), 12_000, FIPE)
    assert r.classe == "B"
    assert r.canal_sugerido == "Retail"


def test_classe_b_limites():
    r = classificar(Decimal("4000"), 20_000, FIPE)
    assert r.classe == "B"


def test_classe_c_independe_do_km():
    r = classificar(Decimal("7000"), 50_000, FIPE)
    assert r.classe == "C"
    assert r.canal_sugerido == "Wholesale"
    assert r.excecao_possivel is True


def test_avaria_baixa_mas_km_acima_de_20mil_e_classe_c():
    """Sequencial: avaria ≤ 4 mil porém KM/ano > 20 mil → não é B, é C."""
    r = classificar(Decimal("3000"), 25_000, FIPE)
    assert r.classe == "C"


def test_classe_d_ate_40_por_cento_da_fipe():
    r = classificar(Decimal("40000"), 15_000, FIPE)  # exatamente 40%
    assert r.classe == "D"
    assert r.canal_sugerido == "Wholesale"


def test_classe_e_acima_de_40_por_cento_da_fipe():
    r = classificar(Decimal("40001"), 15_000, FIPE)
    assert r.classe == "E"
    assert r.canal_sugerido == "Wholesale"


@pytest.mark.parametrize(
    "km,ano,ano_ref,esperado",
    [(40_000, 2022, 2026, 10_000), (30_000, 2026, 2026, 30_000)],
)
def test_km_medio_anual(km, ano, ano_ref, esperado):
    assert calcular_km_medio_anual(km, ano, ano_ref) == esperado
