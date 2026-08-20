// Tipos espelhando o contrato da API do backend (FastAPI mock, base :8000).
// Não inventar campos: manter 1:1 com o contrato.

export type Classe = 'A' | 'B' | 'C' | 'D' | 'E';
export type ClasseFiltro = Classe | 'NAO_AVALIADO';
export type Canal = 'Retail' | 'Wholesale';
export type NivelConfianca = 'alto' | 'medio' | 'baixo';
export type Impacto = 'positivo' | 'negativo' | 'neutro';

export interface Confianca {
  nivel: NivelConfianca;
  score: number;
}

export interface Faixa {
  minimo: number;
  maximo: number;
}

// GET /api/inventario
export interface InventarioItem {
  placa: string;
  marca: string;
  modelo: string;
  versao: string;
  ano: number;
  km: number;
  km_medio_anual: number;
  classe: Classe | null;
  classe_label: string;
  canal_sugerido: Canal | null;
  preco_recomendado: number;
  confianca: Confianca;
  alerta_qualidade_dados: boolean;
}

export interface InventarioResponse {
  items: InventarioItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface InventarioFiltros {
  placa?: string;
  modelo?: string;
  versao?: string;
  ano?: number;
  classe?: ClasseFiltro;
  canal?: Canal;
  page?: number;
  page_size?: number;
}

// GET /api/inventario/{placa}
export interface VeiculoDetalhe {
  placa: string;
  marca: string;
  modelo: string;
  versao: string;
  ano: number;
  km: number;
  km_medio_anual: number;
  cor: string;
  combustivel: string;
  avaria_valor: number | null;
  valor_fipe: number;
  data_entrada_estoque: string;
}

export interface Percentis {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface Matching {
  modelo: string;
  versao: string;
  nivel: string;
  regra: string;
}

export interface FatorExplicacao {
  fator: string;
  impacto: Impacto;
  descricao: string;
}

export interface Precificacao {
  preco_interno_estimado: number;
  referencia_externa_mercado: number;
  preco_recomendado: number;
  faixa_operacional: Faixa;
  faixa_conservadora: Faixa;
  percentis: Percentis;
  quantidade_comparaveis: number;
  confianca: Confianca;
  data_referencia_mercado: string;
  matching: Matching;
  motivos_baixa_confianca: string[];
  fatores_explicacao: FatorExplicacao[];
}

export interface Classificacao {
  classe: Classe | null;
  classe_label: string;
  canal_sugerido: string | null;
  regra_aplicada: string;
  excecao_possivel: boolean;
}

export interface AlertaQualidadeDados {
  ativo: boolean;
  motivos: string[];
}

export interface Comparavel {
  fonte: string;
  modelo_anuncio: string;
  versao_anuncio: string;
  ano: number;
  km: number;
  preco_anunciado: number;
  data_anuncio: string;
  nivel_matching: string;
  regra_matching: string;
}

export interface DetalheResponse {
  veiculo: VeiculoDetalhe;
  precificacao: Precificacao;
  classificacao: Classificacao;
  alerta_qualidade_dados: AlertaQualidadeDados;
  comparaveis: Comparavel[];
}

// GET /api/inventario/{placa}/historico
export interface EventoHistorico {
  data: string;
  evento: string;
  preco_recomendado: number;
  faixa_operacional: Faixa;
  faixa_conservadora: Faixa;
  confianca_nivel: NivelConfianca;
}

export interface HistoricoResponse {
  placa: string;
  eventos: EventoHistorico[];
}

// GET /api/filtros
export interface OpcaoClasse {
  valor: ClasseFiltro;
  label: string;
}

export interface FiltrosResponse {
  modelos: string[];
  versoes: string[];
  anos: number[];
  classes: OpcaoClasse[];
  canais: Canal[];
}

// Envelope de erro (400/404)
export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    details: ApiErrorDetail[];
  };
}
