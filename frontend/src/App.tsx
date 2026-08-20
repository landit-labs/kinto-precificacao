import { useState } from 'react';
import { getFiltros, getInventario } from './api/client';
import type { InventarioFiltros } from './api/types';
import { BarraFiltros } from './components/BarraFiltros';
import { CartoesKpi } from './components/CartoesKpi';
import { GraficosExecutivos } from './components/GraficosExecutivos';
import { contarPorClasse, somarValorPorCanal } from './utils/agregacoes';
import { HISTORICO_FIPE_MOCK } from './utils/mockHistoricoFipe';
import { FILTROS_INICIAIS, type FiltrosSelecionados } from './components/filtrosSelecionados';
import { DetalheVeiculo } from './components/detalhe/DetalheVeiculo';
import { Carregando, ErroCarga, Vazio } from './components/EstadoCarga';
import { TabelaInventario } from './components/TabelaInventario';
import { useApi } from './hooks/useApi';
import { exportarCsvInventario } from './utils/csv';

function paraQuery(filtros: FiltrosSelecionados): InventarioFiltros {
  return {
    placa: filtros.placa.trim() || undefined,
    modelo: filtros.modelo || undefined,
    versao: filtros.versao || undefined,
    ano: filtros.ano ? Number(filtros.ano) : undefined,
    classe: filtros.classe || undefined,
    canal: filtros.canal || undefined,
    page: 1,
    page_size: 100, // mock com 20 veículos: traz tudo de uma vez, sem UI de paginação
  };
}

export default function App() {
  const [filtros, setFiltros] = useState<FiltrosSelecionados>(FILTROS_INICIAIS);
  const [placaSelecionada, setPlacaSelecionada] = useState<string | null>(null);

  const opcoesFiltros = useApi((signal) => getFiltros(signal), []);
  const inventario = useApi(
    (signal) => getInventario(paraQuery(filtros), signal),
    [filtros.placa, filtros.modelo, filtros.versao, filtros.ano, filtros.classe, filtros.canal]
  );

  const items = inventario.data?.items ?? [];
  // Agregações puras e baratas (≤ page_size itens): recalcular por render dispensa memoização.
  const porClasse = contarPorClasse(items);
  const porCanal = somarValorPorCanal(items);

  return (
    <div className="app-wrapper">
      <header className="header-main">
        <div className="topbar-marca">
          <span className="topbar-emblem">
            <img src="/logo-kinto-emblem.png" alt="KINTO" />
          </span>
          <h4 className="topbar-titulo">
            Pricing · <span>Plate-by-Plate Pricing</span>
          </h4>
        </div>
      </header>

      <nav aria-label="Trilha de navegação">
        <ul className="app-breadcrumbs">
          <li>Pricing</li>
          <li>Used Vehicles</li>
          <li className="active" aria-current="page">
            Plate-by-Plate Pricing
          </li>
        </ul>
      </nav>

      <div className="app-content">
        <main className="container-fluid">
          {inventario.data && <CartoesKpi total={inventario.data.total} items={items} />}

          {inventario.carregando && !inventario.data && (
            <GraficosExecutivos
              porClasse={porClasse}
              porCanal={porCanal}
              historicoFipe={HISTORICO_FIPE_MOCK}
              carregando
            />
          )}
          {inventario.data && items.length > 0 && (
            <GraficosExecutivos
              porClasse={porClasse}
              porCanal={porCanal}
              historicoFipe={HISTORICO_FIPE_MOCK}
            />
          )}

          <BarraFiltros
            opcoes={opcoesFiltros.data}
            valores={filtros}
            aoAlterar={(novos) => setFiltros(novos)}
            aoExportar={() => exportarCsvInventario(items)}
            exportarDesabilitado={items.length === 0}
          />
          {opcoesFiltros.erro && (
            <p className="aviso aviso-atencao" role="alert">
              Não foi possível carregar as opções de filtro: {opcoesFiltros.erro}
            </p>
          )}

          <section aria-label="Inventário de veículos">
            {inventario.carregando && <Carregando mensagem="Carregando inventário…" />}
            {inventario.erro && (
              <ErroCarga mensagem={inventario.erro} aoTentarNovamente={inventario.recarregar} />
            )}
            {inventario.data && items.length === 0 && (
              <Vazio mensagem="Nenhum veículo encontrado para os filtros selecionados." />
            )}
            {inventario.data && items.length > 0 && (
              <TabelaInventario
                items={items}
                total={inventario.data.total}
                aoSelecionar={setPlacaSelecionada}
                placaSelecionada={placaSelecionada}
              />
            )}
          </section>
        </main>
      </div>

      <footer className="footer-container">
        <p>Copyright © 2026 KINTO Brasil · NFMS Admin. All rights reserved.</p>
      </footer>

      {placaSelecionada && (
        <DetalheVeiculo placa={placaSelecionada} aoFechar={() => setPlacaSelecionada(null)} />
      )}
    </div>
  );
}
