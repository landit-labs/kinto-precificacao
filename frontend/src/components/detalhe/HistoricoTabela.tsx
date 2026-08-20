import type { EventoHistorico } from '../../api/types';
import { formatarData, formatarFaixa, formatarMoeda } from '../../utils/format';
import { ConfiancaBadge } from '../Badges';

interface HistoricoTabelaProps {
  eventos: EventoHistorico[];
}

/** Histórico de preços e atualizações do veículo (RF-F6-A-11). */
export function HistoricoTabela({ eventos }: HistoricoTabelaProps) {
  if (eventos.length === 0) {
    return <p className="estado estado-vazio">Nenhum evento de histórico para este veículo.</p>;
  }

  // API retorna do mais antigo ao mais recente; exibimos o mais recente primeiro.
  const eventosOrdenados = [...eventos].reverse();

  return (
    <div className="tabela-container">
      <table className="tabela-secundaria">
        <caption className="sr-only">Histórico de preços e atualizações, do mais recente ao mais antigo</caption>
        <thead>
          <tr>
            <th scope="col">Data</th>
            <th scope="col">Evento</th>
            <th scope="col" className="num">
              Preço recomendado
            </th>
            <th scope="col">Faixa operacional</th>
            <th scope="col">Faixa conservadora</th>
            <th scope="col">Confiança</th>
          </tr>
        </thead>
        <tbody>
          {eventosOrdenados.map((evento, indice) => (
            <tr key={`${evento.data}-${indice}`}>
              <td>{formatarData(evento.data)}</td>
              <td>{evento.evento}</td>
              <td className="num">{formatarMoeda(evento.preco_recomendado)}</td>
              <td>
                {formatarFaixa(evento.faixa_operacional.minimo, evento.faixa_operacional.maximo)}
              </td>
              <td>
                {formatarFaixa(evento.faixa_conservadora.minimo, evento.faixa_conservadora.maximo)}
              </td>
              <td>
                <ConfiancaBadge nivel={evento.confianca_nivel} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
