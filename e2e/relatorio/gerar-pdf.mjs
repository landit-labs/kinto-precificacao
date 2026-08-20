// Converte o relatório HTML em PDF usando o Chromium do Playwright.
// Uso: node gerar-pdf.mjs <entrada.html> <saida.pdf> [texto-do-rodape]
import { chromium } from '@playwright/test';
import * as path from 'node:path';

const [entrada, saida, rodapeArg] = process.argv.slice(2);
if (!entrada || !saida) {
  console.error('Uso: node gerar-pdf.mjs <entrada.html> <saida.pdf> [texto-do-rodape]');
  process.exit(1);
}
const rodape =
  rodapeArg ?? 'SDP #5211 · Verificação de segurança automatizada (ambiente mock local)';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('file://' + path.resolve(entrada), { waitUntil: 'networkidle' });
await page.pdf({
  path: path.resolve(saida),
  format: 'A4',
  printBackground: true,
  margin: { top: '14mm', bottom: '16mm', left: '14mm', right: '14mm' },
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate:
    '<div style="font-size:8px;color:#7c8a93;width:100%;text-align:center;font-family:Helvetica,Arial,sans-serif;">' +
    rodape +
    ' · página <span class="pageNumber"></span>/<span class="totalPages"></span></div>',
});
await browser.close();
console.log('PDF gerado em ' + path.resolve(saida));
