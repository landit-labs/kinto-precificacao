import type { Classe, NivelConfianca } from '../api/types';
import { labelConfianca } from '../utils/format';

interface ClasseBadgeProps {
  classe: Classe | null;
  label: string;
}

/**
 * Badge de classe A–E. Classe nula é exibida como "Não avaliado" com estilo
 * de alerta — nunca como classe A (regra da spec).
 */
export function ClasseBadge({ classe, label }: ClasseBadgeProps) {
  if (classe === null) {
    return <span className="badge badge-nao-avaliado">{label}</span>;
  }
  return <span className={`badge badge-classe-${classe.toLowerCase()}`}>{label}</span>;
}

interface ConfiancaBadgeProps {
  nivel: NivelConfianca;
  score?: number;
}

export function ConfiancaBadge({ nivel, score }: ConfiancaBadgeProps) {
  const texto = score !== undefined ? `${labelConfianca(nivel)} (${score})` : labelConfianca(nivel);
  return (
    <span className={`badge badge-confianca-${nivel}`} title={`Nível de confiança: ${labelConfianca(nivel).toLowerCase()}`}>
      {texto}
    </span>
  );
}

interface CanalBadgeProps {
  canal: string | null;
}

export function CanalBadge({ canal }: CanalBadgeProps) {
  if (!canal) {
    return <span className="texto-suave">Não definido</span>;
  }
  return <span className={`badge badge-canal-${canal.toLowerCase()}`}>{canal}</span>;
}

interface AlertaQualidadeIconeProps {
  ativo: boolean;
}

/** Indicador de alerta de qualidade de dados (RF-F6-A-01 / RF-F6-A-09). */
export function AlertaQualidadeIcone({ ativo }: AlertaQualidadeIconeProps) {
  if (!ativo) {
    return (
      <span className="texto-suave" aria-label="Sem alerta de qualidade de dados">
        —
      </span>
    );
  }
  return (
    <span
      className="alerta-icone"
      role="img"
      aria-label="Alerta de qualidade de dados"
      title="Alerta de qualidade de dados"
    >
      ⚠
    </span>
  );
}
