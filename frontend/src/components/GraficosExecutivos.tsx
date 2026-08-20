import { useEffect, useRef, useState } from 'react';
import type { ContagemClasse, ValorCanal } from '../utils/agregacoes';
import { variacaoPercentualPeriodo } from '../utils/agregacoes';
import { formatarMoeda, formatarMoedaInteira, formatarNumero } from '../utils/format';
import type { PontoHistoricoFipe } from '../utils/mockHistoricoFipe';

/**
 * Visão executiva do portfólio — três gráficos acima da tabela:
 * 1. Composição do inventário por classe comercial (barras horizontais);
 * 2. Valor recomendado total por canal sugerido (barra empilhada parte-do-todo);
 * 3. Recomendado vs. FIPE nos últimos 4 meses (linhas com tendência; mock).
 *
 * Componente puro: recebe as agregações prontas (utils/agregacoes.ts) por
 * props; nenhum cálculo de negócio aqui. Cores seguem o mapeamento fixo dos
 * badges (A/B success, C/D warning, E danger, Não avaliado warning tracejado,
 * Retail primary, Wholesale dark). Paridade sem cor: rótulo textual + valor em
 * toda barra/segmento e tabela alternativa (sr-only) com os números.
 */

interface GraficosExecutivosProps {
  /** Contagem por classe em ordem fixa A–E + Não avaliado (contarPorClasse). */
  porClasse: ContagemClasse[];
  /** Valor recomendado por canal em ordem fixa (somarValorPorCanal). */
  porCanal: ValorCanal[];
  /** Série mensal Recomendado vs. FIPE (mock até a camada Gold expor o dado). */
  historicoFipe: PontoHistoricoFipe[];
  /** Inventário ainda carregando (exibe placeholder no lugar dos gráficos). */
  carregando?: boolean;
}

function percentualPtBr(parte: number, total: number): string {
  if (total <= 0) return '0%';
  return `${((parte / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;
}

const CLASSE_CSS: Record<string, string> = {
  A: 'grafico-barra-classe-a',
  B: 'grafico-barra-classe-b',
  C: 'grafico-barra-classe-c',
  D: 'grafico-barra-classe-d',
  E: 'grafico-barra-classe-e',
};

function classeCss(classe: ContagemClasse['classe']): string {
  return classe === null ? 'grafico-barra-nao-avaliado' : CLASSE_CSS[classe];
}

function canalCss(canal: ValorCanal['canal']): string {
  if (canal === 'Retail') return 'grafico-canal-retail';
  if (canal === 'Wholesale') return 'grafico-canal-wholesale';
  return 'grafico-canal-nao-definido';
}

/** Barras horizontais: quantidade de veículos por classe comercial. */
function GraficoClasses({ dados }: { dados: ContagemClasse[] }) {
  const maximo = Math.max(...dados.map((d) => d.quantidade), 1);
  const total = dados.reduce((acc, d) => acc + d.quantidade, 0);
  const resumo = dados.map((d) => `${d.label}: ${formatarNumero(d.quantidade)}`).join('; ');

  return (
    <div className="card grafico-card">
      <div className="card-header">
        <div>
          <h5>Composição por classe comercial</h5>
          <p>Veículos do resultado filtrado por classe A–E; avaliação pendente à parte.</p>
        </div>
      </div>
      <div className="card-body">
        <div
          className="grafico-barras"
          role="img"
          aria-label={`Distribuição de ${formatarNumero(total)} veículos por classe comercial. ${resumo}.`}
        >
          {dados.map((d) => (
            <div className="grafico-barra-linha" key={d.label} aria-hidden="true">
              <span className="grafico-barra-rotulo">{d.label}</span>
              <span className="grafico-barra-trilho">
                <span
                  className={`grafico-barra ${classeCss(d.classe)}`}
                  style={{ width: `${(d.quantidade / maximo) * 100}%` }}
                />
                <span className="grafico-barra-valor">{formatarNumero(d.quantidade)}</span>
              </span>
            </div>
          ))}
        </div>
        <table className="sr-only">
          <caption>Quantidade de veículos por classe comercial</caption>
          <thead>
            <tr>
              <th scope="col">Classe</th>
              <th scope="col">Veículos</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((d) => (
              <tr key={d.label}>
                <th scope="row">{d.label}</th>
                <td>{formatarNumero(d.quantidade)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Barra empilhada parte-do-todo: valor recomendado total por canal sugerido. */
function GraficoCanais({ dados }: { dados: ValorCanal[] }) {
  const valorTotal = dados.reduce((acc, d) => acc + d.valorTotal, 0);
  const segmentos = dados.filter((d) => d.valorTotal > 0);
  const resumo = dados
    .map((d) => `${d.label}: ${formatarMoeda(d.valorTotal)} (${percentualPtBr(d.valorTotal, valorTotal)})`)
    .join('; ');

  return (
    <div className="card grafico-card">
      <div className="card-header">
        <div>
          <h5>Valor recomendado por canal</h5>
          <p>Soma do preço recomendado dos veículos filtrados, por canal sugerido.</p>
        </div>
      </div>
      <div className="card-body">
        <p className="grafico-total-rotulo">Valor total recomendado</p>
        <p className="grafico-total-valor">{formatarMoeda(valorTotal)}</p>
        <div
          role="img"
          aria-label={`Valor recomendado total de ${formatarMoeda(valorTotal)} distribuído por canal. ${resumo}.`}
        >
          <div className="grafico-pilha" aria-hidden="true">
            {segmentos.map((d) => (
              <span
                key={d.label}
                className={`grafico-segmento ${canalCss(d.canal)}`}
                style={{ width: `${(d.valorTotal / valorTotal) * 100}%` }}
                title={`${d.label}: ${formatarMoeda(d.valorTotal)}`}
              />
            ))}
          </div>
          <ul className="grafico-legenda" aria-hidden="true">
            {dados.map((d) => (
              <li key={d.label}>
                <span className={`grafico-legenda-swatch ${canalCss(d.canal)}`} />
                <span className="grafico-legenda-rotulo">{d.label}</span>
                <span className="grafico-legenda-detalhe">
                  {formatarNumero(d.quantidade)} {d.quantidade === 1 ? 'veículo' : 'veículos'}
                </span>
                <span className="grafico-legenda-valor">
                  {formatarMoeda(d.valorTotal)}
                  <span className="grafico-legenda-percentual">
                    {' '}
                    · {percentualPtBr(d.valorTotal, valorTotal)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <table className="sr-only">
          <caption>Valor recomendado total por canal sugerido</caption>
          <thead>
            <tr>
              <th scope="col">Canal</th>
              <th scope="col">Veículos</th>
              <th scope="col">Valor recomendado</th>
              <th scope="col">Participação</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((d) => (
              <tr key={d.label}>
                <th scope="row">{d.label}</th>
                <td>{formatarNumero(d.quantidade)}</td>
                <td>{formatarMoeda(d.valorTotal)}</td>
                <td>{percentualPtBr(d.valorTotal, valorTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Texto de variação com sinal explícito (ex.: "+2,1%" / "-1,7%"). */
function variacaoTexto(delta: number | null): string {
  if (delta === null) return 'variação indisponível';
  const texto = delta.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${delta > 0 ? '+' : ''}${texto}%`;
}

function variacaoCss(delta: number | null): string {
  if (delta === null || delta === 0) return 'grafico-tendencia-neutra';
  return delta > 0 ? 'grafico-tendencia-alta' : 'grafico-tendencia-queda';
}

/**
 * Mede a largura do elemento referenciado via ResizeObserver.
 * O gráfico de linhas usa a medida real do container como viewBox
 * (1 unidade SVG = 1px CSS): o desenho escala fluidamente em qualquer
 * largura sem o texto inflar/encolher junto com a tela.
 */
function useLarguraContainer(): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [largura, setLargura] = useState(0);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;
    const observador = new ResizeObserver((entradas) => {
      const medida = entradas[0]?.contentRect.width ?? 0;
      setLargura(Math.round(medida));
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  return [ref, largura];
}

/**
 * Linhas: preço recomendado médio vs. FIPE média nos últimos meses.
 * Forma "emphasis" (dataviz): o recomendado é o assunto (primary, sólido);
 * a FIPE é referência de contexto (secondary, tracejada) — as séries se
 * distinguem por traço e rótulo direto, nunca só por cor. Eixo monetário com
 * CORTE DECLARADO no rodapé: com base em zero, a variação mensal de poucos %
 * ficaria ilegível (o trabalho do gráfico é a tendência).
 *
 * Responsividade: card em linha própria de largura total; o SVG usa a largura
 * medida do container (ResizeObserver) como viewBox e altura fluida com
 * mín/máx. Abaixo de LARGURA_COMPACTA os rótulos de fim de linha saem do SVG
 * (as linhas de tendência, que sempre trazem chave de linha + nome + último
 * valor, assumem a identidade) — nunca há scroll horizontal.
 */
/** Abaixo desta largura (px) os rótulos diretos saem do SVG (modo compacto). */
const LARGURA_COMPACTA = 560;

function GraficoFipe({ historico }: { historico: PontoHistoricoFipe[] }) {
  const [containerRef, larguraMedida] = useLarguraContainer();

  const cabecalho = (
    <div className="card-header">
      <div>
        <h5>Recomendado vs. FIPE — últimos 4 meses</h5>
        <p>
          Preço recomendado médio do portfólio contra o valor FIPE médio. Dados ilustrativos
          (mock) — a série real virá da camada Gold.
        </p>
      </div>
    </div>
  );

  if (historico.length < 2) {
    return (
      <div className="card grafico-card grafico-card-largo">
        {cabecalho}
        <div className="card-body">
          <p className="texto-suave">Histórico indisponível para o período.</p>
        </div>
      </div>
    );
  }

  const recomendado = historico.map((p) => p.precoRecomendadoMedio);
  const fipe = historico.map((p) => p.fipeMedio);
  const deltaRecomendado = variacaoPercentualPeriodo(recomendado);
  const deltaFipe = variacaoPercentualPeriodo(fipe);
  const periodo = `${historico[0].label}–${historico[historico.length - 1].label}`;

  // Domínio do eixo Y (corte declarado): folga de 35% da amplitude, arredondada ao milhar.
  const todos = [...recomendado, ...fipe];
  const minimo = Math.min(...todos);
  const maximo = Math.max(...todos);
  const amplitude = Math.max(maximo - minimo, 1000);
  const eixoMin = Math.floor((minimo - amplitude * 0.35) / 1000) * 1000;
  const eixoMax = Math.ceil((maximo + amplitude * 0.35) / 1000) * 1000;
  const eixoMeio = Math.round((eixoMin + eixoMax) / 2000) * 1000;

  // Geometria fluida: viewBox = largura medida do container (texto em tamanho
  // natural em qualquer tela); altura proporcional com mín/máx para leitura
  // executiva em tela cheia. Antes da primeira medição, usa 560 de fallback.
  const larg = larguraMedida > 0 ? Math.max(larguraMedida, 260) : 560;
  const compacto = larg < LARGURA_COMPACTA;
  const alt = Math.round(Math.min(340, Math.max(190, larg * 0.28)));
  const margem = {
    superior: 16,
    inferior: 30,
    esquerda: compacto ? 66 : 74,
    direita: compacto ? 18 : 150,
  };
  const plotL = larg - margem.esquerda - margem.direita;
  const plotA = alt - margem.superior - margem.inferior;
  const x = (i: number) => margem.esquerda + (i * plotL) / (historico.length - 1);
  const y = (v: number) => margem.superior + plotA * (1 - (v - eixoMin) / (eixoMax - eixoMin));
  const caminho = (serie: number[]) =>
    serie.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');

  const ultimo = historico.length - 1;
  const resumo =
    `Evolução mensal de ${periodo} de 2026 — preço recomendado médio: de ` +
    `${formatarMoedaInteira(recomendado[0])} para ${formatarMoedaInteira(recomendado[ultimo])} ` +
    `(${variacaoTexto(deltaRecomendado)}); FIPE média: de ${formatarMoedaInteira(fipe[0])} para ` +
    `${formatarMoedaInteira(fipe[ultimo])} (${variacaoTexto(deltaFipe)}). Dados ilustrativos (mock).`;

  return (
    <div className="card grafico-card grafico-card-largo">
      {cabecalho}
      <div className="card-body">
        <div ref={containerRef} role="img" aria-label={resumo}>
          <svg
            className="grafico-linhas"
            viewBox={`0 0 ${larg} ${alt}`}
            aria-hidden="true"
          >
            {/* Grade recessiva + ticks do eixo Y (valores redondos, pt-BR) */}
            {[eixoMin, eixoMeio, eixoMax].map((tick) => (
              <g key={tick}>
                <line
                  className="grafico-linhas-grade"
                  x1={margem.esquerda}
                  x2={larg - margem.direita}
                  y1={y(tick)}
                  y2={y(tick)}
                />
                <text className="grafico-linhas-tick" x={margem.esquerda - 8} y={y(tick) + 3.5} textAnchor="end">
                  {formatarMoedaInteira(tick)}
                </text>
              </g>
            ))}

            {/* Meses no eixo X (abreviação pt-BR) */}
            {historico.map((p, i) => (
              <text key={p.mes} className="grafico-linhas-tick" x={x(i)} y={alt - 10} textAnchor="middle">
                {p.label}
              </text>
            ))}

            {/* FIPE: contexto — tracejada, secondary */}
            <path className="grafico-linha-fipe" d={caminho(fipe)} />
            {/* Recomendado: o assunto — sólida, primary */}
            <path className="grafico-linha-recomendado" d={caminho(recomendado)} />

            {/* Marcadores com anel de superfície + tooltip nativo por ponto */}
            {historico.map((p, i) => (
              <g key={p.mes}>
                <circle className="grafico-ponto-fipe" cx={x(i)} cy={y(p.fipeMedio)} r={4} />
                <circle
                  className="grafico-ponto-recomendado"
                  cx={x(i)}
                  cy={y(p.precoRecomendadoMedio)}
                  r={4}
                />
                <circle className="grafico-ponto-alvo" cx={x(i)} cy={y(p.fipeMedio)} r={10}>
                  <title>{`FIPE média · ${p.label}/2026: ${formatarMoedaInteira(p.fipeMedio)}`}</title>
                </circle>
                <circle className="grafico-ponto-alvo" cx={x(i)} cy={y(p.precoRecomendadoMedio)} r={10}>
                  <title>{`Preço recomendado médio · ${p.label}/2026: ${formatarMoedaInteira(p.precoRecomendadoMedio)}`}</title>
                </circle>
              </g>
            ))}

            {/* Rótulos diretos no fim das linhas (nome + valor final em tokens de
                texto). Em telas estreitas saem do SVG: a identidade fica com as
                linhas de tendência abaixo (chave de linha + nome + último valor). */}
            {!compacto && (
              <>
                <text className="grafico-linhas-rotulo" x={x(ultimo) + 12} y={y(fipe[ultimo]) - 2}>
                  FIPE média
                  <tspan className="grafico-linhas-rotulo-valor" x={x(ultimo) + 12} dy={13}>
                    {formatarMoedaInteira(fipe[ultimo])}
                  </tspan>
                </text>
                <text
                  className="grafico-linhas-rotulo"
                  x={x(ultimo) + 12}
                  y={y(recomendado[ultimo]) - 2}
                >
                  Recomendado
                  <tspan className="grafico-linhas-rotulo-valor" x={x(ultimo) + 12} dy={13}>
                    {formatarMoedaInteira(recomendado[ultimo])}
                  </tspan>
                </text>
              </>
            )}
          </svg>

          {/* Tendências do período (legenda com chave de linha + variação AA) */}
          <ul className="grafico-tendencias" aria-hidden="true">
            <li>
              <span className="grafico-chave-linha grafico-chave-recomendado" />
              <span className="grafico-legenda-rotulo">Preço recomendado médio</span>
              <span className="grafico-tendencia-ultimo">
                {formatarMoedaInteira(recomendado[ultimo])}
              </span>
              <span className={`grafico-tendencia ${variacaoCss(deltaRecomendado)}`}>
                {variacaoTexto(deltaRecomendado)} no período {periodo}
              </span>
            </li>
            <li>
              <span className="grafico-chave-linha grafico-chave-fipe" />
              <span className="grafico-legenda-rotulo">FIPE média</span>
              <span className="grafico-tendencia-ultimo">{formatarMoedaInteira(fipe[ultimo])}</span>
              <span className={`grafico-tendencia ${variacaoCss(deltaFipe)}`}>
                {variacaoTexto(deltaFipe)} no período {periodo}
              </span>
            </li>
          </ul>
          <p className="grafico-nota-eixo">
            Eixo iniciando em {formatarMoedaInteira(eixoMin)} (corte declarado) para evidenciar a
            variação mensal.
          </p>
        </div>

        <table className="sr-only">
          <caption>Preço recomendado médio e FIPE média por mês (dados ilustrativos)</caption>
          <thead>
            <tr>
              <th scope="col">Mês</th>
              <th scope="col">Preço recomendado médio</th>
              <th scope="col">FIPE média</th>
            </tr>
          </thead>
          <tbody>
            {historico.map((p) => (
              <tr key={p.mes}>
                <th scope="row">{`${p.label}/2026`}</th>
                <td>{formatarMoedaInteira(p.precoRecomendadoMedio)}</td>
                <td>{formatarMoedaInteira(p.fipeMedio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function GraficosExecutivos({
  porClasse,
  porCanal,
  historicoFipe,
  carregando = false,
}: GraficosExecutivosProps) {
  const totalVeiculos = porClasse.reduce((acc, d) => acc + d.quantidade, 0);

  if (carregando) {
    return (
      <section aria-label="Visão executiva do portfólio">
        <div className="estado estado-carregando" role="status">
          Carregando visão executiva…
        </div>
      </section>
    );
  }

  if (totalVeiculos === 0) {
    return (
      <section aria-label="Visão executiva do portfólio">
        <div className="estado estado-vazio">
          Sem dados para a visão executiva com os filtros atuais.
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Visão executiva do portfólio" className="graficos-grid">
      <GraficoClasses dados={porClasse} />
      <GraficoCanais dados={porCanal} />
      <GraficoFipe historico={historicoFipe} />
    </section>
  );
}
