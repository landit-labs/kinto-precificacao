import type { InventarioItem } from '../api/types';
import { labelConfianca } from './format';

// Exportação CSV client-side (RF-F6-A-10).
// Convenções para Excel pt-BR: separador ";", decimal com vírgula e BOM UTF-8.

const SEPARADOR = ';';
const BOM = '\uFEFF';

function escaparCampo(valor: string): string {
  if (valor.includes(SEPARADOR) || valor.includes('"') || valor.includes('\n')) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

/** Número com decimal vírgula, sem separador de milhar (parse correto no Excel BR). */
function numeroCsv(valor: number, casasDecimais = 2): string {
  return valor.toFixed(casasDecimais).replace('.', ',');
}

const CABECALHO = [
  'Placa',
  'Marca',
  'Modelo',
  'Versão',
  'Ano',
  'KM',
  'Classe',
  'Canal sugerido',
  'Preço recomendado (R$)',
  'Confiança',
  'Score de confiança',
  'Alerta de qualidade de dados',
];

function linhaCsv(item: InventarioItem): string[] {
  return [
    item.placa,
    item.marca,
    item.modelo,
    item.versao,
    String(item.ano),
    String(item.km),
    item.classe_label,
    item.canal_sugerido ?? 'Não definido',
    numeroCsv(item.preco_recomendado),
    labelConfianca(item.confianca.nivel),
    String(item.confianca.score),
    item.alerta_qualidade_dados ? 'Sim' : 'Não',
  ];
}

/** Gera o conteúdo CSV (exportado separadamente para facilitar testes). */
export function gerarCsvInventario(items: InventarioItem[]): string {
  const linhas = [CABECALHO, ...items.map(linhaCsv)];
  return linhas.map((linha) => linha.map(escaparCampo).join(SEPARADOR)).join('\r\n');
}

/** Dispara o download do CSV do inventário filtrado via Blob. */
export function exportarCsvInventario(items: InventarioItem[]): void {
  const conteudo = BOM + gerarCsvInventario(items);
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const data = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.href = url;
  link.download = `inventario-precificacao-${data}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
