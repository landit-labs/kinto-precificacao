import { expect, test, type Page } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Jornadas principais do painel de precificação (RF-F6-A-01..11), em Chromium
 * headed com slowMo de 3s por ação para acompanhamento visual.
 *
 * Independência e idempotência: a aplicação é somente leitura (mock, sem
 * mutação de estado no servidor). Cada teste abre a página do zero e não
 * depende de estado deixado por outro teste; não há dados a criar ou limpar.
 */

const EVIDENCIAS = path.resolve(__dirname, '..', 'evidencias');

/**
 * Converte moeda pt-BR renderizada ("R$ 124.700,00", com espaço normal ou
 * NBSP) em número. Falha explícita se o texto não for uma moeda válida.
 */
function moedaParaNumero(texto: string): number {
  const limpo = texto
    .replace(/ /g, ' ')
    .replace(/R\$\s*/g, '')
    .trim()
    .replace(/\./g, '')
    .replace(',', '.');
  const valor = Number(limpo);
  if (!Number.isFinite(valor)) {
    throw new Error(`Valor monetário ilegível na tela: "${texto}"`);
  }
  return valor;
}

/** Faixa "R$ a – R$ b" renderizada → [min, max]. */
function faixaParaNumeros(texto: string): [number, number] {
  const partes = texto.split('–');
  if (partes.length !== 2) {
    throw new Error(`Faixa ilegível na tela: "${texto}"`);
  }
  return [moedaParaNumero(partes[0]), moedaParaNumero(partes[1])];
}

/** Coleta erros de console e falhas de página para verificação de segurança/saúde. */
function monitorarConsole(page: Page): { erros: string[] } {
  const erros: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') erros.push(msg.text());
  });
  page.on('pageerror', (err) => erros.push(`pageerror: ${err.message}`));
  return { erros };
}

async function abrirPainel(page: Page) {
  await page.goto('/');
  // Painel carregado = KPIs visíveis (dependem da resposta da API).
  await expect(page.getByText('Veículos no inventário')).toBeVisible();
}

test.beforeAll(() => {
  fs.mkdirSync(EVIDENCIAS, { recursive: true });
});

test.describe('Jornada A — Visão executiva do painel', () => {
  test('carrega KPIs, gráficos executivos e Recomendado vs. FIPE', async ({ page }) => {
    const consoleMon = monitorarConsole(page);
    await abrirPainel(page);

    // KPIs (RF-F6-A-01) — rótulos exatos dos cartões
    const rotuloKpi = (texto: string) =>
      page.getByRole('paragraph').filter({ hasText: new RegExp(`^${texto}$`) });
    await expect(rotuloKpi('Veículos no inventário')).toBeVisible();
    await expect(rotuloKpi('Preço recomendado médio')).toBeVisible();
    await expect(rotuloKpi('Com alerta ou não avaliados')).toBeVisible();

    // Gráficos executivos
    const visaoExecutiva = page.getByRole('region', { name: 'Visão executiva do portfólio' });
    await expect(visaoExecutiva).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Recomendado vs. FIPE — últimos 4 meses' })
    ).toBeVisible();

    // Tabela de inventário presente com dados
    await expect(page.getByRole('region', { name: 'Inventário de veículos' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Ver detalhes do veículo de placa/ }).first())
      .toBeVisible();

    await page.screenshot({
      path: path.join(EVIDENCIAS, 'jornada-a-painel.png'),
      fullPage: true,
    });
    expect(consoleMon.erros, `Erros de console: ${consoleMon.erros.join(' | ')}`).toEqual([]);
  });
});

test.describe('Jornada B — Busca por placa e detalhe do veículo', () => {
  test('busca parcial "BRA" e abre o offcanvas com precificação e comparáveis', async ({ page }) => {
    const consoleMon = monitorarConsole(page);
    await abrirPainel(page);

    // Busca por placa parcial (RF-F6-A-02)
    await page.getByLabel('Pesquisar por placa').fill('BRA');
    const botaoDetalhe = page.getByRole('button', {
      name: 'Ver detalhes do veículo de placa BRA2E19',
    });
    await expect(botaoDetalhe).toBeVisible();
    await botaoDetalhe.click();

    // Offcanvas de detalhe (RF-F6-A-04..09, RF-F6-A-11)
    const painel = page.getByRole('dialog', { name: 'Detalhes do veículo BRA2E19' });
    await expect(painel).toBeVisible();
    await expect(painel.getByRole('heading', { name: 'Precificação' })).toBeVisible();
    await expect(painel.getByRole('heading', { name: 'Percentis de mercado' })).toBeVisible();
    await expect(painel.getByRole('heading', { name: /Comparáveis/ })).toBeVisible();
    await expect(painel.getByRole('heading', { name: 'Classificação e canal' })).toBeVisible();
    await expect(
      painel.getByRole('heading', { name: 'Histórico de preços e atualizações' })
    ).toBeVisible();

    await page.screenshot({
      path: path.join(EVIDENCIAS, 'jornada-b-detalhe.png'),
      fullPage: false,
    });

    // Fecha o painel e confirma que fechou
    await painel.getByRole('button', { name: 'Fechar painel de detalhes' }).click();
    await expect(painel).toBeHidden();

    expect(consoleMon.erros, `Erros de console: ${consoleMon.erros.join(' | ')}`).toEqual([]);
  });
});

test.describe('Jornada C — Filtro por classe "Não avaliado" (avaria nula)', () => {
  test('XLM8E67 aparece como Não avaliado — nunca como Classe A', async ({ page }) => {
    const consoleMon = monitorarConsole(page);
    await abrirPainel(page);

    await page.getByLabel('Classe', { exact: true }).selectOption('NAO_AVALIADO');

    // Regra da spec: avaria nula não é zero — o veículo não pode aparecer como Classe A.
    const linha = page.getByRole('row').filter({ hasText: 'XLM8E67' });
    await expect(linha).toHaveCount(1);
    await expect(linha.getByText('Não avaliado')).toBeVisible();
    await expect(linha.getByText('Classe A', { exact: true })).toHaveCount(0);

    await page.screenshot({
      path: path.join(EVIDENCIAS, 'jornada-c-nao-avaliado.png'),
      fullPage: true,
    });
    expect(consoleMon.erros, `Erros de console: ${consoleMon.erros.join(' | ')}`).toEqual([]);
  });
});

test.describe('Jornada D — Exportação CSV', () => {
  test('exporta o inventário filtrado para CSV com cabeçalho e dados', async ({ page }) => {
    const consoleMon = monitorarConsole(page);
    await abrirPainel(page);

    const esperaDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar CSV' }).click();
    const download = await esperaDownload;

    expect(download.suggestedFilename()).toMatch(/^inventario-precificacao-\d{4}-\d{2}-\d{2}\.csv$/);
    const arquivo = path.join(EVIDENCIAS, download.suggestedFilename());
    await download.saveAs(arquivo);
    const conteudo = fs.readFileSync(arquivo, 'utf-8');
    expect(conteudo).toContain('Placa;Marca;Modelo');
    expect(conteudo).toContain('BRA2E19');

    await page.screenshot({
      path: path.join(EVIDENCIAS, 'jornada-d-export-csv.png'),
      fullPage: false,
    });
    expect(consoleMon.erros, `Erros de console: ${consoleMon.erros.join(' | ')}`).toEqual([]);
  });
});

test.describe('Jornada E — Invariantes numéricas do detalhe (RF-F6-A-04/05/07)', () => {
  test('BRA2E19: percentis ordenados, recomendado na faixa operacional, conservadora contida', async ({
    page,
  }) => {
    const consoleMon = monitorarConsole(page);
    await abrirPainel(page);

    await page
      .getByRole('button', { name: 'Ver detalhes do veículo de placa BRA2E19' })
      .click();
    const painel = page.getByRole('dialog', { name: 'Detalhes do veículo BRA2E19' });
    await expect(painel).toBeVisible();

    // Percentis renderizados (tabela acessível com caption própria)
    const tabelaPercentis = painel.getByRole('table', {
      name: 'Percentis de preço dos comparáveis de mercado',
    });
    await expect(tabelaPercentis).toBeVisible();
    const celulas = await tabelaPercentis
      .getByRole('row')
      .last()
      .getByRole('cell')
      .allTextContents();
    expect(celulas, 'a tabela de percentis deve ter 5 valores (P10..P90)').toHaveLength(5);
    const [p10, p25, p50, p75, p90] = celulas.map(moedaParaNumero);

    // Invariante da spec: mín ≤ P25 ≤ mediana ≤ P75 ≤ máx (aqui P10/P90 como extremos exibidos)
    expect(p10, 'P10 deve ser ≤ P25').toBeLessThanOrEqual(p25);
    expect(p25, 'P25 deve ser ≤ mediana (P50)').toBeLessThanOrEqual(p50);
    expect(p50, 'mediana (P50) deve ser ≤ P75').toBeLessThanOrEqual(p75);
    expect(p75, 'P75 deve ser ≤ P90').toBeLessThanOrEqual(p90);

    // Preço recomendado e faixas (lidos da tela, não da API)
    const recomendado = moedaParaNumero(
      (await painel.locator('.preco-recomendado-valor').textContent()) ?? ''
    );
    const lerFaixa = async (rotulo: string): Promise<[number, number]> => {
      const dd = painel
        .locator('dl > div')
        .filter({ has: page.getByText(rotulo, { exact: true }) })
        .locator('dd');
      return faixaParaNumeros((await dd.textContent()) ?? '');
    };
    const [opMin, opMax] = await lerFaixa('Faixa operacional');
    const [consMin, consMax] = await lerFaixa('Faixa conservadora');

    expect(opMin, 'faixa operacional deve ser válida (mín ≤ máx)').toBeLessThanOrEqual(opMax);
    expect(consMin, 'faixa conservadora deve ser válida (mín ≤ máx)').toBeLessThanOrEqual(consMax);
    expect(recomendado, 'recomendado deve respeitar o mínimo operacional').toBeGreaterThanOrEqual(opMin);
    expect(recomendado, 'recomendado deve respeitar o máximo operacional').toBeLessThanOrEqual(opMax);
    expect(consMin, 'conservadora deve começar dentro da operacional').toBeGreaterThanOrEqual(opMin);
    expect(consMax, 'conservadora deve terminar dentro da operacional').toBeLessThanOrEqual(opMax);

    await page.screenshot({
      path: path.join(EVIDENCIAS, 'jornada-e-invariantes.png'),
      fullPage: false,
    });
    expect(consoleMon.erros, `Erros de console: ${consoleMon.erros.join(' | ')}`).toEqual([]);
  });
});

test.describe('Jornada F — Coerência classe ↔ canal na tabela (RF-F5-RS)', () => {
  test('A/B → Retail, C/D/E → Wholesale, Não avaliado → sem canal, em todas as linhas', async ({
    page,
  }) => {
    const consoleMon = monitorarConsole(page);
    await abrirPainel(page);

    const tabela = page.getByRole('table', {
      name: 'Inventário de veículos seminovos com classe, canal e preço recomendado',
    });
    await expect(tabela).toBeVisible();
    const linhas = tabela.locator('tbody').getByRole('row');
    const totalLinhas = await linhas.count();
    expect(totalLinhas, 'inventário deve ter linhas para validar').toBeGreaterThan(0);

    for (let i = 0; i < totalLinhas; i++) {
      const celulas = await linhas.nth(i).getByRole('cell').allTextContents();
      const [placa, , , , , classe, canal] = celulas.map((c) => c.trim());
      if (classe === 'Classe A' || classe === 'Classe B') {
        expect(canal, `${placa} (${classe}) deveria sugerir Retail`).toBe('Retail');
      } else if (classe === 'Classe C' || classe === 'Classe D' || classe === 'Classe E') {
        expect(canal, `${placa} (${classe}) deveria sugerir Wholesale`).toBe('Wholesale');
      } else if (classe === 'Não avaliado') {
        expect(canal, `${placa} (Não avaliado) não pode ter canal sugerido`).toBe('Não definido');
      } else {
        throw new Error(`Linha ${placa}: classe inesperada na tela: "${classe}"`);
      }
    }

    await page.screenshot({
      path: path.join(EVIDENCIAS, 'jornada-f-classe-canal.png'),
      fullPage: true,
    });
    expect(consoleMon.erros, `Erros de console: ${consoleMon.erros.join(' | ')}`).toEqual([]);
  });
});

test.describe('Jornada G — Responsividade em 375 px (RNF de usabilidade)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('sem scroll horizontal e gráfico FIPE em modo compacto', async ({ page }) => {
    const consoleMon = monitorarConsole(page);
    await abrirPainel(page);

    // O gráfico FIPE precisa estar renderizado antes das medições
    const cardFipe = page
      .locator('.grafico-card-largo')
      .filter({ has: page.getByRole('heading', { name: 'Recomendado vs. FIPE — últimos 4 meses' }) });
    await expect(cardFipe).toBeVisible();
    await expect(cardFipe.locator('svg.grafico-linhas')).toBeVisible();

    // 1) Página sem scroll horizontal no viewport de 375 px
    const excesso = await page.evaluate(() => {
      const html = document.documentElement;
      return html.scrollWidth - html.clientWidth;
    });
    expect(excesso, 'a página não pode ter scroll horizontal em 375 px').toBeLessThanOrEqual(0);

    // 2) Modo compacto: rótulos diretos de fim de linha fora do SVG;
    //    identidade das séries preservada nas linhas de tendência abaixo.
    await expect(
      cardFipe.locator('svg.grafico-linhas text').filter({ hasText: 'FIPE média' })
    ).toHaveCount(0);
    await expect(
      cardFipe.locator('svg.grafico-linhas text').filter({ hasText: 'Recomendado' })
    ).toHaveCount(0);
    await expect(
      cardFipe.locator('.grafico-tendencias').getByText('Preço recomendado médio')
    ).toBeVisible();
    await expect(
      cardFipe.locator('.grafico-tendencias').getByText('FIPE média')
    ).toBeVisible();

    // 3) A tabela larga rola dentro do próprio container, não na página
    await expect(page.locator('.tabela-container')).toBeVisible();

    await page.screenshot({
      path: path.join(EVIDENCIAS, 'jornada-g-responsivo-375.png'),
      fullPage: true,
    });
    expect(consoleMon.erros, `Erros de console: ${consoleMon.erros.join(' | ')}`).toEqual([]);
  });
});
