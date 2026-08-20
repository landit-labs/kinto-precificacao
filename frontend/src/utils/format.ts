const moedaBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numeroBR = new Intl.NumberFormat('pt-BR');

/** Formata dinheiro em R$ pt-BR (ex.: R$ 124.700,00). */
export function formatarMoeda(valor: number): string {
  return moedaBRL.format(valor);
}

const moedaBRLInteira = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

/** Moeda sem centavos, para eixos e rótulos compactos (ex.: R$ 116.000). */
export function formatarMoedaInteira(valor: number): string {
  return moedaBRLInteira.format(valor);
}

/** Formata número inteiro/decimal no padrão pt-BR (ex.: 38.000). */
export function formatarNumero(valor: number): string {
  return numeroBR.format(valor);
}

/** Formata quilometragem (ex.: 38.000 km). */
export function formatarKm(km: number): string {
  return `${numeroBR.format(km)} km`;
}

/** Converte data ISO "YYYY-MM-DD" em "dd/mm/aaaa" sem risco de fuso horário. */
export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}

/** Faixa de valores em moeda (ex.: R$ 120.000,00 – R$ 130.000,00). */
export function formatarFaixa(minimo: number, maximo: number): string {
  return `${moedaBRL.format(minimo)} – ${moedaBRL.format(maximo)}`;
}

const labelsConfianca: Record<string, string> = {
  alto: 'Alta',
  medio: 'Média',
  baixo: 'Baixa',
};

/** Label pt-BR do nível de confiança ("alto" -> "Alta"). */
export function labelConfianca(nivel: string): string {
  return labelsConfianca[nivel] ?? nivel;
}
