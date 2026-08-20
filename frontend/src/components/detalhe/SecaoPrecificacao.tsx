import type { Precificacao } from '../../api/types';
import { formatarData, formatarFaixa, formatarMoeda } from '../../utils/format';

interface SecaoPrecificacaoProps {
  precificacao: Precificacao;
}

/**
 * Preço recomendado (RF-F6-A-04), faixas operacional e conservadora (RF-F6-A-05),
 * referências interna e externa (RF-F6-A-06) e percentis de mercado (RF-F6-A-07).
 */
export function SecaoPrecificacao({ precificacao }: SecaoPrecificacaoProps) {
  const percentis = [
    { rotulo: 'P10', valor: precificacao.percentis.p10 },
    { rotulo: 'P25', valor: precificacao.percentis.p25 },
    { rotulo: 'P50', valor: precificacao.percentis.p50 },
    { rotulo: 'P75', valor: precificacao.percentis.p75 },
    { rotulo: 'P90', valor: precificacao.percentis.p90 },
  ];

  return (
    <section className="secao" aria-labelledby="titulo-precificacao">
      <h3 id="titulo-precificacao">Precificação</h3>

      <p className="preco-recomendado">
        <span className="preco-recomendado-rotulo">Preço recomendado</span>
        <strong className="preco-recomendado-valor">
          {formatarMoeda(precificacao.preco_recomendado)}
        </strong>
      </p>

      <dl className="lista-definicoes">
        <div>
          <dt>Faixa operacional</dt>
          <dd>
            {formatarFaixa(
              precificacao.faixa_operacional.minimo,
              precificacao.faixa_operacional.maximo
            )}
          </dd>
        </div>
        <div>
          <dt>Faixa conservadora</dt>
          <dd>
            {formatarFaixa(
              precificacao.faixa_conservadora.minimo,
              precificacao.faixa_conservadora.maximo
            )}
          </dd>
        </div>
        <div>
          <dt>Referência interna (estimada)</dt>
          <dd>{formatarMoeda(precificacao.preco_interno_estimado)}</dd>
        </div>
        <div>
          <dt>Referência externa (mercado)</dt>
          <dd>{formatarMoeda(precificacao.referencia_externa_mercado)}</dd>
        </div>
        <div>
          <dt>Data de referência do mercado</dt>
          <dd>{formatarData(precificacao.data_referencia_mercado)}</dd>
        </div>
      </dl>

      <h4>Percentis de mercado</h4>
      <table className="tabela-percentis">
        <caption className="sr-only">Percentis de preço dos comparáveis de mercado</caption>
        <thead>
          <tr>
            {percentis.map((p) => (
              <th key={p.rotulo} scope="col">
                {p.rotulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {percentis.map((p) => (
              <td key={p.rotulo} className="num">
                {formatarMoeda(p.valor)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </section>
  );
}
