"""Dados MOCKADOS do inventário (~20 seminovos) — sem banco, sem Snowflake.

A classe comercial e o canal NÃO são chumbados: são DERIVADOS dos atributos
brutos (avaria, km, ano, FIPE) pela função pura `classificacao.classificar`
(RF-F5-RS-12/13). O nível de confiança também é derivado da qualidade dos
insumos (comparáveis, atualidade da referência, avaria nula) — RF-F5-RS-08/11.

Coerências garantidas por construção:
- faixa conservadora contida na faixa operacional;
- percentis ordenados (p10 ≤ p25 ≤ p50 ≤ p75 ≤ p90);
- preço recomendado dentro das duas faixas (recomendado = p50);
- histórico imutável, com último evento igual ao estado atual do veículo.
"""

from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import Optional

from app.classificacao import calcular_km_medio_anual, classificar
from app.parametros import ANO_REFERENCIA, PARAMETROS_CONFIANCA

HOJE: date = date.today()

# Hierarquia de matching veículo↔anúncio (7 níveis; FIPE primeiro,
# similaridade textual apenas como fallback) — RF-F5-RS-10.
NIVEIS_MATCHING: dict[int, str] = {
    1: "Nível 1 — código FIPE idêntico",
    2: "Nível 2 — código FIPE equivalente (mesma versão)",
    3: "Nível 3 — modelo, versão e ano exatos",
    4: "Nível 4 — modelo e versão exatos, ano aproximado",
    5: "Nível 5 — modelo e ano exatos, versão aproximada",
    6: "Nível 6 — similaridade textual de modelo/versão",
    7: "Nível 7 — similaridade textual ampla (fallback)",
}

# Amplitude dos percentis em torno do p50, por nível de confiança (mock).
_SPREAD_POR_NIVEL: dict[str, Decimal] = {
    "alto": Decimal("0.04"),
    "medio": Decimal("0.07"),
    "baixo": Decimal("0.12"),
}

# Nível de matching predominante do veículo, por nível de confiança (mock).
_MATCHING_BASE_POR_NIVEL: dict[str, int] = {"alto": 1, "medio": 3, "baixo": 5}


# ---------------------------------------------------------------------------
# Base bruta: atributos "de origem" de cada veículo. Classe, canal, confiança,
# percentis, comparáveis e histórico são derivados abaixo.
# `avaria_valor=None` = avaria NÃO avaliada (regra crítica: não é zero).
# ---------------------------------------------------------------------------
_VEICULOS_BASE: list[dict] = [
    # Classe A esperada (avaria 0, ≤10 mil km/ano)
    dict(placa="BRA2E19", marca="Toyota", modelo="Corolla", versao="XEi 2.0 Flex Aut.",
         ano=2022, km=38_000, cor="Prata", combustivel="Flex",
         avaria_valor=Decimal("0"), valor_fipe=Decimal("125000"),
         preco_interno=Decimal("122000"), referencia_externa=Decimal("126500"),
         n_comparaveis=15, dias_referencia=4),
    dict(placa="FZC5D28", marca="Toyota", modelo="Corolla", versao="Altis Premium Hybrid",
         ano=2023, km=24_000, cor="Branco", combustivel="Híbrido",
         avaria_valor=Decimal("0"), valor_fipe=Decimal("158000"),
         preco_interno=Decimal("154000"), referencia_externa=Decimal("159500"),
         n_comparaveis=12, dias_referencia=6),
    # Classe B esperada
    dict(placa="GHT2B47", marca="Toyota", modelo="Corolla", versao="GLi 1.8 Flex",
         ano=2021, km=74_000, cor="Cinza", combustivel="Flex",
         avaria_valor=Decimal("1800"), valor_fipe=Decimal("108000"),
         preco_interno=Decimal("104500"), referencia_externa=Decimal("107000"),
         n_comparaveis=14, dias_referencia=8),
    dict(placa="KNT3E80", marca="Toyota", modelo="Corolla Cross", versao="XRE 2.0 Flex",
         ano=2022, km=62_000, cor="Prata", combustivel="Flex",
         avaria_valor=Decimal("2500"), valor_fipe=Decimal("142000"),
         preco_interno=Decimal("138000"), referencia_externa=Decimal("141000"),
         n_comparaveis=13, dias_referencia=5),
    # Classe A esperada (10.000 km/ano exatos — limite da regra)
    dict(placa="PXV9A12", marca="Toyota", modelo="Corolla Cross", versao="XRX Hybrid",
         ano=2023, km=30_000, cor="Preto", combustivel="Híbrido",
         avaria_valor=Decimal("0"), valor_fipe=Decimal("176000"),
         preco_interno=Decimal("171000"), referencia_externa=Decimal("175500"),
         n_comparaveis=11, dias_referencia=7),
    # Classe C esperada (avaria ≤ 4 mil, mas KM/ano > 20 mil → não é B)
    dict(placa="QRA7B65", marca="Toyota", modelo="Hilux", versao="SRX 4x4 Diesel Aut.",
         ano=2022, km=88_000, cor="Branco", combustivel="Diesel",
         avaria_valor=Decimal("3200"), valor_fipe=Decimal("262000"),
         preco_interno=Decimal("251000"), referencia_externa=Decimal("258000"),
         n_comparaveis=10, dias_referencia=9),
    dict(placa="RTX4C09", marca="Toyota", modelo="Hilux", versao="SRV 4x4 Diesel",
         ano=2021, km=118_000, cor="Prata", combustivel="Diesel",
         avaria_valor=Decimal("6500"), valor_fipe=Decimal("231000"),
         preco_interno=Decimal("219000"), referencia_externa=Decimal("226000"),
         n_comparaveis=9, dias_referencia=12),
    # Classe D esperada (avaria > 7 mil e ≤ 40% FIPE)
    dict(placa="SBK8D73", marca="Toyota", modelo="Hilux", versao="SR 4x2 Diesel",
         ano=2020, km=105_000, cor="Vermelho", combustivel="Diesel",
         avaria_valor=Decimal("30000"), valor_fipe=Decimal("196000"),
         preco_interno=Decimal("168000"), referencia_externa=Decimal("175000"),
         n_comparaveis=8, dias_referencia=10),
    # Classe B esperada (avaria 0, mas KM/ano > 10 mil → cai da A para a B)
    dict(placa="TMA1E56", marca="Toyota", modelo="Yaris", versao="XLS 1.5 Aut.",
         ano=2022, km=52_000, cor="Branco", combustivel="Flex",
         avaria_valor=Decimal("0"), valor_fipe=Decimal("96000"),
         preco_interno=Decimal("93000"), referencia_externa=Decimal("95500"),
         n_comparaveis=12, dias_referencia=3),
    dict(placa="UYS6A38", marca="Toyota", modelo="Yaris", versao="XL 1.5 Aut.",
         ano=2021, km=58_000, cor="Cinza", combustivel="Flex",
         avaria_valor=Decimal("900"), valor_fipe=Decimal("84000"),
         preco_interno=Decimal("81000"), referencia_externa=Decimal("83500"),
         n_comparaveis=11, dias_referencia=6),
    # Classe A esperada, MAS confiança baixa (3 comparáveis + referência velha)
    # → RF-F6-A-08/09
    dict(placa="VDF3B91", marca="Toyota", modelo="SW4", versao="SRX Diamond 7L Diesel",
         ano=2023, km=21_000, cor="Preto", combustivel="Diesel",
         avaria_valor=Decimal("0"), valor_fipe=Decimal("372000"),
         preco_interno=Decimal("362000"), referencia_externa=Decimal("368000"),
         n_comparaveis=3, dias_referencia=45),
    dict(placa="WKR5C24", marca="Toyota", modelo="SW4", versao="SRX 7L Diesel",
         ano=2021, km=96_000, cor="Prata", combustivel="Diesel",
         avaria_valor=Decimal("3800"), valor_fipe=Decimal("324000"),
         preco_interno=Decimal("312000"), referencia_externa=Decimal("319000"),
         n_comparaveis=7, dias_referencia=14),
    # AVARIA NULA (regra crítica): "não avaliado" — nunca classe A; dispara
    # alerta de qualidade de dados (RF-F6-A-09) e baixa confiança (RF-F5-RS-11)
    dict(placa="XLM8E67", marca="Toyota", modelo="RAV4", versao="SX Hybrid AWD",
         ano=2021, km=67_000, cor="Azul", combustivel="Híbrido",
         avaria_valor=None, valor_fipe=Decimal("222000"),
         preco_interno=Decimal("210000"), referencia_externa=Decimal("216000"),
         n_comparaveis=4, dias_referencia=20),
    # Classe E esperada (avaria > 40% do FIPE)
    dict(placa="YNP2A85", marca="Honda", modelo="Civic", versao="Touring 1.5 Turbo",
         ano=2020, km=89_000, cor="Cinza", combustivel="Gasolina",
         avaria_valor=Decimal("60000"), valor_fipe=Decimal("138000"),
         preco_interno=Decimal("112000"), referencia_externa=Decimal("118000"),
         n_comparaveis=9, dias_referencia=11),
    # Classe B esperada, confiança média (referência > 30 dias)
    dict(placa="ZQE7D13", marca="Jeep", modelo="Compass", versao="Longitude T270 Flex",
         ano=2022, km=47_000, cor="Branco", combustivel="Flex",
         avaria_valor=Decimal("3500"), valor_fipe=Decimal("132000"),
         preco_interno=Decimal("128000"), referencia_externa=Decimal("131000"),
         n_comparaveis=10, dias_referencia=35),
    dict(placa="BSV4E52", marca="Volkswagen", modelo="T-Cross", versao="Highline 1.4 TSI",
         ano=2023, km=33_000, cor="Prata", combustivel="Flex",
         avaria_valor=Decimal("1200"), valor_fipe=Decimal("133000"),
         preco_interno=Decimal("129500"), referencia_externa=Decimal("132500"),
         n_comparaveis=13, dias_referencia=4),
    # Classe C esperada, confiança média (poucos comparáveis + referência velha)
    dict(placa="CJH9B76", marca="Chevrolet", modelo="Onix", versao="Premier 1.0 Turbo",
         ano=2022, km=45_000, cor="Vermelho", combustivel="Flex",
         avaria_valor=Decimal("5000"), valor_fipe=Decimal("86000"),
         preco_interno=Decimal("82500"), referencia_externa=Decimal("85000"),
         n_comparaveis=8, dias_referencia=38),
    # Classe E esperada
    dict(placa="DKW6C31", marca="Hyundai", modelo="HB20S", versao="Platinum 1.0 TGDI",
         ano=2023, km=41_000, cor="Branco", combustivel="Flex",
         avaria_valor=Decimal("45000"), valor_fipe=Decimal("93000"),
         preco_interno=Decimal("72000"), referencia_externa=Decimal("76500"),
         n_comparaveis=6, dias_referencia=9),
    # Classe B esperada, confiança BAIXA (4 comparáveis + referência de 40 dias)
    dict(placa="EPL1A98", marca="Fiat", modelo="Toro", versao="Volcano 2.0 Diesel 4x4",
         ano=2022, km=76_000, cor="Cinza", combustivel="Diesel",
         avaria_valor=Decimal("2900"), valor_fipe=Decimal("145000"),
         preco_interno=Decimal("138500"), referencia_externa=Decimal("142000"),
         n_comparaveis=4, dias_referencia=40),
    # Classe D esperada
    dict(placa="FMN3D44", marca="Renault", modelo="Duster", versao="Iconic 1.6 CVT",
         ano=2021, km=83_000, cor="Laranja", combustivel="Flex",
         avaria_valor=Decimal("12000"), valor_fipe=Decimal("96000"),
         preco_interno=Decimal("84000"), referencia_externa=Decimal("88000"),
         n_comparaveis=8, dias_referencia=7),
]


def _arredondar_centena(valor: Decimal) -> Decimal:
    """Arredonda para a centena mais próxima (preços 'limpos' no mock)."""
    return (valor / 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP) * 100


def _avaliar_confianca(
    n_comparaveis: int, dias_referencia: int, avaria_valor: Optional[Decimal]
) -> tuple[int, str, list[str], list[str]]:
    """Deriva score/nível de confiança (RF-F5-RS-08), motivos de baixa
    confiança (RF-F5-RS-11) e motivos de alerta de qualidade (RF-F6-A-09).
    """
    p = PARAMETROS_CONFIANCA
    score = p["score_base"]
    motivos: list[str] = []
    alertas: list[str] = []

    if n_comparaveis < p["min_comparaveis"]:
        score -= p["penalidade_poucos_comparaveis"]
        motivos.append(
            f"Apenas {n_comparaveis} comparáveis de mercado encontrados "
            f"(mínimo recomendado: {p['min_comparaveis']})"
        )
        alertas.append("Poucos comparáveis de mercado disponíveis")
    elif n_comparaveis < p["comparaveis_moderados"]:
        score -= p["penalidade_comparaveis_moderados"]

    if dias_referencia > p["max_dias_referencia"]:
        score -= p["penalidade_referencia_desatualizada"]
        motivos.append(
            f"Referência de mercado desatualizada ({dias_referencia} dias; "
            f"limite: {p['max_dias_referencia']})"
        )
        alertas.append("Referência externa de mercado desatualizada")

    if avaria_valor is None:
        score -= p["penalidade_avaria_nao_avaliada"]
        motivos.append(
            "Avaria não avaliada (valor nulo) — veículo sem classificação "
            "comercial; avaria nula não é tratada como zero"
        )
        alertas.append("Avaria não informada na origem (valor nulo)")

    score = max(0, score)
    if score >= p["limite_alto"]:
        nivel = "alto"
    elif score >= p["limite_medio"]:
        nivel = "medio"
    else:
        nivel = "baixo"
    return score, nivel, motivos, alertas


def _gerar_fatores(base: dict, km_medio: int, n_comparaveis: int) -> list[dict]:
    """Explicação dos principais fatores da recomendação (RF-F5-RS-14)."""
    fatores: list[dict] = []

    if km_medio <= 10_000:
        fatores.append(dict(fator="Quilometragem", impacto="positivo",
                            descricao=f"KM médio anual de {km_medio:,} km, abaixo da média do segmento".replace(",", ".")))
    elif km_medio <= 18_000:
        fatores.append(dict(fator="Quilometragem", impacto="neutro",
                            descricao=f"KM médio anual de {km_medio:,} km, dentro da média do segmento".replace(",", ".")))
    else:
        fatores.append(dict(fator="Quilometragem", impacto="negativo",
                            descricao=f"KM médio anual de {km_medio:,} km, acima da média do segmento".replace(",", ".")))

    avaria = base["avaria_valor"]
    if avaria is None:
        fatores.append(dict(fator="Avaria", impacto="negativo",
                            descricao="Avaria não avaliada — impacto no preço não mensurável"))
    elif avaria == 0:
        fatores.append(dict(fator="Avaria", impacto="positivo",
                            descricao="Sem avarias registradas"))
    elif avaria <= 7000:
        fatores.append(dict(fator="Avaria", impacto="neutro",
                            descricao=f"Avarias de R$ {avaria:.0f}, dentro do usual para o segmento"))
    else:
        fatores.append(dict(fator="Avaria", impacto="negativo",
                            descricao=f"Avarias de R$ {avaria:.0f}, com desconto relevante sobre a referência de mercado"))

    idade = ANO_REFERENCIA - base["ano"]
    fatores.append(dict(
        fator="Idade do veículo",
        impacto="positivo" if idade <= 3 else ("neutro" if idade <= 5 else "negativo"),
        descricao=f"Veículo {base['ano']} com {idade} anos de uso",
    ))

    fatores.append(dict(
        fator="Liquidez do modelo",
        impacto="positivo" if n_comparaveis >= 10 else ("neutro" if n_comparaveis >= 5 else "negativo"),
        descricao=f"{n_comparaveis} anúncios comparáveis ativos no mercado",
    ))
    return fatores


def _gerar_comparaveis(base: dict, p50: Decimal, nivel_confianca: str,
                       data_referencia: date) -> list[dict]:
    """Comparáveis de mercado fictícios (RF-F6-A-07), coerentes com o veículo."""
    nivel_base = _MATCHING_BASE_POR_NIVEL[nivel_confianca]
    comparaveis: list[dict] = []
    n = base["n_comparaveis"]
    for i in range(n):
        fator = Decimal("0.94") + Decimal("0.012") * i  # dispersão em torno do p50
        nivel = min(7, nivel_base + (i % 3))
        comparaveis.append(dict(
            fonte="Fornecedor A" if i % 2 == 0 else "Fornecedor B",
            modelo_anuncio=base["modelo"],
            versao_anuncio=base["versao"] if nivel <= 4 else f"{base['versao']} (aprox.)",
            ano=base["ano"] - (1 if i % 5 == 4 else 0),
            km=max(5_000, base["km"] - 8_000 + i * 1_500),
            preco_anunciado=_arredondar_centena(p50 * fator),
            data_anuncio=data_referencia - timedelta(days=(i * 3) % 28),
            nivel_matching=nivel,
            regra_matching=NIVEIS_MATCHING[nivel],
        ))
    return comparaveis


def _gerar_historico(indice: int, data_entrada: date, data_referencia: date,
                     preco_rec: Decimal, faixa_op: dict, faixa_cons: dict,
                     nivel_confianca: str) -> list[dict]:
    """Histórico de preços e atualizações (RF-F6-A-11) — imutável.

    Preços do passado partem ~4% acima e convergem para o estado atual;
    o último evento reflete exatamente os valores vigentes do veículo.
    """
    eventos_meio = [
        "Atualização de referência de mercado",
        "Reprocessamento do modelo de precificação",
        "Atualização de referência de mercado",
        "Ajuste de parâmetros de classificação",
    ]
    # Eventos intermediários distribuídos entre a entrada e a última referência.
    dias_total = max(1, (data_referencia - data_entrada).days)
    n_meio = min(3, max(1, dias_total // 30))

    def _escala(fator: Decimal) -> dict:
        return dict(
            preco_recomendado=_arredondar_centena(preco_rec * fator),
            faixa_operacional=dict(
                minimo=_arredondar_centena(faixa_op["minimo"] * fator),
                maximo=_arredondar_centena(faixa_op["maximo"] * fator),
            ),
            faixa_conservadora=dict(
                minimo=_arredondar_centena(faixa_cons["minimo"] * fator),
                maximo=_arredondar_centena(faixa_cons["maximo"] * fator),
            ),
        )

    eventos: list[dict] = [dict(
        data=data_entrada,
        evento="Entrada no inventário — precificação inicial",
        confianca_nivel=nivel_confianca,
        **_escala(Decimal("1.04")),
    )]
    for i in range(n_meio):
        frac = Decimal(i + 1) / Decimal(n_meio + 1)
        fator = Decimal("1.04") - Decimal("0.04") * frac
        eventos.append(dict(
            data=data_entrada + timedelta(days=int(dias_total * float(frac))),
            evento=eventos_meio[(indice + i) % len(eventos_meio)],
            confianca_nivel=nivel_confianca,
            **_escala(fator),
        ))
    eventos.append(dict(
        data=data_referencia,
        evento="Atualização de referência de mercado",
        confianca_nivel=nivel_confianca,
        preco_recomendado=preco_rec,
        faixa_operacional=dict(**faixa_op),
        faixa_conservadora=dict(**faixa_cons),
    ))
    eventos.sort(key=lambda e: e["data"])
    return eventos


def _montar_veiculo(indice: int, base: dict) -> dict:
    """Deriva o registro completo do veículo a partir dos atributos brutos."""
    km_medio = calcular_km_medio_anual(base["km"], base["ano"], ANO_REFERENCIA)
    resultado = classificar(base["avaria_valor"], km_medio, base["valor_fipe"])
    score, nivel, motivos, alertas = _avaliar_confianca(
        base["n_comparaveis"], base["dias_referencia"], base["avaria_valor"]
    )

    # Preço recomendado (RF-F5-RS-03): combinação 40% interno / 60% externo.
    preco_rec = _arredondar_centena(
        base["preco_interno"] * Decimal("0.4")
        + base["referencia_externa"] * Decimal("0.6")
    )

    # Percentis (RF-F5-RS-06) e faixas (RS-04/05), coerentes por construção:
    # p50 = recomendado; operacional = [p25, p75]; conservadora ⊂ operacional.
    spread = _SPREAD_POR_NIVEL[nivel]
    p10 = _arredondar_centena(preco_rec * (1 - spread))
    p25 = _arredondar_centena(preco_rec * (1 - spread * Decimal("0.55")))
    p75 = _arredondar_centena(preco_rec * (1 + spread * Decimal("0.55")))
    p90 = _arredondar_centena(preco_rec * (1 + spread))
    faixa_operacional = dict(minimo=p25, maximo=p75)
    faixa_conservadora = dict(
        minimo=_arredondar_centena(preco_rec * (1 - spread * Decimal("0.3"))),
        maximo=_arredondar_centena(preco_rec * (1 + spread * Decimal("0.3"))),
    )

    data_referencia = HOJE - timedelta(days=base["dias_referencia"])
    dias_estoque = 50 + (indice * 17) % 100
    data_entrada = HOJE - timedelta(days=dias_estoque)

    nivel_matching = 6 if base["avaria_valor"] is None else _MATCHING_BASE_POR_NIVEL[nivel]
    comparaveis = _gerar_comparaveis(base, preco_rec, nivel, data_referencia)

    return dict(
        **{k: base[k] for k in ("placa", "marca", "modelo", "versao", "ano",
                                 "km", "cor", "combustivel", "avaria_valor",
                                 "valor_fipe")},
        km_medio_anual=km_medio,
        data_entrada_estoque=data_entrada,
        classe=resultado.classe,
        classe_label=resultado.classe_label,
        canal_sugerido=resultado.canal_sugerido,
        regra_aplicada=resultado.regra_aplicada,
        excecao_possivel=resultado.excecao_possivel,
        preco_interno_estimado=base["preco_interno"],
        referencia_externa_mercado=base["referencia_externa"],
        preco_recomendado=preco_rec,
        faixa_operacional=faixa_operacional,
        faixa_conservadora=faixa_conservadora,
        percentis=dict(p10=p10, p25=p25, p50=preco_rec, p75=p75, p90=p90),
        quantidade_comparaveis=len(comparaveis),
        confianca=dict(nivel=nivel, score=score),
        data_referencia_mercado=data_referencia,
        matching=dict(modelo=base["modelo"], versao=base["versao"],
                      nivel=nivel_matching, regra=NIVEIS_MATCHING[nivel_matching]),
        motivos_baixa_confianca=motivos,
        fatores_explicacao=_gerar_fatores(base, km_medio, base["n_comparaveis"]),
        alerta_qualidade_dados=dict(ativo=bool(alertas), motivos=alertas),
        comparaveis=comparaveis,
        historico=_gerar_historico(indice, data_entrada, data_referencia,
                                   preco_rec, faixa_operacional,
                                   faixa_conservadora, nivel),
    )


# Inventário mockado completo, montado uma única vez na importação.
INVENTARIO: list[dict] = [_montar_veiculo(i, b) for i, b in enumerate(_VEICULOS_BASE)]
