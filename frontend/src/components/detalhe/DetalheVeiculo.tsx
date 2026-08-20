import { useEffect, useRef } from 'react';
import { getDetalhe, getHistorico } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { Carregando, ErroCarga } from '../EstadoCarga';
import { ComparaveisTabela } from './ComparaveisTabela';
import { DadosVeiculo } from './DadosVeiculo';
import { HistoricoTabela } from './HistoricoTabela';
import { SecaoClassificacao } from './SecaoClassificacao';
import { SecaoConfianca } from './SecaoConfianca';
import { SecaoPrecificacao } from './SecaoPrecificacao';

interface DetalheVeiculoProps {
  placa: string;
  aoFechar: () => void;
}

/**
 * Painel lateral com o detalhe completo do veículo:
 * RF-F6-A-04 a RF-F6-A-09 (precificação, comparáveis, confiança, alertas,
 * classificação) e RF-F6-A-11 (histórico de preços e atualizações).
 */
export function DetalheVeiculo({ placa, aoFechar }: DetalheVeiculoProps) {
  const detalhe = useApi((signal) => getDetalhe(placa, signal), [placa]);
  const historico = useApi((signal) => getHistorico(placa, signal), [placa]);
  const botaoFecharRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    botaoFecharRef.current?.focus();
  }, [placa]);

  return (
    <aside
      className="painel-detalhe"
      role="dialog"
      aria-modal="false"
      aria-label={`Detalhes do veículo ${placa}`}
      onKeyDown={(e) => {
        if (e.key === 'Escape') aoFechar();
      }}
    >
      <header className="painel-detalhe-cabecalho">
        <div>
          <h2>
            {detalhe.data
              ? `${detalhe.data.veiculo.marca} ${detalhe.data.veiculo.modelo} ${detalhe.data.veiculo.versao}`
              : `Veículo ${placa}`}
          </h2>
          <p className="texto-suave">Placa {placa}</p>
        </div>
        <button
          ref={botaoFecharRef}
          type="button"
          className="botao botao-fechar"
          onClick={aoFechar}
          aria-label="Fechar painel de detalhes"
        >
          ✕
        </button>
      </header>

      <div className="painel-detalhe-conteudo">
        {detalhe.carregando && <Carregando mensagem="Carregando detalhes do veículo…" />}
        {detalhe.erro && <ErroCarga mensagem={detalhe.erro} aoTentarNovamente={detalhe.recarregar} />}
        {detalhe.data && (
          <>
            <SecaoPrecificacao precificacao={detalhe.data.precificacao} />
            <SecaoConfianca
              confianca={detalhe.data.precificacao.confianca}
              motivosBaixaConfianca={detalhe.data.precificacao.motivos_baixa_confianca}
              alertaQualidade={detalhe.data.alerta_qualidade_dados}
            />
            <SecaoClassificacao
              classificacao={detalhe.data.classificacao}
              matching={detalhe.data.precificacao.matching}
              fatores={detalhe.data.precificacao.fatores_explicacao}
            />
            <ComparaveisTabela
              comparaveis={detalhe.data.comparaveis}
              quantidade={detalhe.data.precificacao.quantidade_comparaveis}
            />
            <DadosVeiculo veiculo={detalhe.data.veiculo} />
          </>
        )}

        <section className="secao" aria-labelledby="titulo-historico">
          <h3 id="titulo-historico">Histórico de preços e atualizações</h3>
          {historico.carregando && <Carregando mensagem="Carregando histórico…" />}
          {historico.erro && (
            <ErroCarga mensagem={historico.erro} aoTentarNovamente={historico.recarregar} />
          )}
          {historico.data && <HistoricoTabela eventos={historico.data.eventos} />}
        </section>
      </div>
    </aside>
  );
}
