# Backend Mock — Plataforma de Precificação de Seminovos (SDP #5211)

API FastAPI **100% mockada** (sem banco, sem Snowflake — dados fictícios em
código Python) que serve o painel analítico da Fase 6, Alternativa A
(RF-F6-A-01 a RF-F6-A-11), expondo os resultados do modelo de precificação
(RF-F5-RS-01 a RS-14).

CORS liberado para o dev server do Vite: `http://localhost:5173` e
`http://127.0.0.1:5173`.

## Como rodar

A partir da pasta `backend/`:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- API: http://localhost:8000/api/inventario
- Documentação interativa (Swagger): http://localhost:8000/docs

## Testes

```bash
source .venv/bin/activate
pytest
```

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/inventario` | Visão consolidada do inventário (RF-F6-A-01), com `placa` (busca parcial, RF-F6-A-02), `modelo`, `versao`, `ano`, `classe` (`A..E` ou `NAO_AVALIADO`), `canal` (`Retail`/`Wholesale`) — RF-F6-A-03 — e `page`/`page_size` |
| GET | `/api/inventario/{placa}` | Detalhe do veículo com resultado completo do modelo (RF-F5-RS-01..14) e comparáveis (RF-F6-A-07) |
| GET | `/api/inventario/{placa}/historico` | Histórico de preços e atualizações (RF-F6-A-11) |
| GET | `/api/filtros` | Valores distintos para popular os filtros do frontend |

Erros seguem o padrão api-land:

```json
{ "error": { "code": "VEICULO_NAO_ENCONTRADO", "message": "…", "details": [] } }
```

## Estrutura

```
app/
  main.py          # app FastAPI, CORS, handlers de erro (padrão api-land)
  routers.py       # rotas finas (prefixo /api)
  services.py      # camada de serviço (consultas, filtros, erros de negócio)
  models.py        # schemas Pydantic (contrato com o frontend)
  classificacao.py # domínio puro: classificação A–E sequencial (RF-F5-RS-12/13)
  parametros.py    # faixas das regras e limiares de confiança (RNF-04)
  data.py          # ~20 veículos mockados; deriva classe/canal/confiança
tests/             # pytest (domínio + endpoints)
```

## Regras de negócio respeitadas no mock

- Classificação A–E **sequencial** e **parametrizável** (valores em
  `app/parametros.py`, separados da lógica — RNF-04).
- **Avaria nula não é zero**: o veículo `XLM8E67` (RAV4) aparece como
  "Não avaliado" (classe `null`), com alerta de qualidade de dados
  (RF-F6-A-09) e motivo de baixa confiança (RF-F5-RS-11).
- Coerência dos números: faixa conservadora contida na operacional,
  percentis ordenados, preço recomendado dentro das faixas.
- Valores monetários trafegam como **número JSON**; formatação pt-BR é
  responsabilidade do frontend.
