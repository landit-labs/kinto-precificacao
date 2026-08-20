import type { InventarioItem } from '../api/types';
import { formatarMoeda, formatarNumero } from '../utils/format';

interface CartoesKpiProps {
  /** Total de veículos do resultado filtrado (inventario.data.total). */
  total: number;
  /** Itens carregados — base do preço médio e da contagem de alertas. */
  items: InventarioItem[];
}

/* Ícones outline estilo Tabler (traço 2px), decorativos (aria-hidden). */

function IconeCarro() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
      <path d="M5 17h-2v-6l2 -5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0h-6m-6 -6h15m-6 0v-5" />
    </svg>
  );
}

function IconeGrafico() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19l16 0" />
      <path d="M4 15l4 -6l4 2l4 -5l4 4" />
    </svg>
  );
}

function IconeAlerta() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 9v4" />
      <path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.871l-8.106 -13.534a1.914 1.914 0 0 0 -3.274 0z" />
      <path d="M12 16h.01" />
    </svg>
  );
}

interface CartaoKpiProps {
  valor: string;
  rotulo: string;
  tom: 'primary' | 'success' | 'warning';
  icone: React.ReactNode;
}

function CartaoKpi({ valor, rotulo, tom, icone }: CartaoKpiProps) {
  return (
    <div className="card kpi-card">
      <div className="card-body">
        <div>
          <p className="kpi-valor">{valor}</p>
          <p className="kpi-rotulo">{rotulo}</p>
        </div>
        <span className={`kpi-chip kpi-chip-${tom}`}>{icone}</span>
      </div>
    </div>
  );
}

/**
 * Linha de indicadores derivados do inventário já carregado (nenhuma chamada
 * nova de API): total filtrado, preço recomendado médio e veículos com alerta
 * de qualidade de dados ou não avaliados (classe nula ≠ classe A).
 */
export function CartoesKpi({ total, items }: CartoesKpiProps) {
  const precoMedio =
    items.length > 0
      ? items.reduce((soma, item) => soma + item.preco_recomendado, 0) / items.length
      : null;
  const comAlerta = items.filter(
    (item) => item.alerta_qualidade_dados || item.classe === null
  ).length;

  return (
    <div className="kpi-grid">
      <CartaoKpi
        valor={formatarNumero(total)}
        rotulo="Veículos no inventário"
        tom="primary"
        icone={<IconeCarro />}
      />
      <CartaoKpi
        valor={precoMedio !== null ? formatarMoeda(precoMedio) : '—'}
        rotulo="Preço recomendado médio"
        tom="success"
        icone={<IconeGrafico />}
      />
      <CartaoKpi
        valor={formatarNumero(comAlerta)}
        rotulo="Com alerta ou não avaliados"
        tom="warning"
        icone={<IconeAlerta />}
      />
    </div>
  );
}
