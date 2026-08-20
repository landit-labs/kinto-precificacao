import { describe, expect, it } from 'vitest';
import type { InventarioItem } from '../api/types';
import { contarPorClasse, somarValorPorCanal, variacaoPercentualPeriodo } from './agregacoes';

/** Item mínimo válido do contrato; sobrescreva só o que o caso testa. */
function item(parcial: Partial<InventarioItem>): InventarioItem {
  return {
    placa: 'ABC1D23',
    marca: 'Toyota',
    modelo: 'Corolla',
    versao: 'XEi 2.0',
    ano: 2022,
    km: 38000,
    km_medio_anual: 12000,
    classe: 'A',
    classe_label: 'A',
    canal_sugerido: 'Retail',
    preco_recomendado: 100_000,
    confianca: { nivel: 'alto', score: 90 },
    alerta_qualidade_dados: false,
    ...parcial,
  };
}

describe('contarPorClasse', () => {
  it('lista vazia: devolve as 6 categorias em ordem fixa, todas com quantidade 0', () => {
    const resultado = contarPorClasse([]);
    expect(resultado.map((r) => r.classe)).toEqual(['A', 'B', 'C', 'D', 'E', null]);
    expect(resultado.map((r) => r.label)).toEqual([
      'Classe A',
      'Classe B',
      'Classe C',
      'Classe D',
      'Classe E',
      'Não avaliado',
    ]);
    expect(resultado.every((r) => r.quantidade === 0)).toBe(true);
  });

  it('classe nula não é zero nem classe A: vai para "Não avaliado", categoria própria', () => {
    const resultado = contarPorClasse([
      item({ classe: null, classe_label: 'Não avaliado' }),
      item({ classe: 'A' }),
    ]);
    const porClasse = new Map(resultado.map((r) => [r.classe, r.quantidade]));
    expect(porClasse.get(null)).toBe(1);
    expect(porClasse.get('A')).toBe(1);
  });

  it('invariante: soma das quantidades é exatamente o total de itens', () => {
    const items = [
      item({ classe: 'A' }),
      item({ classe: 'B' }),
      item({ classe: 'B' }),
      item({ classe: 'E' }),
      item({ classe: null }),
    ];
    const resultado = contarPorClasse(items);
    const soma = resultado.reduce((acc, r) => acc + r.quantidade, 0);
    expect(soma).toBe(items.length);
  });

  it('classe sem veículo aparece com 0 (nunca omitida do resultado)', () => {
    const resultado = contarPorClasse([item({ classe: 'C' })]);
    expect(resultado).toHaveLength(6);
    expect(resultado.find((r) => r.classe === 'D')?.quantidade).toBe(0);
  });
});

describe('somarValorPorCanal', () => {
  it('lista vazia: devolve as 3 categorias em ordem fixa, com 0 veículos e R$ 0', () => {
    const resultado = somarValorPorCanal([]);
    expect(resultado.map((r) => r.canal)).toEqual(['Retail', 'Wholesale', null]);
    expect(resultado.map((r) => r.label)).toEqual(['Retail', 'Wholesale', 'Não definido']);
    expect(resultado.every((r) => r.quantidade === 0 && r.valorTotal === 0)).toBe(true);
  });

  it('canal nulo vai para "Não definido", nunca somado a Retail/Wholesale', () => {
    const resultado = somarValorPorCanal([
      item({ canal_sugerido: null, preco_recomendado: 50_000 }),
      item({ canal_sugerido: 'Retail', preco_recomendado: 100_000 }),
    ]);
    const porCanal = new Map(resultado.map((r) => [r.canal, r]));
    expect(porCanal.get(null)?.quantidade).toBe(1);
    expect(porCanal.get(null)?.valorTotal).toBe(50_000);
    expect(porCanal.get('Retail')?.valorTotal).toBe(100_000);
    expect(porCanal.get('Wholesale')?.valorTotal).toBe(0);
  });

  it('invariantes: somas de quantidade e de valor batem com os itens de entrada', () => {
    const items = [
      item({ canal_sugerido: 'Retail', preco_recomendado: 120_500.5 }),
      item({ canal_sugerido: 'Retail', preco_recomendado: 80_000 }),
      item({ canal_sugerido: 'Wholesale', preco_recomendado: 60_499.5 }),
      item({ canal_sugerido: null, preco_recomendado: 40_000 }),
    ];
    const resultado = somarValorPorCanal(items);
    const somaQtd = resultado.reduce((acc, r) => acc + r.quantidade, 0);
    const somaValor = resultado.reduce((acc, r) => acc + r.valorTotal, 0);
    const valorEsperado = items.reduce((acc, i) => acc + i.preco_recomendado, 0);
    expect(somaQtd).toBe(items.length);
    expect(somaValor).toBeCloseTo(valorEsperado, 6);
  });

  it('um único veículo: canal dele concentra 100% do valor', () => {
    const resultado = somarValorPorCanal([
      item({ canal_sugerido: 'Wholesale', preco_recomendado: 75_000 }),
    ]);
    expect(resultado.find((r) => r.canal === 'Wholesale')?.valorTotal).toBe(75_000);
    expect(resultado.find((r) => r.canal === 'Retail')?.valorTotal).toBe(0);
  });
});

describe('variacaoPercentualPeriodo', () => {
  it('série vazia ou ponto único: incalculável devolve null, nunca 0', () => {
    expect(variacaoPercentualPeriodo([])).toBeNull();
    expect(variacaoPercentualPeriodo([100_000])).toBeNull();
  });

  it('base zero: denominador inválido devolve null (não Infinity nem 0)', () => {
    expect(variacaoPercentualPeriodo([0, 50_000])).toBeNull();
  });

  it('queda: sinal negativo com denominador no primeiro valor', () => {
    expect(variacaoPercentualPeriodo([100_000, 99_000, 98_000])).toBeCloseTo(-2, 6);
  });

  it('alta: sinal positivo', () => {
    expect(variacaoPercentualPeriodo([100_000, 103_000])).toBeCloseTo(3, 6);
  });

  it('série estável: variação 0 (calculável, diferente de null)', () => {
    expect(variacaoPercentualPeriodo([100_000, 100_000])).toBe(0);
  });
});
