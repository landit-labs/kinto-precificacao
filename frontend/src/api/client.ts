import type {
  ApiErrorEnvelope,
  DetalheResponse,
  FiltrosResponse,
  HistoricoResponse,
  InventarioFiltros,
  InventarioResponse,
} from './types';

const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

/** Erro de API com o envelope padrão do backend ({ error: { code, message, details } }). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorEnvelope['error']['details'];

  constructor(status: number, envelope: ApiErrorEnvelope['error'] | null) {
    super(envelope?.message ?? `Erro na comunicação com o servidor (HTTP ${status}).`);
    this.name = 'ApiError';
    this.status = status;
    this.code = envelope?.code ?? 'ERRO_DESCONHECIDO';
    this.details = envelope?.details ?? [];
  }
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new Error(
      'Não foi possível conectar ao servidor. Verifique se o backend está rodando em ' + API_URL + '.'
    );
  }

  if (!response.ok) {
    let envelope: ApiErrorEnvelope['error'] | null = null;
    try {
      const body = (await response.json()) as Partial<ApiErrorEnvelope>;
      if (body && typeof body === 'object' && body.error) envelope = body.error;
    } catch {
      // corpo não-JSON: mantém envelope nulo
    }
    throw new ApiError(response.status, envelope);
  }

  return (await response.json()) as T;
}

export function getInventario(
  filtros: InventarioFiltros = {},
  signal?: AbortSignal
): Promise<InventarioResponse> {
  const params = new URLSearchParams();
  if (filtros.placa) params.set('placa', filtros.placa);
  if (filtros.modelo) params.set('modelo', filtros.modelo);
  if (filtros.versao) params.set('versao', filtros.versao);
  if (filtros.ano !== undefined) params.set('ano', String(filtros.ano));
  if (filtros.classe) params.set('classe', filtros.classe);
  if (filtros.canal) params.set('canal', filtros.canal);
  params.set('page', String(filtros.page ?? 1));
  params.set('page_size', String(filtros.page_size ?? 100));
  return request<InventarioResponse>(`/api/inventario?${params.toString()}`, signal);
}

export function getDetalhe(placa: string, signal?: AbortSignal): Promise<DetalheResponse> {
  return request<DetalheResponse>(`/api/inventario/${encodeURIComponent(placa)}`, signal);
}

export function getHistorico(placa: string, signal?: AbortSignal): Promise<HistoricoResponse> {
  return request<HistoricoResponse>(
    `/api/inventario/${encodeURIComponent(placa)}/historico`,
    signal
  );
}

export function getFiltros(signal?: AbortSignal): Promise<FiltrosResponse> {
  return request<FiltrosResponse>('/api/filtros', signal);
}
