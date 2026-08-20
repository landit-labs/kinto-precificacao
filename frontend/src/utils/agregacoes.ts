import type { Canal, Classe, InventarioItem } from '../api/types';

/**
 * Agregações do inventário para a visão executiva (derivadas no frontend a
 * partir dos itens já carregados — nenhuma chamada nova de API).
 *
 * Regra da spec respeitada em todas as funções: classe/avaria NULA NÃO É ZERO.
 * Veículo sem classe entra na categoria própria "Não avaliado" (classe: null),
 * nunca somado a uma classe A–E; canal nulo idem ("Não definido").
 */

export interface ContagemClasse {
  /** Classe A–E; null = "Não avaliado" (categoria própria, nunca uma classe). */
  classe: Classe | null;
  label: string;
  quantidade: number;
}

export interface ValorCanal {
  /** Canal sugerido; null = "Não definido" (categoria própria). */
  canal: Canal | null;
  label: string;
  quantidade: number;
  /** Soma de preco_recomendado dos veículos do canal. */
  valorTotal: number;
}

/** Ordem fixa de exibição: A→E e "Não avaliado" sempre por último. */
const ORDEM_CLASSES: { classe: Classe | null; label: string }[] = [
  { classe: 'A', label: 'Classe A' },
  { classe: 'B', label: 'Classe B' },
  { classe: 'C', label: 'Classe C' },
  { classe: 'D', label: 'Classe D' },
  { classe: 'E', label: 'Classe E' },
  { classe: null, label: 'Não avaliado' },
];

/** Ordem fixa de exibição: Retail, Wholesale e "Não definido" por último. */
const ORDEM_CANAIS: { canal: Canal | null; label: string }[] = [
  { canal: 'Retail', label: 'Retail' },
  { canal: 'Wholesale', label: 'Wholesale' },
  { canal: null, label: 'Não definido' },
];

/**
 * Conta veículos por classe comercial, sempre nas 6 categorias em ordem fixa
 * (classes sem veículo aparecem com quantidade 0 — escala estável no gráfico).
 *
 * Invariante: a soma das quantidades é exatamente items.length.
 */
export function contarPorClasse(items: InventarioItem[]): ContagemClasse[] {
  return ORDEM_CLASSES.map(({ classe, label }) => ({
    classe,
    label,
    quantidade: items.filter((item) => item.classe === classe).length,
  }));
}

/**
 * Soma o preço recomendado por canal sugerido, sempre nas 3 categorias em
 * ordem fixa (canal nulo = "Não definido", nunca somado a Retail/Wholesale).
 *
 * Invariantes: a soma das quantidades é items.length e a soma de valorTotal
 * é a soma de preco_recomendado de todos os itens.
 */
/**
 * Variação percentual entre o primeiro e o último valor de uma série.
 *
 * Denominador explícito: o PRIMEIRO valor da série. Devolve null (não zero)
 * quando a variação é incalculável — série vazia, ponto único ou base zero —,
 * para o chamador exibir "indisponível" em vez de um falso 0%.
 */
export function variacaoPercentualPeriodo(valores: number[]): number | null {
  if (valores.length < 2) return null;
  const primeiro = valores[0];
  const ultimo = valores[valores.length - 1];
  if (primeiro === 0) return null;
  return ((ultimo - primeiro) / primeiro) * 100;
}

export function somarValorPorCanal(items: InventarioItem[]): ValorCanal[] {
  return ORDEM_CANAIS.map(({ canal, label }) => {
    const doCanal = items.filter((item) => item.canal_sugerido === canal);
    return {
      canal,
      label,
      quantidade: doCanal.length,
      valorTotal: doCanal.reduce((soma, item) => soma + item.preco_recomendado, 0),
    };
  });
}
