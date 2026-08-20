# Spec — Adaptação do Painel Analítico de Precificação à identidade KINTO / NFMS Admin

- **Autor:** agente `ux-ui` · 2026-08-20
- **Executor:** agente `frontend-react` (esta spec + `frontend/src/styles/tokens.css` são os insumos)
- **Referência canônica:** `kbr-nfms-admin-portal-main/` — em especial:
  - `docs/assets/scss/app/_variables.scss` (tokens fonte)
  - `docs/template/pricing_used_vehicles.html` (**página equivalente exata** desta tela no portal — Plate-by-Plate Pricing)
  - `docs/template/pricing_dashboard.html` (KPI cards e cards de módulo)
  - `docs/assets/scss/app/_badge.scss`, `_card.scss`, `_tables.scss`, `_app.scss`, `_header.scss`
- **Tela alvo:** `frontend/` — painel analítico de precificação de seminovos (RF-F6-A-01 a RF-F6-A-11), que no NFMS Admin corresponde a **Pricing › Used Vehicles › Plate-by-Plate Pricing**.

## 1. Escopo

Adaptar a tela existente à identidade NFMS Admin/KINTO com um **shell simplificado** (topbar + breadcrumb + footer, **sem** o rail de módulos nem a sidebar completa — não recriar as 147 páginas nem o menu). Nenhuma mudança de comportamento/dados: só aparência, estrutura de página e semântica de cor. O template usa Bootstrap 5; o frontend **não** deve adotar Bootstrap — reproduzir os padrões visuais com o CSS próprio, consumindo `tokens.css`.

## 2. Identidade textual

| Item | Valor |
|---|---|
| `<title>` do documento | `Plate-by-Plate Pricing · Pricing \| NFMS Admin` |
| Título no topbar | `Pricing · Plate-by-Plate Pricing` (padrão do template: `<h4>Pricing · <span>Plate-by-Plate Pricing</span></h4>`, com o `<span>` em peso/cor de destaque) |
| Breadcrumb | `Pricing / Used Vehicles / Plate-by-Plate Pricing` (último item ativo em primary; separador `/` em secondary) |
| Footer | `Copyright © 2026 KINTO Brasil · NFMS Admin. All rights reserved.` |
| Idiomas | Nomes de módulo/tela em inglês (padrão PSF); conteúdo, labels e mensagens ao usuário em pt-BR (mantém os textos atuais). |
| Marca | KINTO aparece só nos logos e no copyright — nunca em texto corrente. |

## 3. Layout alvo da página (shell NFMS simplificado)

Estrutura extraída de `pricing_used_vehicles.html` e simplificada (sem `semi-side-nav`/`main-side-nav`):

```
<body>  ← fundo var(--bodybg-color) #EBF4F6, fonte "Lexend Deca"
└── .app-wrapper
    ├── header .header-main          ← fixo, altura 65px, fundo branco,
    │   │                              borda inferior 1px rgba(89,100,109,.2), z-index 1001
    │   ├── (esq.) emblem KINTO      ← logo/3.png em chip branco 40×40, raio 12px
    │   │        + h4 "Pricing · <span>Plate-by-Plate Pricing</span>"
    │   └── (dir.) opcional: ícone de tema/ajuda (círculos 40px, borda rgba(secondary,.2))
    ├── ul .app-breadcrumbs          ← fixo em top:64px, fundo branco, padding .75rem 2.5rem,
    │   │                              largura total (sem rail), z-index 1000
    │   ├── li  a "Pricing"                (cor #6c757d, f-w 500, 14px)
    │   ├── li  a "Used Vehicles"          (idem; separador "/" em secondary)
    │   └── li.active  "Plate-by-Plate Pricing"  (cor primary, cursor default)
    ├── .app-content                 ← padding-top 112px (compensa header+breadcrumb),
    │   │                              padding-x 2.5rem, min-height 100vh
    │   └── main > .container-fluid
    │       ├── linha de KPI cards (3 col ≥ md, empilha < md)          [ver §4.2]
    │       │   ├── Card 1: total de veículos filtrados     (ícone ti-car, tint primary)
    │       │   ├── Card 2: preço recomendado médio          (ícone ti-chart-line, tint success)
    │       │   └── Card 3: veículos com alerta/Não avaliado (ícone ti-alert-triangle, tint warning)
    │       ├── card de filtros (BarraFiltros)                          [ver §4.3]
    │       └── card da tabela                                          [ver §4.4]
    │           ├── .card-header: h5 "Plate-by-Plate Pricing"
    │           │    + p descritivo (texto atual do subtítulo, pt-BR)
    │           └── .card-body p-0 > .table-responsive > tabela densa
    ├── painel de detalhe (aside)    ← estilo offcanvas NFMS            [ver §4.6]
    └── footer .footer-container     ← copyright + link "Precisa de ajuda?"
```

Observações:

- O template usa `padding-top: 112px` no `.app-content` (65px header + 47px breadcrumb). Manter.
- KPI cards são **derivados dos dados já carregados** (nenhuma chamada nova): total = `inventario.data.total`; média de `preco_recomendado` dos itens; contagem de `alerta_qualidade_dados || classe === null`.
- O `.app` atual com `max-width: 1280px` deixa de existir — o conteúdo é fluido (`container-fluid`) como no template.

## 4. Padrões de componente (valores do template)

### 4.1 Card (base de tudo)

- Fundo `rgba(255,255,255,.65)` sobre o body `#EBF4F6` (o template usa card translúcido; branco sólido `#fff` é aceitável se a translucidez atrapalhar a leitura da tabela — anotar como desvio consciente).
- Borda `1px solid rgba(89,100,109,.2)` · raio `var(--app-border-radius)` (0.375rem) · sombra `var(--box-shadow)` · `margin-bottom: 1rem`.
- Padding de `card-header`/`card-body`/`card-footer`: `1.125rem 1.5rem`; card de tabela usa `card-body` com padding 0.
- `card-header`: `h5` (1.125rem, peso 500–600) + parágrafo secundário opcional; borda inferior `rgba(89,100,109,.2)`.

### 4.2 KPI card (padrão de `pricing_used_vehicles.html` / `pricing_dashboard.html`)

```
.card > .card-body (flex, space-between, align-center)
├── div:  h4 valor (1.25rem, mb .25rem)  +  p rótulo (texto muted/secondary, mb 0)
└── span círculo 45×45, raio 50%, fundo rgba(cor,.1), ícone 22px na cor
```

Cores dos chips: card 1 primary, card 2 success, card 3 warning (fundo `rgba(var(--x),.1)`, ícone na cor plena — é gráfico decorativo, não texto; o valor/rótulo ficam no texto ao lado).

### 4.3 Barra de filtros

Vira um **card padrão** (borda/raio/sombra do §4.1) contendo o form atual:

- Labels: 0.8rem, peso 600, cor secondary `#59646D`.
- Inputs/selects: borda `1px solid #D4D7D9`, raio 0.375rem, fundo branco, fonte 14px; foco com `outline 2px solid #00708D` (substitui o azul atual).
- Botão primário ("Exportar CSV"): fundo `#00708D`, texto branco, raio 0.375rem, fonte 15px; hover `#00384A` (fim do gradiente de marca).
- Botão secundário ("Limpar filtros"): fundo branco, texto `#38434B`, borda `#D4D7D9`; hover fundo `#F4F7F8`.

### 4.4 Tabela densa (padrão `table table-bottom-border table-hover` + `thead.table-light`)

- Célula: padding `0.4rem 1.25rem` (mais denso que os 10px×12px atuais); fonte 14px; `border-bottom 1px` entre linhas (cor `#c5c4c3` suavizada — o template usa `--bs-table-border-color`), sem bordas verticais.
- `thead`: fundo `#F4F7F8` (light-gray), texto **uppercase** em secondary `#59646D`, 0.78rem, letter-spacing .03em; manter `position: sticky; top: 0` (melhoria do frontend atual — desvio consciente aceito, o template não tem sticky).
- **Números sempre à direita** (`text-end` no template): colunas KM e Preço recomendado; manter `font-variant-numeric: tabular-nums` e formatação pt-BR (`R$ 124.700,00`, `38.000 km`).
- Preço recomendado: peso 500–700, é a coluna de decisão — pode usar `text-dark` `#38434B` pleno enquanto o resto da linha fica em tom normal.
- Hover de linha: `rgba(0,112,141,.06)`; linha selecionada: `rgba(0,112,141,.12)` (substitui os azuis Tailwind `#f0f4ff`/`#e4ecff`).
- Placa: primeira coluna, peso 600, cor `text-dark` como no template; o link/botão de detalhe usa cor primary `#00708D` com sublinhado no hover (não sublinhado permanente).

### 4.5 Badges (padrão `.badge` + `.text-light-*` de `_badge.scss`)

Forma: padding `0.3em 0.9em`, peso 600, letter-spacing 0.5px, raio **0.375rem** (`var(--app-border-radius)`) — **não** pill 999px. Receita `text-light-*`: fundo `rgba(cor,.10)`, texto na cor (ver §7 para os tons de texto AA).

Mapeamento semântico — **idêntico em todas as telas** (tabela, detalhe, filtros):

| Badge | Família de cor | Estilo | Racional |
|---|---|---|---|
| Classe A | success | tint (`rgba(success,.1)` + texto `--texto-aa-success`) | A/B = Retail → família verde |
| Classe B | success | **outline** (fundo transparente, borda 1px e texto `--texto-aa-success`) | distingue B de A sem quebrar a família |
| Classe C | warning | tint + texto `--texto-aa-warning` | C/D = Wholesale intermediário |
| Classe D | warning | **outline** + texto `--texto-aa-warning` | distingue D de C |
| Classe E | danger | tint + texto `--texto-aa-danger` | pior classe |
| **Não avaliado** | warning | tint + **borda 1px tracejada** `rgba(warning,1)` + texto `--texto-aa-warning` | nunca aparência de classe; avaria nula ≠ zero |
| Confiança Alta | success | tint + texto AA | |
| Confiança Média | warning | tint + texto AA | |
| Confiança Baixa | danger | tint + texto AA | |
| Canal Retail | primary | tint (`rgba(0,112,141,.1)` + texto `#00708D`) | cor de marca, não semântica |
| Canal Wholesale | dark | tint (`rgba(56,67,75,.1)` + texto `#38434B`) | neutro, par do Retail |
| Impacto positivo/negativo/neutro (fatores) | success / danger / secondary | tint + textos AA | |

Paridade texto/ícone garantida: todo badge carrega rótulo textual (letra da classe, "Alta/Média/Baixa", "Retail/Wholesale") — cor nunca é o único canal. O ícone ⚠ de alerta de qualidade mantém `aria-label` e cor `--texto-aa-warning`.

### 4.6 Painel de detalhe (estilo offcanvas NFMS)

- Mantém posição fixa à direita, `width: min(720px, 100%)`; raio 0 na borda colada, `var(--app-border-radius)` se destacado; fundo branco sólido; sombra do template.
- Cabeçalho no padrão offcanvas: `h5` com o veículo + botão fechar discreto (× em botão sem borda, hover `#F4F7F8`).
- Seções internas viram o padrão card-header/card-body: títulos `h5`/`h6`, divisórias `1px rgba(89,100,109,.2)`.
- **Preço recomendado** continua a informação dominante: bloco com fundo `rgba(0,112,141,.08)`, borda `rgba(0,112,141,.25)`, raio 0.375rem, rótulo uppercase secondary e valor 1.6rem em `#00384A` (contraste 12,6:1 sobre o tint — ver §7). Faixas, percentis e comparáveis permanecem apoio visual (tabelas secundárias densas, §4.4).

### 4.7 Estados (sempre desenhados)

| Estado | Tratamento |
|---|---|
| Carregando | card padrão com texto secondary + spinner/skeleton simples; `role="status"` (mantém) |
| Erro | card com fundo `rgba(239,68,68,.08)`, borda `rgba(239,68,68,.25)`, texto `--texto-aa-danger`, botão "Tentar novamente" no estilo secundário |
| Vazio | card com borda tracejada `#D4D7D9`, ícone `ti-car`/🔍 secundário, mensagem atual centralizada |
| Não avaliado | badge do §4.5 na tabela; no detalhe, aviso em card tint warning com texto AA explicando o motivo |

## 5. Auditoria — divergências concretas (atual → esperado)

| # | Arquivo | Elemento | Atual | Esperado (KINTO/NFMS) |
|---|---|---|---|---|
| 1 | `frontend/index.html` | `<title>` | `Painel Analítico de Precificação — Seminovos` | `Plate-by-Plate Pricing · Pricing \| NFMS Admin` |
| 2 | `frontend/index.html` | favicon | `favicon.svg` genérico | `logo/favicon.png` KINTO (copiar do portal) |
| 3 | `frontend/index.html` | fonte | nenhum link de fonte (Segoe UI via CSS) | Google Fonts **Lexend Deca** (`wght@100..900`) com preconnect |
| 4 | `frontend/src/index.css` | `--cor-primaria` | `#1d4ed8` (azul Tailwind) | `#00708D` |
| 5 | `frontend/src/index.css` | `--cor-primaria-escura` / `--cor-foco` | `#1e40af` / `#2563eb` | `#00384A` / `#00708D` |
| 6 | `frontend/src/index.css` | `--cor-fundo` | `#f4f6f8` | `#EBF4F6` |
| 7 | `frontend/src/index.css` | `--cor-borda` | `#d8dee4` | `#D4D7D9` (bordas de card: `rgba(89,100,109,.2)`) |
| 8 | `frontend/src/index.css` | `--cor-texto` / `--cor-texto-suave` | `#1f2933` / `#52606d` | `#38434B` / `#59646D` |
| 9 | `frontend/src/index.css` | `--raio` | `8px` | `0.375rem` |
| 10 | `frontend/src/index.css` | `font-family` | Segoe UI/system | `"Lexend Deca", sans-serif` |
| 11 | `frontend/src/index.css` | `--sombra` | `0 1px 3px rgba(31,41,51,.12)` | `0 0.15625rem 0.625rem 0 rgba(56,67,75,.10)` |
| 12 | `frontend/src/index.css` | `.badge` | pill `border-radius: 999px` | raio `0.375rem`, padding `0.3em 0.9em`, peso 600, letter-spacing .5px |
| 13 | `frontend/src/index.css` | `.badge-classe-*` | escala Tailwind verde→vermelho (5 hex fora do DS) | mapeamento §4.5 sobre success/warning/danger KINTO |
| 14 | `frontend/src/index.css` | `.badge-canal-*` | Retail `#dbeafe`/azul, Wholesale `#ede9fe`/roxo | Retail tint primary, Wholesale tint dark |
| 15 | `frontend/src/index.css` | `.badge-confianca-*` | verdes/vermelhos Tailwind | tints success/warning/danger + textos AA |
| 16 | `frontend/src/index.css` | `thead th` | fundo `#eef1f4`, texto `#52606d` | fundo `#F4F7F8`, texto `#59646D` uppercase (sticky mantido) |
| 17 | `frontend/src/index.css` | `th, td` padding | `10px 12px` | `0.4rem 1.25rem` (tabela mais densa) |
| 18 | `frontend/src/index.css` | hover/seleção de linha | `#f0f4ff` / `#e4ecff` | `rgba(0,112,141,.06)` / `rgba(0,112,141,.12)` |
| 19 | `frontend/src/index.css` | `.preco-recomendado` | `#eff6ff`/`#bfdbfe`, valor `#1e40af` | tint `rgba(0,112,141,.08)`, borda `rgba(0,112,141,.25)`, valor `#00384A` |
| 20 | `frontend/src/index.css` | `.estado-erro`, `.aviso-*` | hex Tailwind (`#fdecea`, `#fff8e1`…) | tints danger/warning KINTO + textos AA (§4.7) |
| 21 | `frontend/src/App.tsx` | shell | `h1` "Painel Analítico…" + `.app` max-width 1280 | shell NFMS: `header-main` + `app-breadcrumbs` + `container-fluid` + `footer` (§3) |
| 22 | `frontend/src/App.tsx` | KPI cards | inexistentes | 3 cards padrão §4.2 derivados dos dados carregados |
| 23 | `frontend/src/components/BarraFiltros.tsx` | container | `form` com estilo próprio | mesmo form dentro de card padrão §4.1 (sem mudança funcional) |
| 24 | `frontend/src/components/TabelaInventario.tsx` | container | div com borda própria | card com `card-header` (h5 + descrição) e `card-body` sem padding (§4.4) |
| 25 | `frontend/src/components/detalhe/DetalheVeiculo.tsx` | painel | aside com estilo próprio | mesmo aside com anatomia offcanvas NFMS (§4.6) |
| 26 | rodapé | footer | inexistente | `Copyright © 2026 KINTO Brasil · NFMS Admin. All rights reserved.` |

O que **já está correto** e deve ser preservado: formatação pt-BR (`utils/format.ts`), alinhamento numérico à direita + `tabular-nums`, estados carregando/erro/vazio explícitos, "Não avaliado" nunca tratado como classe A, foco visível, `aria-*`/roles, caption sr-only, painel de detalhe com foco no preço recomendado.

## 6. Assets

Copiar do portal para `frontend/public/` (o Vite não serve arquivos fora da raiz do app):

| Origem (`kbr-nfms-admin-portal-main/docs/assets/images/logo/`) | Destino sugerido | Uso |
|---|---|---|
| `favicon.png` (emblem 32×32) | `frontend/public/favicon.png` | favicon do documento |
| `3.png` (emblem "swirl" 48×48) | `frontend/public/logo-kinto-emblem.png` | chip do topbar (40×40, fundo branco, raio 12px) |
| `1.png` (wordmark 735×181) | `frontend/public/logo-kinto.png` | opcional — se o topbar usar wordmark em vez de emblem+título |

Ícones: o template usa Tabler Icons (fonte). Para não adicionar dependência, os 4–5 ícones necessários (carro, gráfico, alerta, busca, ×) podem continuar no `icons.svg` existente ou como SVG inline — manter traço 1.5–2px, estilo outline, para casar com Tabler.

## 7. Contraste — validação AA (WCAG 2.1)

Razões calculadas (luminância relativa WCAG). AA: ≥ 4,5:1 texto normal; ≥ 3:1 texto grande (≥18,66px bold / 24px) e componentes de UI.

| Par | Razão | Veredicto |
|---|---|---|
| `#00708D` sobre `#FFFFFF` (links, placa, breadcrumb ativo) | **5,67:1** | ✅ AA texto normal |
| `#FFFFFF` sobre `#00708D` (botão primário) | **5,67:1** | ✅ AA |
| `#00708D` sobre `#EBF4F6` (body) | **5,08:1** | ✅ AA |
| `#00708D` sobre tint `rgba(0,112,141,.1)` (badge Retail) | **4,93:1** | ✅ AA |
| `#38434B` sobre `#FFFFFF` (texto padrão) | **10,13:1** | ✅ AAA |
| `#38434B` sobre `#EBF4F6` | **9,07:1** | ✅ AAA |
| `#59646D` sobre `#FFFFFF` (texto secundário, labels) | **6,05:1** | ✅ AA |
| `#59646D` sobre `#F4F7F8` (thead) | **5,62:1** | ✅ AA |
| `#00384A` sobre `rgba(0,112,141,.08)` (valor do preço recomendado) | **11,3:1** | ✅ AAA |
| `#34B478` como texto sobre branco ou tint | 2,64:1 / 2,42:1 | ❌ **nunca usar como texto** |
| `#FAAC50` como texto sobre branco | 1,90:1 | ❌ nunca como texto |
| `#EF4444` como texto sobre branco | 3,76:1 | ❌ texto normal (✅ só ≥3:1 para ícones/bordas) |
| `--texto-aa-success #1D7A4F` sobre tint success 10% / branco | **4,87:1 / 5,32:1** | ✅ AA |
| `--texto-aa-warning #92600C` sobre tint warning 10% / branco | **5,06:1 / 5,38:1** | ✅ AA |
| `--texto-aa-danger #C03030` sobre tint danger 10% / branco | **4,96:1 / 5,67:1** | ✅ AA |

Consequência prática: os badges `text-light-success/warning/danger` do template, se copiados literalmente (texto na cor plena), **reprovam** AA em texto pequeno. A spec usa as cores canônicas para fundos/bordas/ícones e os três tons derivados `--texto-aa-*` (mesmo matiz, escurecidos) para o texto dos badges. É um desvio do template motivado por acessibilidade — registrado em §9 como pendência de ratificação.

## 8. Lista priorizada de mudanças (passar verbatim ao frontend-react)

> Regras gerais: consumir `frontend/src/styles/tokens.css` (importar antes de `index.css` em `main.tsx`); não adicionar Bootstrap nem outra lib de UI; não alterar `api/`, `hooks/`, `utils/` (exceto se precisar de um helper de média para os KPI); manter todos os comportamentos, textos pt-BR e atributos de acessibilidade existentes.

1. **Fundação de tokens** — Importar `src/styles/tokens.css` em `src/main.tsx` (antes de `index.css`). Em `src/index.css`, remover o bloco `:root` local (as variáveis `--cor-*` agora vêm do tokens.css) e trocar `font-family` para `var(--theme-fonts)`. Em `index.html`: novo `<title>` `Plate-by-Plate Pricing · Pricing | NFMS Admin`, favicon `favicon.png` e links do Google Fonts para **Lexend Deca** (preconnect + stylesheet `family=Lexend+Deca:wght@100..900`).
2. **Assets** — Copiar `kbr-nfms-admin-portal-main/docs/assets/images/logo/favicon.png` → `frontend/public/favicon.png` e `.../logo/3.png` → `frontend/public/logo-kinto-emblem.png`.
3. **Shell NFMS em `App.tsx`** — Substituir o header atual por: (a) `header.header-main` fixo (65px, fundo branco, borda inferior `1px solid rgba(89,100,109,.2)`, padding-x 2.5rem) com o emblem KINTO num chip branco 40×40 raio 12px e `<h4>Pricing · <span>Plate-by-Plate Pricing</span></h4>` (h4 1.25rem; span peso 600 em `--cor-texto`); (b) `ul.app-breadcrumbs` fixa em top 64px (fundo branco, padding `0.75rem 2.5rem`, itens `Pricing`, `Used Vehicles` em `#6c757d` peso 500 e `Plate-by-Plate Pricing` ativo em `#00708D`, separador "/" em `#59646D`); (c) conteúdo em `container-fluid` com `padding: 112px 2.5rem 47px` (remover `.app` max-width 1280); (d) `footer` com `Copyright © 2026 KINTO Brasil · NFMS Admin. All rights reserved.` à esquerda (texto 0.875rem secondary). Breadcrumb e topbar são estáticos (sem navegação real) — links com `href="#"` ou `<span>`.
4. **KPI cards** — Acima da barra de filtros, linha com 3 cards (grid responsivo: 3 colunas ≥900px, empilhado abaixo), padrão: card branco (borda `rgba(89,100,109,.2)`, raio `var(--app-border-radius)`, sombra `var(--box-shadow)`, padding `1.125rem 1.5rem`), conteúdo flex space-between com `h4` valor + `p` rótulo secondary à esquerda e chip circular 45×45 `rgba(cor,.1)` com ícone 22px à direita. Card 1: "Veículos no inventário" = `inventario.data.total` (chip primary); Card 2: "Preço recomendado médio" = média de `preco_recomendado` dos itens filtrados formatada com `formatarMoeda` (chip success); Card 3: "Com alerta ou não avaliados" = contagem de `alerta_qualidade_dados || classe === null` (chip warning). Renderizar apenas quando `inventario.data` existir; sem novas chamadas de API.
5. **Restyle de badges** — Em `index.css`: `.badge` passa a raio `var(--app-border-radius)`, padding `0.3em 0.9em`, peso 600, letter-spacing 0.5px, font-size 0.78rem. Recolorir conforme mapeamento: classe A `background rgba(var(--success),.1); color var(--texto-aa-success)`; classe B igual A porém `background transparent; border 1px solid var(--texto-aa-success)`; classe C `rgba(var(--warning),.1)` + `var(--texto-aa-warning)`; classe D outline warning; classe E `rgba(var(--danger),.1)` + `var(--texto-aa-danger)`; `.badge-nao-avaliado` tint warning + `border 1px dashed rgba(var(--warning),1)` + texto `var(--texto-aa-warning)`; confiança alta/média/baixa = tints success/warning/danger com os mesmos textos AA; canal Retail tint primary com texto `#00708D`; canal Wholesale tint dark (`rgba(var(--dark),.1)`) com texto `#38434B`; impacto positivo/negativo/neutro = tint success/danger/`rgba(var(--secondary),.12)` com textos AA/`#38434B`. `.alerta-icone` passa a `color: var(--texto-aa-warning)`. Nenhuma mudança em `Badges.tsx` (só classes CSS).
6. **Tabela no padrão NFMS** — `TabelaInventario` embrulhada em card com `card-header` (h5 "Plate-by-Plate Pricing" + `p` com o texto descritivo atual em pt-BR) e `card-body` sem padding; a `div.tabela-container` perde borda/sombra próprias (o card já as tem) e mantém `overflow-x`. Em `index.css`: `th, td` padding `0.4rem 1.25rem`; `thead th` fundo `var(--light-gray)`, cor `#59646D` (sticky mantido); hover de linha `rgba(var(--primary),.06)`; `.linha-selecionada` `rgba(var(--primary),.12)`; `.botao-placa` cor `#00708D`, peso 600, sublinhado apenas no hover; coluna "Preço recomendado" com peso 600 e cor `#38434B`. O `resumo-resultados` ("N veículos encontrados") pode migrar para o `card-header` da tabela, alinhado à direita.
7. **Filtros e botões** — `BarraFiltros` embrulhada no mesmo padrão de card (a classe `.barra-filtros` assume borda `rgba(89,100,109,.2)`, raio e sombra dos tokens). Botões: `.botao` raio `var(--app-border-radius)`, fonte 15px; `.botao-primario` fundo `#00708D`, hover `#00384A`; `.botao-secundario` hover `#F4F7F8`; foco visível global `outline 2px solid var(--cor-foco)` (o token já aponta para `#00708D`).
8. **Painel de detalhe** — `.painel-detalhe` fundo branco sólido, borda esquerda `rgba(89,100,109,.2)`; cabeçalho com `h5` e botão fechar sem borda (hover `#F4F7F8`); `.preco-recomendado` fundo `rgba(var(--primary),.08)`, borda `1px solid rgba(var(--primary),.25)`, rótulo uppercase `#59646D`, valor `#00384A`; seções divididas por `1px solid rgba(89,100,109,.2)`; tabelas internas (percentis, comparáveis, histórico) herdam o padrão denso do item 6.
9. **Estados** — `.estado-erro` fundo `rgba(var(--danger),.08)`, borda `rgba(var(--danger),.25)`, texto `var(--texto-aa-danger)`; `.aviso-atencao` fundo `rgba(var(--warning),.1)`, borda `rgba(var(--warning),.4)`, texto `var(--texto-aa-warning)`; `.aviso-alerta` idem danger; `.estado-vazio` card com borda tracejada `#D4D7D9` e texto `#59646D`; `.estado-carregando` texto `#59646D` em card padrão.
10. **Varredura final** — Remover do `index.css` todo hex remanescente da paleta antiga (`#1d4ed8`, `#1e40af`, `#2563eb`, `#eef1f4`, `#f0f4ff`, `#e4ecff`, `#eff6ff`, `#bfdbfe`, `#dbeafe`, `#ede9fe`, `#fdecea`, `#fff8e1`, escalas Tailwind dos badges etc.), substituindo por tokens; conferir visualmente contra `kbr-nfms-admin-portal-main/docs/template/pricing_used_vehicles.html` servida localmente (`python3 -m http.server` em `docs/`).

## 9. Pendências de decisão (para o usuário — não executar sem OK)

1. **Tons de texto AA nos badges** (`--texto-aa-success/warning/danger`): derivados pelo ux-ui escurecendo as cores semânticas canônicas para cumprir AA em texto pequeno (§7). O template usa a cor plena e reprova. Recomendação: adotar os derivados. Alternativa: copiar o template literalmente e aceitar a falha AA nos badges semânticos.
2. **Distinção A/B e C/D por tint × outline** (§4.5): proposta do ux-ui dentro da paleta canônica (o template não define escala de 5 classes). Alternativa: mesma aparência para A/B e C/D, distinguindo só pela letra.
3. **Fundo do card**: `rgba(255,255,255,.65)` translúcido (fiel ao template) ou `#FFFFFF` sólido (mais legível sob tabela densa). Recomendação: sólido para o card da tabela, translúcido nos demais — decisão estética de baixo risco, frontend-react pode começar com sólido.
4. **Tipografia**: mantida **Lexend Deca** (padrão do template). Migração futura para ToyotaType é decisão de identidade do usuário (ver README do portal).
