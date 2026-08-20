import type { FiltrosResponse } from '../api/types';
import { FILTROS_INICIAIS, type FiltrosSelecionados } from './filtrosSelecionados';

interface BarraFiltrosProps {
  opcoes: FiltrosResponse | null;
  valores: FiltrosSelecionados;
  aoAlterar: (valores: FiltrosSelecionados) => void;
  aoExportar: () => void;
  exportarDesabilitado: boolean;
}

/**
 * Pesquisa por placa (RF-F6-A-02) e filtros por modelo, versão, ano, classe e
 * canal (RF-F6-A-03), com exportação CSV do resultado filtrado (RF-F6-A-10).
 */
export function BarraFiltros({
  opcoes,
  valores,
  aoAlterar,
  aoExportar,
  exportarDesabilitado,
}: BarraFiltrosProps) {
  function alterar<K extends keyof FiltrosSelecionados>(campo: K, valor: FiltrosSelecionados[K]) {
    aoAlterar({ ...valores, [campo]: valor });
  }

  const temFiltroAtivo = Object.values(valores).some((v) => v !== '');

  return (
    <form
      className="barra-filtros"
      role="search"
      aria-label="Pesquisa e filtros do inventário"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="campo campo-busca">
        <label htmlFor="filtro-placa">Pesquisar por placa</label>
        <input
          id="filtro-placa"
          type="search"
          placeholder="Ex.: BRA2E19"
          value={valores.placa}
          onChange={(e) => alterar('placa', e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="campo">
        <label htmlFor="filtro-modelo">Modelo</label>
        <select
          id="filtro-modelo"
          value={valores.modelo}
          onChange={(e) => alterar('modelo', e.target.value)}
        >
          <option value="">Todos</option>
          {opcoes?.modelos.map((modelo) => (
            <option key={modelo} value={modelo}>
              {modelo}
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label htmlFor="filtro-versao">Versão</label>
        <select
          id="filtro-versao"
          value={valores.versao}
          onChange={(e) => alterar('versao', e.target.value)}
        >
          <option value="">Todas</option>
          {opcoes?.versoes.map((versao) => (
            <option key={versao} value={versao}>
              {versao}
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label htmlFor="filtro-ano">Ano</label>
        <select id="filtro-ano" value={valores.ano} onChange={(e) => alterar('ano', e.target.value)}>
          <option value="">Todos</option>
          {opcoes?.anos.map((ano) => (
            <option key={ano} value={String(ano)}>
              {ano}
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label htmlFor="filtro-classe">Classe</label>
        <select
          id="filtro-classe"
          value={valores.classe}
          onChange={(e) => alterar('classe', e.target.value as FiltrosSelecionados['classe'])}
        >
          <option value="">Todas</option>
          {opcoes?.classes.map((classe) => (
            <option key={classe.valor} value={classe.valor}>
              {classe.label}
            </option>
          ))}
        </select>
      </div>

      <div className="campo">
        <label htmlFor="filtro-canal">Canal</label>
        <select
          id="filtro-canal"
          value={valores.canal}
          onChange={(e) => alterar('canal', e.target.value as FiltrosSelecionados['canal'])}
        >
          <option value="">Todos</option>
          {opcoes?.canais.map((canal) => (
            <option key={canal} value={canal}>
              {canal}
            </option>
          ))}
        </select>
      </div>

      <div className="acoes-filtros">
        <button
          type="button"
          className="botao botao-secundario"
          onClick={() => aoAlterar(FILTROS_INICIAIS)}
          disabled={!temFiltroAtivo}
        >
          Limpar filtros
        </button>
        <button
          type="button"
          className="botao botao-primario"
          onClick={aoExportar}
          disabled={exportarDesabilitado}
          title="Exporta o inventário filtrado atual para CSV"
        >
          Exportar CSV
        </button>
      </div>
    </form>
  );
}
