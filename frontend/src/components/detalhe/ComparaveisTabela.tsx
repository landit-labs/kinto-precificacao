import type { Comparavel } from '../../api/types';
import { formatarData, formatarKm, formatarMoeda } from '../../utils/format';

interface ComparaveisTabelaProps {
  comparaveis: Comparavel[];
  quantidade: number;
}

/** Comparáveis de mercado com quantidade e regra de matching (RF-F6-A-07). */
export function ComparaveisTabela({ comparaveis, quantidade }: ComparaveisTabelaProps) {
  return (
    <section className="secao" aria-labelledby="titulo-comparaveis">
      <h3 id="titulo-comparaveis">
        Comparáveis de mercado <span className="contador">({quantidade})</span>
      </h3>

      {comparaveis.length === 0 ? (
        <p className="estado estado-vazio">Nenhum comparável de mercado encontrado.</p>
      ) : (
        <div className="tabela-container">
          <table className="tabela-secundaria">
            <caption className="sr-only">Anúncios comparáveis usados na precificação</caption>
            <thead>
              <tr>
                <th scope="col">Fonte</th>
                <th scope="col">Anúncio</th>
                <th scope="col">Ano</th>
                <th scope="col" className="num">
                  KM
                </th>
                <th scope="col" className="num">
                  Preço anunciado
                </th>
                <th scope="col">Data</th>
                <th scope="col">Matching</th>
              </tr>
            </thead>
            <tbody>
              {comparaveis.map((c, indice) => (
                <tr key={`${c.fonte}-${c.data_anuncio}-${indice}`}>
                  <td>{c.fonte}</td>
                  <td>
                    {c.modelo_anuncio} {c.versao_anuncio}
                  </td>
                  <td>{c.ano}</td>
                  <td className="num">{formatarKm(c.km)}</td>
                  <td className="num">{formatarMoeda(c.preco_anunciado)}</td>
                  <td>{formatarData(c.data_anuncio)}</td>
                  <td>
                    {c.nivel_matching} <span className="texto-suave">({c.regra_matching})</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
