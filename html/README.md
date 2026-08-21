# Versão HTML pura — Plate-by-Plate Pricing (SDP #5211)

Painel do time de Precificação em **HTML + CSS + JavaScript puros**: sem build,
sem servidor, sem Python e sem Node. Abre com duplo clique e funciona offline.

Serve para **demonstração rápida** e para **distribuir a quem não tem ambiente
montado**. A aplicação de verdade continua sendo `frontend/` (React + Vite) com
`backend/` (FastAPI) — veja `iniciar-app.bat` na raiz do projeto.

## Como abrir

Duplo clique em **`abrir.bat`** (abre no Chrome) ou diretamente em
**`index.html`** (abre no navegador padrão). Não há nada para instalar.

## O que funciona

Tudo o que o painel React faz, com os mesmos dados e as mesmas regras:

- indicadores do topo (total, preço recomendado médio, alertas/não avaliados);
- visão executiva: composição por classe A–E, valor por canal e a série
  Recomendado vs. FIPE (SVG desenhado na largura real, responsivo);
- pesquisa por placa (parcial) e filtros por modelo, versão, ano, classe e canal
  — mesmas regras de `backend/app/services.py`;
- detalhe do veículo: precificação, faixas, percentis, confiança, motivos de
  baixa confiança, alertas de qualidade, classificação, matching, fatores,
  comparáveis, dados cadastrais e histórico;
- exportação CSV do resultado filtrado (`;`, decimal com vírgula, BOM UTF-8).

Regra da spec preservada: **avaria/classe nula não é zero** — o veículo
`XLM8E67` (RAV4) aparece como "Não avaliado", com alerta, nunca como classe A.

## O que tem dentro

| Caminho | O que é |
|---|---|
| `index.html` | Página única com o shell (topbar, breadcrumb, footer) |
| `css/tokens.css` | **Cópia** de `frontend/src/styles/tokens.css` (tokens KINTO/NFMS) |
| `css/app.css` | **Cópia** de `frontend/src/index.css` |
| `js/dados.js` | **Snapshot** dos endpoints da API — gerado, não editar à mão |
| `js/app.js` | A aplicação (porte 1:1 dos componentes React) |
| `assets/` | Logo e favicons, copiados de `frontend/public/` |
| `abrir.bat` | Abre `index.html` no Chrome |
| `gerar-dados.ps1` | Regera `js/dados.js` a partir da API |

## Regenerar os dados

`js/dados.js` congela as respostas de `/api/filtros`, `/api/inventario` e, para
cada placa, `/api/inventario/{placa}` e `/api/inventario/{placa}/historico`.
Quando os mocks de `backend/app/data.py` mudarem, suba o backend
(`iniciar-app.bat` na raiz) e rode:

```powershell
powershell -ExecutionPolicy Bypass -File html\gerar-dados.ps1
```

Se a API estiver em outra porta:

```powershell
powershell -ExecutionPolicy Bypass -File html\gerar-dados.ps1 -ApiUrl http://localhost:8000
```

## Limitações (assumidas de propósito)

- **Dados congelados**: nenhuma chamada de rede. O que está em `js/dados.js` é o
  que a tela mostra — inclusive a data de geração, registrada no topo do arquivo.
- **Espelho, não fonte**: mudanças em `frontend/src` **não** aparecem aqui
  sozinhas. Ao alterar CSS ou comportamento no React, replique nesta pasta
  (o CSS é cópia literal; `js/app.js` documenta a correspondência arquivo a
  arquivo com os componentes React).
- **A fonte Lexend Deca** vem do Google Fonts: offline, a página cai no
  `sans-serif` do sistema. O resto do layout não depende de rede.
- Sem paginação (o mock tem 20 veículos, carregados de uma vez), igual ao React.

## Como isto foi validado

Renderização e interações conferidas no Chrome, incluindo a abertura por
`file://`: console sem erros, filtro por classe `NAO_AVALIADO` retornando só o
`XLM8E67`, busca parcial por placa (`bra` → `BRA2E19`), painel de detalhe com as
seções completas, "Limpar filtros" e CSV com 21 linhas (cabeçalho + 20).
