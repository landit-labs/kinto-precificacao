/**
 * MOCK — histórico mensal Recomendado vs. FIPE (autorizado pelo usuário).
 *
 * A API atual (mock, porta 8010) não expõe valor FIPE agregado nem série
 * histórica do portfólio; estes valores são fictícios porém coerentes:
 * preço recomendado médio abaixo da FIPE média (típico de seminovos) e
 * depreciação mensal suave de poucos %.
 *
 * PENDÊNCIA registrada: no sistema real, FIPE e histórico virão da camada
 * Gold (a spec cita a FIPE como insumo do modelo — RF-F5 — e o campo
 * "Código FIPE" na visão unificada Gold). Substituir este módulo por dados
 * da API quando o endpoint existir; nenhuma mudança de backend foi feita.
 */

export interface PontoHistoricoFipe {
  /** Competência ISO (YYYY-MM). */
  mes: string;
  /** Mês abreviado pt-BR para o eixo. */
  label: string;
  /** Preço recomendado médio do portfólio no mês (R$). */
  precoRecomendadoMedio: number;
  /** Valor FIPE médio do portfólio no mês (R$). */
  fipeMedio: number;
}

/** Últimos 4 meses (mai–ago/2026, ano de referência do projeto). */
export const HISTORICO_FIPE_MOCK: PontoHistoricoFipe[] = [
  { mes: '2026-05', label: 'mai', precoRecomendadoMedio: 111_800, fipeMedio: 118_400 },
  { mes: '2026-06', label: 'jun', precoRecomendadoMedio: 111_100, fipeMedio: 117_500 },
  { mes: '2026-07', label: 'jul', precoRecomendadoMedio: 110_300, fipeMedio: 116_800 },
  { mes: '2026-08', label: 'ago', precoRecomendadoMedio: 109_900, fipeMedio: 115_900 },
];
