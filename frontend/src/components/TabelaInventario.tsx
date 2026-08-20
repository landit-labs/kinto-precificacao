import type { InventarioItem } from '../api/types';
import { formatarKm, formatarMoeda, formatarNumero } from '../utils/format';
import { AlertaQualidadeIcone, CanalBadge, ClasseBadge, ConfiancaBadge } from './Badges';

interface TabelaInventarioProps {
  items: InventarioItem[];
  /** Total de veículos do resultado filtrado, exibido no cabeçalho do card. */
  total: number;
  aoSelecionar: (placa: string) => void;
  placaSelecionada: string | null;
}

/** Tabela do inventário (RF-F6-A-01), em card padrão NFMS. Clique na linha abre o detalhe. */
export function TabelaInventario({
  items,
  total,
  aoSelecionar,
  placaSelecionada,
}: TabelaInventarioProps) {
  return (
    <div className="card">
      <div className="card-header">
        <div>
          <h5>Plate-by-Plate Pricing</h5>
          <p>Plataforma de Precificação de Seminovos — inventário e recomendações</p>
        </div>
        <p className="resumo-resultados" aria-live="polite">
          {formatarNumero(total)} {total === 1 ? 'veículo encontrado' : 'veículos encontrados'}
        </p>
      </div>
      <div className="card-body sem-padding">
        <div className="tabela-container">
          <table className="tabela-inventario">
            <caption className="sr-only">
              Inventário de veículos seminovos com classe, canal e preço recomendado
            </caption>
            <thead>
              <tr>
                <th scope="col">Placa</th>
                <th scope="col">Modelo</th>
                <th scope="col">Versão</th>
                <th scope="col">Ano</th>
                <th scope="col" className="num">
                  KM
                </th>
                <th scope="col">Classe</th>
                <th scope="col">Canal sugerido</th>
                <th scope="col" className="num">
                  Preço recomendado
                </th>
                <th scope="col">Confiança</th>
                <th scope="col" className="centro">
                  Alerta
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.placa}
                  className={`linha-clicavel${item.placa === placaSelecionada ? ' linha-selecionada' : ''}`}
                  onClick={() => aoSelecionar(item.placa)}
                  aria-selected={item.placa === placaSelecionada}
                >
                  <td>
                    <button
                      type="button"
                      className="botao-placa"
                      onClick={(e) => {
                        e.stopPropagation();
                        aoSelecionar(item.placa);
                      }}
                      aria-label={`Ver detalhes do veículo de placa ${item.placa}`}
                    >
                      {item.placa}
                    </button>
                  </td>
                  <td>
                    {item.marca} {item.modelo}
                  </td>
                  <td>{item.versao}</td>
                  <td>{item.ano}</td>
                  <td className="num">{formatarKm(item.km)}</td>
                  <td>
                    <ClasseBadge classe={item.classe} label={item.classe_label} />
                  </td>
                  <td>
                    <CanalBadge canal={item.canal_sugerido} />
                  </td>
                  <td className="num valor-destaque">{formatarMoeda(item.preco_recomendado)}</td>
                  <td>
                    <ConfiancaBadge nivel={item.confianca.nivel} score={item.confianca.score} />
                  </td>
                  <td className="centro">
                    <AlertaQualidadeIcone ativo={item.alerta_qualidade_dados} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
