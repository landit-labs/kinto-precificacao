import type { Classificacao, FatorExplicacao, Matching } from '../../api/types';
import { CanalBadge, ClasseBadge } from '../Badges';

interface SecaoClassificacaoProps {
  classificacao: Classificacao;
  matching: Matching;
  fatores: FatorExplicacao[];
}

const rotuloImpacto: Record<FatorExplicacao['impacto'], string> = {
  positivo: 'Positivo',
  negativo: 'Negativo',
  neutro: 'Neutro',
};

/**
 * Classificação A–E, canal sugerido e regra aplicada, matching usado e fatores
 * de explicação da recomendação (parte do detalhe — RF-F6-A-04/08).
 */
export function SecaoClassificacao({ classificacao, matching, fatores }: SecaoClassificacaoProps) {
  return (
    <section className="secao" aria-labelledby="titulo-classificacao">
      <h3 id="titulo-classificacao">Classificação e canal</h3>

      <dl className="lista-definicoes">
        <div>
          <dt>Classe</dt>
          <dd>
            <ClasseBadge classe={classificacao.classe} label={classificacao.classe_label} />
          </dd>
        </div>
        <div>
          <dt>Canal sugerido</dt>
          <dd>
            <CanalBadge canal={classificacao.canal_sugerido} />
          </dd>
        </div>
        <div>
          <dt>Regra aplicada</dt>
          <dd>{classificacao.regra_aplicada}</dd>
        </div>
        <div>
          <dt>Exceção possível</dt>
          <dd>{classificacao.excecao_possivel ? 'Sim' : 'Não'}</dd>
        </div>
        <div>
          <dt>Matching</dt>
          <dd>
            {matching.modelo} {matching.versao} — nível {matching.nivel} ({matching.regra})
          </dd>
        </div>
      </dl>

      <h4>Fatores da recomendação</h4>
      {fatores.length === 0 ? (
        <p className="texto-suave">Nenhum fator de explicação disponível.</p>
      ) : (
        <ul className="lista-fatores">
          {fatores.map((fator) => (
            <li key={fator.fator} className={`fator fator-${fator.impacto}`}>
              <span className={`badge badge-impacto-${fator.impacto}`}>
                {rotuloImpacto[fator.impacto]}
              </span>
              <div>
                <strong>{fator.fator}</strong>
                <p>{fator.descricao}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
