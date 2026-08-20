interface CarregandoProps {
  mensagem?: string;
}

export function Carregando({ mensagem = 'Carregando…' }: CarregandoProps) {
  return (
    <p className="estado estado-carregando" role="status" aria-live="polite">
      {mensagem}
    </p>
  );
}

interface ErroCargaProps {
  mensagem: string;
  aoTentarNovamente?: () => void;
}

export function ErroCarga({ mensagem, aoTentarNovamente }: ErroCargaProps) {
  return (
    <div className="estado estado-erro" role="alert">
      <p>{mensagem}</p>
      {aoTentarNovamente && (
        <button type="button" className="botao botao-secundario" onClick={aoTentarNovamente}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}

interface VazioProps {
  mensagem: string;
}

export function Vazio({ mensagem }: VazioProps) {
  return <p className="estado estado-vazio">{mensagem}</p>;
}
