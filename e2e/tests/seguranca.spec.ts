import { expect, test } from '@playwright/test';

/**
 * Verificações de segurança (escopo defensivo, aplicação própria em ambiente
 * local mockado): XSS refletido/DOM nos inputs, validação de entrada da API,
 * envelope de erro sem vazamento interno, path traversal básico, CORS e
 * cabeçalhos do dev server.
 *
 * Independência: testes somente leitura contra app mock; nenhum estado a limpar.
 */

const API = 'http://localhost:8010';
const APP = 'http://localhost:5173';

const PAYLOADS_XSS = [
  `<script>window.__xss=1</script>`,
  `"><img src=x onerror=window.__xss=1>`,
  `'";alert(String.fromCharCode(88,83,83))//`,
];

test.describe('XSS nos inputs do painel', () => {
  test('payloads na busca por placa não executam nem injetam DOM', async ({ page }) => {
    let dialogAbriu = false;
    page.on('dialog', async (d) => {
      dialogAbriu = true;
      await d.dismiss();
    });

    await page.goto(APP);
    await expect(page.getByText('Veículos no inventário')).toBeVisible();
    const busca = page.getByLabel('Pesquisar por placa');

    for (const payload of PAYLOADS_XSS) {
      await busca.fill(payload);
      // Aguarda o ciclo busca -> resposta (o input dispara request por mudança).
      await page.waitForTimeout(800);

      // Nada executou nem foi injetado no DOM.
      const xssGlobal = await page.evaluate(() => (window as never as { __xss?: number }).__xss);
      expect(xssGlobal, `window.__xss setado pelo payload ${payload}`).toBeUndefined();
      const imgInjetada = await page.locator('img[src="x"]').count();
      expect(imgInjetada, `img onerror injetada pelo payload ${payload}`).toBe(0);
      const scriptInjetado = await page
        .locator('script')
        .filter({ hasText: '__xss' })
        .count();
      expect(scriptInjetado, `script injetado pelo payload ${payload}`).toBe(0);
    }
    expect(dialogAbriu, 'alert() disparou — XSS executável').toBe(false);
  });
});

test.describe('API — validação de entrada e envelope de erro', () => {
  test('placa acima de 7 caracteres (payload XSS) → 422 com envelope padronizado', async ({ request }) => {
    const resp = await request.get(`${API}/api/inventario`, {
      params: { placa: `<script>alert(1)</script>` },
    });
    expect([400, 422]).toContain(resp.status());
    const corpo = await resp.json();
    expect(corpo).toHaveProperty('error.code');
    expect(corpo).toHaveProperty('error.message');
    const texto = JSON.stringify(corpo);
    expect(texto).not.toMatch(/Traceback|File "|\.py|sqlalchemy|pydantic\.error_wrappers/i);
  });

  test('parâmetros malformados (ano não numérico, classe inválida, page negativa) → 422', async ({ request }) => {
    const casos = [
      { ano: 'DROP TABLE veiculos' },
      { classe: "A' OR '1'='1" },
      { page: '-1' },
      { page_size: '99999' },
    ];
    for (const params of casos) {
      const resp = await request.get(`${API}/api/inventario`, { params });
      expect([400, 422], `params: ${JSON.stringify(params)}`).toContain(resp.status());
      const corpo = await resp.json();
      expect(corpo, `params: ${JSON.stringify(params)}`).toHaveProperty('error.code');
      const texto = JSON.stringify(corpo);
      expect(texto).not.toMatch(/Traceback|File "|\.py"|Internal Server Error/i);
    }
  });

  test('path traversal na rota de placa → 404/422 no envelope, sem vazamento', async ({ request }) => {
    const alvos = [
      `${API}/api/inventario/..%2F..%2Fetc%2Fpasswd`,
      `${API}/api/inventario/../../etc/passwd`,
      `${API}/api/inventario/%2e%2e%2f%2e%2e%2fapp%2Fmain.py`,
    ];
    for (const url of alvos) {
      const resp = await request.get(url);
      expect([404, 422]).toContain(resp.status());
      const texto = await resp.text();
      expect(texto).not.toContain('root:');
      expect(texto).not.toMatch(/Traceback|FastAPI|uvicorn.*error/i);
      // Envelope padronizado (api-land)
      const corpo = JSON.parse(texto);
      expect(corpo).toHaveProperty('error.code');
    }
  });

  test('placa inexistente → 404 com envelope, sem detalhe interno', async ({ request }) => {
    const resp = await request.get(`${API}/api/inventario/ZZZ9Z99`);
    expect(resp.status()).toBe(404);
    const corpo = await resp.json();
    expect(corpo).toHaveProperty('error.code');
    expect(corpo).toHaveProperty('error.message');
  });

  test('resposta do inventário sem campos inesperados/sensíveis', async ({ request }) => {
    const resp = await request.get(`${API}/api/inventario?page_size=5`);
    expect(resp.status()).toBe(200);
    const corpo = await resp.json();
    const chavesTopo = Object.keys(corpo).sort();
    expect(chavesTopo).toEqual(['items', 'page', 'page_size', 'total']);
    const chavesItem = Object.keys(corpo.items[0]).sort();
    expect(chavesItem).toEqual(
      [
        'placa',
        'marca',
        'modelo',
        'versao',
        'ano',
        'km',
        'km_medio_anual',
        'classe',
        'classe_label',
        'canal_sugerido',
        'preco_recomendado',
        'confianca',
        'alerta_qualidade_dados',
      ].sort()
    );
  });
});

test.describe('CORS e cabeçalhos', () => {
  test('CORS permite apenas a origem do painel', async ({ request }) => {
    const permitida = await request.get(`${API}/api/filtros`, {
      headers: { Origin: 'http://localhost:5173' },
    });
    expect(permitida.headers()['access-control-allow-origin']).toBe('http://localhost:5173');

    const negada = await request.get(`${API}/api/filtros`, {
      headers: { Origin: 'https://malicioso.example.com' },
    });
    expect(negada.headers()['access-control-allow-origin']).toBeUndefined();

    // Preflight de origem não permitida não pode ser autorizado
    const preflight = await request.fetch(`${API}/api/inventario`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://malicioso.example.com',
        'Access-Control-Request-Method': 'GET',
      },
    });
    expect(preflight.headers()['access-control-allow-origin']).toBeUndefined();
  });

  test('registra cabeçalhos de segurança do dev server e da API (informativo)', async ({ request }) => {
    const front = await request.get(APP);
    const api = await request.get(`${API}/api/filtros`);
    const interesse = [
      'content-security-policy',
      'x-content-type-options',
      'x-frame-options',
      'strict-transport-security',
      'referrer-policy',
      'server',
      'x-powered-by',
    ];
    const registro: Record<string, Record<string, string | undefined>> = { front: {}, api: {} };
    for (const h of interesse) {
      registro.front[h] = front.headers()[h];
      registro.api[h] = api.headers()[h];
    }
    // Registro para o relatório (dev server não representa produção).
    console.log('HEADERS_REGISTRO ' + JSON.stringify(registro));
    // Nenhuma exposição de tecnologia via X-Powered-By.
    expect(front.headers()['x-powered-by']).toBeUndefined();
    expect(api.headers()['x-powered-by']).toBeUndefined();
  });
});
