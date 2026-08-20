import { useEffect, useState } from 'react';

export interface ApiState<T> {
  data: T | null;
  carregando: boolean;
  erro: string | null;
  recarregar: () => void;
}

/**
 * Hook simples de estado de servidor com os três estados (carregando, erro, dados),
 * cancelamento via AbortController e recarga manual.
 *
 * Decisão: para um painel mock de consulta, hooks próprios são suficientes;
 * TanStack Query traria cache/retry/revalidação que não são necessários aqui.
 */
export function useApi<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: readonly unknown[]
): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);
  const [versao, setVersao] = useState<number>(0);

  useEffect(() => {
    const controller = new AbortController();
    setCarregando(true);
    setErro(null);

    fetcher(controller.signal)
      .then((resultado) => {
        setData(resultado);
        setCarregando(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setErro(err instanceof Error ? err.message : 'Erro inesperado ao carregar os dados.');
        setData(null);
        setCarregando(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, versao]);

  return { data, carregando, erro, recarregar: () => setVersao((v) => v + 1) };
}
