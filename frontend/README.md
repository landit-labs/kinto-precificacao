# Painel Analítico de Precificação — Frontend (Fase 6, Alternativa A)

Painel de consulta do time de Precificação (SDP #5211): inventário de seminovos,
pesquisa por placa, filtros, detalhe do veículo (preço recomendado, faixas,
comparáveis, confiança, alertas, classificação e histórico) e exportação CSV.

Stack: React + Vite + TypeScript, CSS puro. Consome o backend FastAPI mockado.

## Pré-requisito

O backend deve estar rodando em `http://localhost:8000` (pasta `backend/` na
raiz do projeto). Sem ele, o painel exibirá erro de conexão.

## Como rodar

```bash
npm install
npm run dev
```

A aplicação sobe em `http://localhost:5173`.

## Configuração

A base da API é configurável pela variável `VITE_API_URL` (default
`http://localhost:8000`). Exemplo: crie um `.env.local` com

```
VITE_API_URL=http://localhost:8000
```

## Build de produção

```bash
npm run build
```

## Estrutura

- `src/api/types.ts` — tipos TypeScript espelhando o contrato da API
- `src/api/client.ts` — camada de acesso à API (com envelope de erro padrão)
- `src/hooks/useApi.ts` — estado de servidor (carregando / erro / dados)
- `src/utils/format.ts` — moeda, números e datas no padrão pt-BR
- `src/utils/csv.ts` — exportação CSV client-side (`;`, decimal vírgula, BOM UTF-8)
- `src/components/` — barra de filtros, tabela do inventário, badges, estados
- `src/components/detalhe/` — painel lateral de detalhe do veículo

## Requisitos atendidos

RF-F6-A-01 a RF-F6-A-11 (painel analítico — Alternativa A).
