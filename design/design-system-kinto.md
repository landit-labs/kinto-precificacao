# Design System KINTO — NFMS Admin

**Documentação de identidade visual e componentes de interface**
KINTO Brasil · New Fleet Management System (NFMS Admin) · v1.0 · 20/08/2026

> **Origem.** Este design system nasce do portal **NFMS Admin** (template Alina v1.0.0 customizado com a identidade KINTO), com o sistema de cores extraído do site oficial `kintomobility.com.br` em 18/08/2026. É aplicado ao **Painel Analítico de Precificação de Seminovos** (chamado SDP #5211 — módulo *Pricing › Used Vehicles › Plate-by-Plate Pricing*). Fontes canônicas: `kbr-nfms-admin-portal-main/docs/assets/scss/app/_variables.scss` (tokens), `frontend/src/styles/tokens.css` (tokens do painel) e `design/adaptacao-kinto-painel.md` (spec de aplicação).

---

## 1. Princípios

1. **Consistência antes de criatividade** — se o portal de referência já tem um padrão para o problema, adote-o; desvios são propostos e registrados, nunca aplicados em silêncio.
2. **A decisão em primeiro plano** — em telas de precificação, o preço recomendado é a informação principal; todo o resto (faixas, comparáveis, confiança) é apoio visual.
3. **Nunca só cor** — toda informação transmitida por cor tem paridade em texto, ícone, traço ou posição (daltonismo e leitores de tela).
4. **Nulo não é zero** — dados ausentes ("Não avaliado") têm tratamento visual próprio (borda tracejada), jamais a aparência de uma categoria válida.
5. **Acessibilidade verificada, não presumida** — contraste AA calculado para cada par de cores usado como texto.

---

## 2. Identidade da marca

| Item | Regra |
|---|---|
| Nome do produto | **NFMS Admin** — usado em títulos, headers e texto corrente |
| Marca KINTO | Aparece **apenas** nos logos e no copyright ("KINTO Brasil") — nunca em texto corrente |
| Título de página | `<Tela> · <Módulo> \| NFMS Admin` (ex.: `Plate-by-Plate Pricing · Pricing \| NFMS Admin`) |
| Breadcrumb | `<Módulo> / <Submódulo> / <Tela>` — último item ativo em primary |
| Footer | `Copyright © 2026 KINTO Brasil · NFMS Admin. All rights reserved.` |
| Idiomas | Nomes de módulos/telas em **inglês** (padrão dos PSFs: Pricing, Used Vehicles, Residual Value…); conteúdo, labels e mensagens ao usuário em **pt-BR** |

**Logos** (em `docs/assets/images/logo/` do portal): wordmark KINTO azul (`1.png`, 735×181 — sidebar), emblem "swirl" (`3.png`, 48×48 — chip do topbar e cards), favicon (`favicon.png`, 32×32).

---

## 3. Sistema de cores

### 3.1 Cores de marca e neutras

| Token | Hex | RGB | Papel |
|---|---|---|---|
| `--primary` | **#00708D** | 0, 112, 141 | Cor de marca KINTO (teal) — ações, links, seleção, foco |
| `--kinto-primary-escuro` | #00384A | 0, 56, 74 | Fim do gradiente de marca; hover de botões primários |
| `--secondary` | #59646D | 89, 100, 109 | Cinza padrão — texto secundário, labels |
| `--dark` | #38434B | 56, 67, 75 | Cinza escuro — texto padrão, canal Wholesale |
| `--light` | #D4D7D9 | 212, 215, 217 | Bordas de inputs e divisórias |
| `--bodybg-color` | #EBF4F6 | — | Fundo da aplicação (tint claro do site) |
| `--light-gray` | #F4F7F8 | — | Fundo de thead e áreas neutras |
| `--font-color` | #38434B | — | Texto padrão |
| `--font-light-color` | #A0A0B0 | — | Texto terciário, placeholders |
| Superfície | #FFFFFF | — | Fundo de cards (branco sólido adotado; o template usa translúcido .65) |
| `--borda-suave` | rgba(89,100,109,.2) | — | Borda padrão de cards e headers |

### 3.2 Cores semânticas (nunca usar como cor de marca)

| Token | Hex | RGB | Papel |
|---|---|---|---|
| `--success` | #34B478 | 52, 180, 120 | Positivo — classes A/B, confiança alta |
| `--warning` | #FAAC50 | 250, 172, 80 | Atenção — classes C/D, confiança média, "Não avaliado" |
| `--danger` | #EF4444 | 239, 68, 68 | Negativo — classe E, confiança baixa, erros |
| `--info` | #0EA5E9 | 14, 165, 233 | Informativo (trocado do original Alina para não colidir com o primary) |

### 3.3 Tons derivados AA (para texto pequeno)

As cores semânticas puras **reprovam** no contraste WCAG AA como texto pequeno (success 2,64:1, warning 1,90:1, danger 3,76:1). Para texto sobre tints a 10% e sobre branco, usar os tons escurecidos de mesmo matiz:

| Token | Hex | Contraste sobre tint / branco |
|---|---|---|
| `--texto-aa-success` | #1D7A4F | 4,87:1 / 5,32:1 ✅ |
| `--texto-aa-warning` | #92600C | 5,06:1 / 5,38:1 ✅ |
| `--texto-aa-danger` | #C03030 | 4,96:1 / 5,67:1 ✅ |

Pares verificados: `#00708D` sobre branco **5,67:1** ✅ (passa até texto normal); `#38434B` 10,13:1 ✅; `#59646D` 6,05:1 ✅.

### 3.4 Gradientes de marca

| Token | Definição | Uso |
|---|---|---|
| `--primary-gradient` | `#00708D → #00384A` (horizontal) | Destaques de marca |
| `--theme-gradient-1` | `#00708D → #00384A` (135deg) | Tema padrão do portal |
| `--dark-color-gradient` | `#002D3A → #00708D` (vertical) | Rail/sidebar escuro |

### 3.5 Receita de tints

Tints são gerados por transparência sobre a cor plena: `rgba(var(--cor), 0.10)` para fundos de badge/chip; `.06` para hover de linha; `.12` para linha selecionada. Os tokens em triplet RGB (`--primary: 0, 112, 141`) existem para permitir essa receita.

---

## 4. Tipografia

| Item | Valor |
|---|---|
| Família | **Lexend Deca** (Google Fonts, `wght 100–900`), fallback `sans-serif` |
| Nota de marca | O site KINTO usa **ToyotaType** (fonte proprietária); a adoção no admin é decisão futura — trocar em `--theme-fonts` |
| Corpo | 14px · line-height 1.6 |
| Escala de títulos | h1 2.5rem · h2 2rem · h3 1.75rem · h4 1.25rem · h5 1.125rem · h6 1rem |
| Botões | 15px |
| Labels de formulário | 0.8rem, peso 600, cor secondary |
| Thead de tabela | 0.78rem, **uppercase**, letter-spacing .03em, cor secondary |
| Números | Sempre `font-variant-numeric: tabular-nums`; alinhados à direita em tabelas |

**Formatação pt-BR obrigatória**: moeda `R$ 124.700,00`, milhar com ponto (`38.000 km`), meses abreviados (`mai`, `jun`, `jul`, `ago`), via `Intl.NumberFormat('pt-BR')`.

---

## 5. Forma, elevação e movimento

| Token | Valor | Nota |
|---|---|---|
| `--app-border-radius` | **0.375rem** | Identidade KINTO: cantos quase retos (o site usa 0px; 0.375rem preserva usabilidade no admin). Vale para cards, inputs, botões e **badges** (nunca pill 999px) |
| `--box-shadow` | `0 .15625rem .625rem rgba(56,67,75,.10)` | Sombra padrão de cards |
| `--hover-shadow` | `0 .5rem 2rem #F4F7F8` | Elevação em hover |
| `--app-transition` | `all .3s ease` | Transição padrão |
| Foco visível | `outline: 2px solid #00708D; outline-offset: 2px` | Em todo elemento interativo |

---

## 6. Layout — shell NFMS

Estrutura de página do painel (shell simplificado, sem o rail completo de módulos):

```
body (#EBF4F6, Lexend Deca)
└── .app-wrapper
    ├── header fixo 65px           ← branco, borda inferior suave; emblem KINTO em
    │                                 chip 40×40 (raio 12px) + h4 "Módulo · <Tela>"
    ├── breadcrumb fixo (top 64px) ← "Pricing / Used Vehicles / Plate-by-Plate Pricing";
    │                                 separador "/" em secondary; ativo em primary
    ├── .app-content               ← padding-top 112px (compensa header+breadcrumb),
    │   └── container-fluid           padding-x 2.5rem, largura fluida (sem max-width)
    │       ├── KPI cards (3 col ≥ md, empilham < md)
    │       ├── gráficos executivos (2 col; gráfico largo em linha própria)
    │       ├── card de filtros
    │       └── card da tabela
    ├── offcanvas de detalhe (aside, z-index 1050)
    └── footer                     ← copyright KINTO Brasil
```

Tokens de layout: `--header-height: 65px` · `--breadcrumb-top: 64px` · `--conteudo-padding-x: 2.5rem` · rail de módulos (quando existir): `--semi-side-nav: 4rem` · sidebar completa: `--sidebar-width: 22rem`.

**Responsividade**: grids colapsam para 1 coluna abaixo de ~breakpoint md; **nunca** scroll horizontal de página — conteúdo largo (tabelas) rola dentro do próprio container; gráficos SVG fluidos (viewBox medido por ResizeObserver, modo compacto < 560px).

---

## 7. Componentes

### 7.1 Card (base de tudo)

Fundo branco · borda `1px solid rgba(89,100,109,.2)` · raio 0.375rem · sombra padrão · `margin-bottom 1rem`. Padding de header/body: `1.125rem 1.5rem` (card de tabela usa body com padding 0). Header com `h5` (1.125rem, peso 600) + parágrafo secundário opcional e borda inferior suave.

### 7.2 KPI card

`card-body` em flex space-between: à esquerda h4 (valor, 1.25rem) + rótulo muted; à direita chip circular 45×45 com fundo `rgba(cor,.1)` e ícone 22px na cor plena (decorativo, `aria-hidden`). Chips: primary, success, warning.

### 7.3 Formulários e botões

- Inputs/selects: borda `#D4D7D9`, raio 0.375rem, fundo branco, 14px; foco outline primary.
- Botão primário: fundo `#00708D`, texto branco, 15px; hover `#00384A`.
- Botão secundário: fundo branco, texto `#38434B`, borda `#D4D7D9`; hover `#F4F7F8`.
- Labels 0.8rem peso 600 secondary; validação com mensagens claras em pt-BR.

### 7.4 Tabela densa (dados operacionais)

- Células `0.4rem 1.25rem`, 14px, borda apenas horizontal (`#C5C4C3` suavizada).
- Thead `#F4F7F8`, uppercase 0.78rem secondary, sticky no topo.
- Números à direita com tabular-nums; a coluna de decisão (preço recomendado) em peso 600 `#38434B`.
- Hover `rgba(0,112,141,.06)`; seleção `rgba(0,112,141,.12)`.
- Primeira coluna (identificador/placa) em peso 600; ação de detalhe em primary com sublinhado só no hover.

### 7.5 Badges — mapeamento semântico fixo

Forma: padding `0.3em 0.9em`, peso 600, letter-spacing 0.5px, **raio 0.375rem**. Receita "text-light": fundo `rgba(cor,.10)` + texto no tom AA. O mapeamento é **idêntico em todas as telas**:

| Badge | Família | Estilo |
|---|---|---|
| Classe A | success | tint |
| Classe B | success | **outline** (distingue B de A na mesma família) |
| Classe C | warning | tint |
| Classe D | warning | **outline** |
| Classe E | danger | tint |
| **Não avaliado** | warning | tint + **borda tracejada** — nunca aparência de classe (nulo ≠ zero) |
| Confiança alta / média / baixa | success / warning / danger | tint |
| Canal Retail | primary (marca) | tint |
| Canal Wholesale | dark | tint |

### 7.6 Offcanvas de detalhe

Painel lateral fixo (z-index 1050, acima do header), cabeçalho 1.125rem peso 600, seções com divisórias suaves, botão fechar sem borda (hover `#F4F7F8`). O bloco de decisão (preço recomendado) em tint primary com o valor em `#00384A`.

### 7.7 Estados (sempre desenhados)

| Estado | Tratamento |
|---|---|
| Carregando | Card padrão com indicador; dados anteriores mantidos durante refetch (stale) |
| Vazio | Card com borda tracejada e mensagem |
| Erro | Tint danger + texto `--texto-aa-danger`, mensagem clara sem detalhe técnico |
| Atenção / baixa qualidade | Tint warning + texto `--texto-aa-warning` |

---

## 8. Visualização de dados

- **Forma segue o dado**: comparação de magnitudes → barras (nunca pizza); parte-do-todo → barra empilhada com respiro de 2px entre segmentos; série temporal → linhas.
- **Ênfase**: a série "assunto" em primary sólido; contexto em secondary **tracejado** — distinção por traço + rótulo direto no fim da linha, nunca só cor.
- **Cores dos gráficos = mapeamento dos badges** (§7.5): A/B success (B em variante clara + traço), C/D warning, E danger, Não avaliado tint warning tracejado, Retail primary, Wholesale dark. Sem paleta própria.
- **Eixos monetários**: partem de zero, ou o corte é **declarado visivelmente** (nota junto ao gráfico) quando a variação relevante ficaria ilegível.
- **Tendências**: variação do período com sinal explícito ("−1,7% no período mai–ago") em cor AA.
- **Barras**: ponta de dado arredondada 4px, base reta no eixo zero; valor rotulado na ponta.
- **Acessibilidade**: `role="img"` + `aria-label` com os números; tabela `sr-only` alternativa em cada gráfico; tooltips com alvo de hover maior que o marcador.
- **Responsivo**: SVG com largura medida (ResizeObserver), 1 unidade SVG = 1px CSS; modo compacto < 560px move rótulos do desenho para a legenda de tendências.

---

## 9. Acessibilidade — checklist

- Contraste AA calculado (não presumido) para todo par cor-de-texto/fundo; texto pequeno sobre tint usa os tons `--texto-aa-*`.
- Foco visível em todo elemento interativo (outline primary 2px).
- HTML semântico: labels em inputs, caption em tabelas, hierarquia de headings preservada, `aria-current` no breadcrumb, `aria-live` em contadores dinâmicos.
- Paridade sem cor em toda informação (texto, ícone, traço, posição).
- Alvos de toque adequados; navegação por teclado completa.
- Conteúdo oculto acessível (`.sr-only`) não pode afetar o layout (atenção a `display: table` — usar `display: block` na regra).

---

## 10. O que não fazer

- ❌ Usar `--info` ou cores semânticas como cor de marca (o primary é sempre #00708D).
- ❌ Badges/botões em pill (raio 999px) — o raio da identidade é 0.375rem.
- ❌ Transmitir classe, canal ou confiança apenas por cor.
- ❌ Tratar "Não avaliado" com aparência de classe válida, ou incluí-lo em médias.
- ❌ Gráfico de pizza para comparar magnitudes; eixo monetário cortado sem declarar.
- ❌ Texto pequeno em success/warning/danger puros (reprovam AA) — usar `--texto-aa-*`.
- ❌ "KINTO" em texto corrente da interface — a marca vive nos logos e no copyright.
- ❌ Inventar valores fora dos tokens; novas cores/fontes/raios são decisão de design registrada, não improviso local.

---

## Apêndice — tokens completos (CSS)

```css
:root {
  /* Cores base (triplets RGB para tints via rgba(var(--x), .10)) */
  --primary: 0, 112, 141;      /* #00708D — marca KINTO */
  --secondary: 89, 100, 109;   /* #59646D */
  --success: 52, 180, 120;     /* #34B478 */
  --warning: 250, 172, 80;     /* #FAAC50 */
  --danger: 239, 68, 68;       /* #EF4444 */
  --info: 14, 165, 233;        /* #0EA5E9 */
  --light: 212, 215, 217;      /* #D4D7D9 */
  --dark: 56, 67, 75;          /* #38434B */

  /* Superfícies e texto */
  --bodybg-color: #ebf4f6;
  --light-gray: #f4f7f8;
  --font-color: #38434b;
  --font-light-color: #a0a0b0;
  --borda-suave: rgba(89, 100, 109, 0.2);

  /* Gradientes */
  --primary-gradient: linear-gradient(to right, #00708d, #00384a);
  --theme-gradient-1: linear-gradient(135deg, #00708d 0%, #00384a 100%);
  --dark-color-gradient: linear-gradient(to bottom, #002d3a, #00708d);

  /* Tipografia */
  --theme-fonts: "Lexend Deca", sans-serif;
  --font-size: 14px;
  --h4-font-size: 1.25rem;
  --h5-font-size: 1.125rem;
  --btn-font-size: 15px;
  --p-line-height: 1.6;

  /* Forma e movimento */
  --app-border-radius: 0.375rem;
  --box-shadow: 0 0.15625rem 0.625rem 0 rgba(56, 67, 75, 0.10);
  --app-transition: all 0.3s ease;

  /* Layout */
  --header-height: 65px;
  --breadcrumb-top: 64px;
  --conteudo-padding-x: 2.5rem;

  /* Semântica de domínio */
  --classe-a: var(--success);   --classe-b: var(--success);
  --classe-c: var(--warning);   --classe-d: var(--warning);
  --classe-e: var(--danger);    --nao-avaliado: var(--warning);
  --confianca-alta: var(--success); --confianca-media: var(--warning);
  --confianca-baixa: var(--danger);
  --canal-retail: var(--primary);   --canal-wholesale: var(--dark);

  /* Derivados AA (texto pequeno sobre tint/branco) */
  --texto-aa-success: #1d7a4f;
  --texto-aa-warning: #92600c;
  --texto-aa-danger: #c03030;
}
```

---

*Documento gerado a partir das fontes canônicas do projeto em 20/08/2026. Alterações de identidade (fonte ToyotaType, novas cores, raio) são decisões do responsável pelo produto e devem ser registradas aqui e nos tokens.*
