import type { Canal, ClasseFiltro } from '../api/types';

/** Estado de UI dos filtros da barra de pesquisa ('' = sem filtro). */
export interface FiltrosSelecionados {
  placa: string;
  modelo: string;
  versao: string;
  ano: string;
  classe: '' | ClasseFiltro;
  canal: '' | Canal;
}

export const FILTROS_INICIAIS: FiltrosSelecionados = {
  placa: '',
  modelo: '',
  versao: '',
  ano: '',
  classe: '',
  canal: '',
};
