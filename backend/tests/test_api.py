"""Testes de integração dos endpoints (RF-F6-A-01/02/03/07/08/09/11)."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# GET /api/inventario — visão consolidada (RF-F6-A-01)
# ---------------------------------------------------------------------------
def test_inventario_lista_todos():
    resp = client.get("/api/inventario")
    assert resp.status_code == 200
    corpo = resp.json()
    assert corpo["total"] == 20
    assert len(corpo["items"]) == 20
    item = corpo["items"][0]
    for campo in ("placa", "modelo", "versao", "ano", "km", "classe",
                  "canal_sugerido", "preco_recomendado", "confianca",
                  "alerta_qualidade_dados"):
        assert campo in item


def test_pesquisa_por_placa_parcial():
    """RF-F6-A-02: busca parcial e case-insensitive."""
    resp = client.get("/api/inventario", params={"placa": "bra"})
    assert resp.status_code == 200
    corpo = resp.json()
    assert corpo["total"] == 1
    assert corpo["items"][0]["placa"] == "BRA2E19"


def test_filtro_por_classe_e_canal():
    """RF-F6-A-03."""
    resp = client.get("/api/inventario", params={"classe": "A"})
    assert resp.status_code == 200
    assert all(v["classe"] == "A" for v in resp.json()["items"])
    assert resp.json()["total"] >= 1

    resp = client.get("/api/inventario", params={"canal": "Wholesale"})
    assert all(v["canal_sugerido"] == "Wholesale" for v in resp.json()["items"])


def test_filtro_nao_avaliado_traz_veiculo_com_avaria_nula():
    """Avaria nula → 'não avaliado' (nunca classe A) + alerta de qualidade."""
    resp = client.get("/api/inventario", params={"classe": "NAO_AVALIADO"})
    corpo = resp.json()
    assert corpo["total"] == 1
    veiculo = corpo["items"][0]
    assert veiculo["placa"] == "XLM8E67"
    assert veiculo["classe"] is None
    assert veiculo["classe_label"] == "Não avaliado"
    assert veiculo["canal_sugerido"] is None
    assert veiculo["alerta_qualidade_dados"] is True
    assert veiculo["confianca"]["nivel"] == "baixo"


def test_todas_as_classes_estao_representadas():
    resp = client.get("/api/inventario")
    classes = {v["classe"] for v in resp.json()["items"]}
    assert classes == {"A", "B", "C", "D", "E", None}


def test_filtro_classe_invalida_retorna_400_padrao_api_land():
    resp = client.get("/api/inventario", params={"classe": "Z"})
    assert resp.status_code == 400
    erro = resp.json()["error"]
    assert erro["code"] == "PARAMETRO_INVALIDO"
    assert erro["details"]


# ---------------------------------------------------------------------------
# GET /api/inventario/{placa} — detalhe (RF-F5-RS-01..14)
# ---------------------------------------------------------------------------
def test_detalhe_completo_e_coerente():
    resp = client.get("/api/inventario/BRA2E19")
    assert resp.status_code == 200
    corpo = resp.json()
    prec = corpo["precificacao"]

    # Percentis ordenados (RF-F5-RS-06)
    p = prec["percentis"]
    assert p["p10"] <= p["p25"] <= p["p50"] <= p["p75"] <= p["p90"]

    # Conservadora contida na operacional; recomendado dentro das duas
    op, cons = prec["faixa_operacional"], prec["faixa_conservadora"]
    assert op["minimo"] <= cons["minimo"] <= cons["maximo"] <= op["maximo"]
    assert cons["minimo"] <= prec["preco_recomendado"] <= cons["maximo"]

    # Comparáveis (RF-F6-A-07 / RF-F5-RS-07)
    assert prec["quantidade_comparaveis"] == len(corpo["comparaveis"])
    comp = corpo["comparaveis"][0]
    for campo in ("fonte", "modelo_anuncio", "versao_anuncio", "ano", "km",
                  "preco_anunciado", "data_anuncio", "nivel_matching",
                  "regra_matching"):
        assert campo in comp

    # Classificação derivada dos atributos (Corolla, avaria 0, 9.500 km/ano)
    assert corpo["classificacao"]["classe"] == "A"
    assert corpo["classificacao"]["canal_sugerido"] == "Retail"
    assert corpo["veiculo"]["avaria_valor"] == 0


def test_detalhe_avaria_nula_tem_motivo_e_alerta():
    """RF-F5-RS-11 + RF-F6-A-09 para o veículo com avaria nula."""
    resp = client.get("/api/inventario/XLM8E67")
    corpo = resp.json()
    assert corpo["veiculo"]["avaria_valor"] is None
    assert corpo["classificacao"]["classe"] is None
    assert corpo["alerta_qualidade_dados"]["ativo"] is True
    motivos = " ".join(corpo["precificacao"]["motivos_baixa_confianca"])
    assert "nulo" in motivos or "não avaliada" in motivos


def test_detalhe_baixa_confianca_poucos_comparaveis():
    """RF-F6-A-08: SW4 Diamond tem 3 comparáveis e referência desatualizada."""
    resp = client.get("/api/inventario/VDF3B91")
    prec = resp.json()["precificacao"]
    assert prec["confianca"]["nivel"] == "baixo"
    assert prec["quantidade_comparaveis"] == 3
    assert len(prec["motivos_baixa_confianca"]) >= 2


def test_placa_inexistente_retorna_404_padrao_api_land():
    resp = client.get("/api/inventario/ZZZ9Z99")
    assert resp.status_code == 404
    erro = resp.json()["error"]
    assert erro["code"] == "VEICULO_NAO_ENCONTRADO"
    assert "ZZZ9Z99" in erro["message"]


# ---------------------------------------------------------------------------
# GET /api/inventario/{placa}/historico — RF-F6-A-11
# ---------------------------------------------------------------------------
def test_historico_ordenado_e_ultimo_evento_reflete_estado_atual():
    detalhe = client.get("/api/inventario/BRA2E19").json()
    resp = client.get("/api/inventario/BRA2E19/historico")
    assert resp.status_code == 200
    corpo = resp.json()
    eventos = corpo["eventos"]
    assert corpo["placa"] == "BRA2E19"
    assert len(eventos) >= 3
    datas = [e["data"] for e in eventos]
    assert datas == sorted(datas)
    ultimo = eventos[-1]
    assert ultimo["preco_recomendado"] == detalhe["precificacao"]["preco_recomendado"]
    assert "evento" in ultimo and ultimo["evento"]


def test_historico_placa_inexistente_404():
    resp = client.get("/api/inventario/ZZZ9Z99/historico")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# GET /api/filtros
# ---------------------------------------------------------------------------
def test_filtros_disponiveis():
    resp = client.get("/api/filtros")
    assert resp.status_code == 200
    corpo = resp.json()
    assert "Corolla" in corpo["modelos"]
    assert set(corpo["canais"]) == {"Retail", "Wholesale"}
    valores_classe = {c["valor"] for c in corpo["classes"]}
    assert valores_classe == {"A", "B", "C", "D", "E", "NAO_AVALIADO"}
    assert all(2020 <= ano <= 2024 for ano in corpo["anos"])
