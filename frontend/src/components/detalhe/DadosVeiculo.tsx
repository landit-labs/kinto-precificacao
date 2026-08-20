import type { VeiculoDetalhe } from '../../api/types';
import { formatarData, formatarKm, formatarMoeda } from '../../utils/format';

interface DadosVeiculoProps {
  veiculo: VeiculoDetalhe;
}

/** Dados cadastrais do veículo. Avaria nula é exibida como "Não avaliada" (regra da spec). */
export function DadosVeiculo({ veiculo }: DadosVeiculoProps) {
  return (
    <section className="secao" aria-labelledby="titulo-dados-veiculo">
      <h3 id="titulo-dados-veiculo">Dados do veículo</h3>
      <dl className="lista-definicoes">
        <div>
          <dt>Ano</dt>
          <dd>{veiculo.ano}</dd>
        </div>
        <div>
          <dt>Quilometragem</dt>
          <dd>{formatarKm(veiculo.km)}</dd>
        </div>
        <div>
          <dt>KM médio anual</dt>
          <dd>{formatarKm(veiculo.km_medio_anual)}</dd>
        </div>
        <div>
          <dt>Cor</dt>
          <dd>{veiculo.cor}</dd>
        </div>
        <div>
          <dt>Combustível</dt>
          <dd>{veiculo.combustivel}</dd>
        </div>
        <div>
          <dt>Avaria</dt>
          <dd>
            {veiculo.avaria_valor === null ? (
              <span className="badge badge-nao-avaliado">Não avaliada</span>
            ) : (
              formatarMoeda(veiculo.avaria_valor)
            )}
          </dd>
        </div>
        <div>
          <dt>Valor FIPE</dt>
          <dd>{formatarMoeda(veiculo.valor_fipe)}</dd>
        </div>
        <div>
          <dt>Entrada no estoque</dt>
          <dd>{formatarData(veiculo.data_entrada_estoque)}</dd>
        </div>
      </dl>
    </section>
  );
}
