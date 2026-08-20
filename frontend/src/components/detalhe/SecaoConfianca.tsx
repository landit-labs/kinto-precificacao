import type { AlertaQualidadeDados, Confianca } from '../../api/types';
import { ConfiancaBadge } from '../Badges';

interface SecaoConfiancaProps {
  confianca: Confianca;
  motivosBaixaConfianca: string[];
  alertaQualidade: AlertaQualidadeDados;
}

/**
 * Indicadores de confiança com motivos de baixa confiança (RF-F6-A-08) e
 * alertas de ausência/baixa qualidade de dados (RF-F6-A-09).
 */
export function SecaoConfianca({
  confianca,
  motivosBaixaConfianca,
  alertaQualidade,
}: SecaoConfiancaProps) {
  return (
    <section className="secao" aria-labelledby="titulo-confianca">
      <h3 id="titulo-confianca">Confiança e qualidade de dados</h3>

      <p>
        Nível de confiança: <ConfiancaBadge nivel={confianca.nivel} score={confianca.score} />
      </p>

      {motivosBaixaConfianca.length > 0 && (
        <div className="aviso aviso-atencao">
          <h4>Motivos de baixa confiança</h4>
          <ul>
            {motivosBaixaConfianca.map((motivo) => (
              <li key={motivo}>{motivo}</li>
            ))}
          </ul>
        </div>
      )}

      {alertaQualidade.ativo && (
        <div className="aviso aviso-alerta" role="alert">
          <h4>
            <span aria-hidden="true">⚠ </span>Alerta de qualidade de dados
          </h4>
          <ul>
            {alertaQualidade.motivos.map((motivo) => (
              <li key={motivo}>{motivo}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
