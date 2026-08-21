/**
 * app.js — painel Plate-by-Plate Pricing em JavaScript puro (SDP #5211).
 *
 * Porte 1:1 dos componentes React de frontend/src para HTML+CSS+JS sem build,
 * sem servidor e sem rede: os dados vêm do snapshot embutido em js/dados.js
 * (gerado por html/gerar-dados.ps1 a partir da API mock).
 *
 * Correspondência com o React (mesma marcação e mesmas classes CSS):
 *   App.tsx ................. montarPagina() / render()
 *   CartoesKpi.tsx .......... htmlKpis()
 *   GraficosExecutivos.tsx .. htmlGraficoClasses/Canais + renderGraficoFipe()
 *   BarraFiltros.tsx ........ montarFiltros()
 *   TabelaInventario.tsx .... htmlTabela()
 *   detalhe/*.tsx ........... abrirDetalhe()
 *   utils/format.ts ......... formatarMoeda, formatarKm, ...
 *   utils/agregacoes.ts ..... contarPorClasse, somarValorPorCanal, ...
 *   utils/csv.ts ............ exportarCsvInventario()
 *   backend/app/services.py . filtrarInventario() (mesmas regras de filtro)
 *
 * Regra da spec preservada em todo o arquivo: classe/avaria NULA NÃO É ZERO —
 * veículo sem classe é "Não avaliado" (categoria própria), nunca classe A.
 */
(function () {
  'use strict';

  // =========================================================================
  // Dados (snapshot local — nenhuma chamada de rede)
  // =========================================================================

  var DADOS = window.DADOS || null;
  var INVENTARIO = DADOS && DADOS.inventario ? DADOS.inventario.items : [];
  var OPCOES = DADOS ? DADOS.filtros : null;
  var DETALHES = DADOS ? DADOS.detalhes : {};
  var HISTORICOS = DADOS ? DADOS.historicos : {};

  /**
   * MOCK — histórico mensal Recomendado vs. FIPE (cópia de
   * frontend/src/utils/mockHistoricoFipe.ts). A API não expõe série histórica
   * do portfólio; valores fictícios porém coerentes. Substituir por dados reais
   * quando a camada Gold expuser o endpoint.
   */
  var HISTORICO_FIPE_MOCK = [
    { mes: '2026-05', label: 'mai', precoRecomendadoMedio: 111800, fipeMedio: 118400 },
    { mes: '2026-06', label: 'jun', precoRecomendadoMedio: 111100, fipeMedio: 117500 },
    { mes: '2026-07', label: 'jul', precoRecomendadoMedio: 110300, fipeMedio: 116800 },
    { mes: '2026-08', label: 'ago', precoRecomendadoMedio: 109900, fipeMedio: 115900 }
  ];

  var FILTROS_INICIAIS = { placa: '', modelo: '', versao: '', ano: '', classe: '', canal: '' };

  var estado = {
    filtros: Object.assign({}, FILTROS_INICIAIS),
    placaSelecionada: null
  };

  // =========================================================================
  // Formatação (espelha utils/format.ts)
  // =========================================================================

  var moedaBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  var moedaBRLInteira = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  });
  var numeroBR = new Intl.NumberFormat('pt-BR');

  function formatarMoeda(valor) {
    return moedaBRL.format(valor);
  }

  function formatarMoedaInteira(valor) {
    return moedaBRLInteira.format(valor);
  }

  function formatarNumero(valor) {
    return numeroBR.format(valor);
  }

  function formatarKm(km) {
    return numeroBR.format(km) + ' km';
  }

  /** Converte data ISO "YYYY-MM-DD" em "dd/mm/aaaa" sem risco de fuso horário. */
  function formatarData(iso) {
    var partes = String(iso).split('-');
    if (partes.length < 3) return iso;
    return partes[2] + '/' + partes[1] + '/' + partes[0];
  }

  function formatarFaixa(minimo, maximo) {
    return moedaBRL.format(minimo) + ' – ' + moedaBRL.format(maximo);
  }

  var LABELS_CONFIANCA = { alto: 'Alta', medio: 'Média', baixo: 'Baixa' };

  function labelConfianca(nivel) {
    return LABELS_CONFIANCA[nivel] || nivel;
  }

  function percentualPtBr(parte, total) {
    if (total <= 0) return '0%';
    return ((parte / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + '%';
  }

  /** Escapa texto vindo dos dados antes de entrar em innerHTML. */
  function esc(valor) {
    if (valor === null || valor === undefined) return '';
    return String(valor)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // =========================================================================
  // Filtro do inventário (espelha backend/app/services.py::listar_inventario)
  // =========================================================================

  function filtrarInventario(filtros) {
    var resultado = INVENTARIO;

    if (filtros.placa) {
      var termo = filtros.placa.trim().toUpperCase();
      resultado = resultado.filter(function (v) {
        return v.placa.indexOf(termo) !== -1; // busca parcial (RF-F6-A-02)
      });
    }
    if (filtros.modelo) {
      var modelo = filtros.modelo.trim().toLowerCase();
      resultado = resultado.filter(function (v) {
        return v.modelo.toLowerCase() === modelo;
      });
    }
    if (filtros.versao) {
      var versao = filtros.versao.trim().toLowerCase();
      resultado = resultado.filter(function (v) {
        return v.versao.toLowerCase() === versao;
      });
    }
    if (filtros.ano) {
      var ano = Number(filtros.ano);
      resultado = resultado.filter(function (v) {
        return v.ano === ano;
      });
    }
    if (filtros.classe) {
      if (filtros.classe === 'NAO_AVALIADO') {
        resultado = resultado.filter(function (v) {
          return v.classe === null;
        });
      } else {
        resultado = resultado.filter(function (v) {
          return v.classe === filtros.classe;
        });
      }
    }
    if (filtros.canal) {
      resultado = resultado.filter(function (v) {
        return v.canal_sugerido === filtros.canal;
      });
    }

    return resultado;
  }

  // =========================================================================
  // Agregações (espelha utils/agregacoes.ts)
  // =========================================================================

  var ORDEM_CLASSES = [
    { classe: 'A', label: 'Classe A' },
    { classe: 'B', label: 'Classe B' },
    { classe: 'C', label: 'Classe C' },
    { classe: 'D', label: 'Classe D' },
    { classe: 'E', label: 'Classe E' },
    { classe: null, label: 'Não avaliado' }
  ];

  var ORDEM_CANAIS = [
    { canal: 'Retail', label: 'Retail' },
    { canal: 'Wholesale', label: 'Wholesale' },
    { canal: null, label: 'Não definido' }
  ];

  function contarPorClasse(items) {
    return ORDEM_CLASSES.map(function (entrada) {
      return {
        classe: entrada.classe,
        label: entrada.label,
        quantidade: items.filter(function (item) {
          return item.classe === entrada.classe;
        }).length
      };
    });
  }

  function somarValorPorCanal(items) {
    return ORDEM_CANAIS.map(function (entrada) {
      var doCanal = items.filter(function (item) {
        return item.canal_sugerido === entrada.canal;
      });
      return {
        canal: entrada.canal,
        label: entrada.label,
        quantidade: doCanal.length,
        valorTotal: doCanal.reduce(function (soma, item) {
          return soma + item.preco_recomendado;
        }, 0)
      };
    });
  }

  /** Variação % entre o primeiro e o último valor; null (não zero) se incalculável. */
  function variacaoPercentualPeriodo(valores) {
    if (valores.length < 2) return null;
    var primeiro = valores[0];
    var ultimo = valores[valores.length - 1];
    if (primeiro === 0) return null;
    return ((ultimo - primeiro) / primeiro) * 100;
  }

  // =========================================================================
  // Badges (espelha components/Badges.tsx)
  // =========================================================================

  function htmlClasseBadge(classe, label) {
    if (classe === null || classe === undefined) {
      return '<span class="badge badge-nao-avaliado">' + esc(label) + '</span>';
    }
    return (
      '<span class="badge badge-classe-' + esc(String(classe).toLowerCase()) + '">' +
      esc(label) +
      '</span>'
    );
  }

  function htmlConfiancaBadge(nivel, score) {
    var texto = score !== undefined && score !== null
      ? labelConfianca(nivel) + ' (' + score + ')'
      : labelConfianca(nivel);
    return (
      '<span class="badge badge-confianca-' + esc(nivel) + '" title="Nível de confiança: ' +
      esc(labelConfianca(nivel).toLowerCase()) + '">' + esc(texto) + '</span>'
    );
  }

  function htmlCanalBadge(canal) {
    if (!canal) return '<span class="texto-suave">Não definido</span>';
    return (
      '<span class="badge badge-canal-' + esc(String(canal).toLowerCase()) + '">' +
      esc(canal) +
      '</span>'
    );
  }

  function htmlAlertaQualidadeIcone(ativo) {
    if (!ativo) {
      return '<span class="texto-suave" aria-label="Sem alerta de qualidade de dados">—</span>';
    }
    return (
      '<span class="alerta-icone" role="img" aria-label="Alerta de qualidade de dados" ' +
      'title="Alerta de qualidade de dados">⚠</span>'
    );
  }

  // =========================================================================
  // KPIs (espelha components/CartoesKpi.tsx)
  // =========================================================================

  var ICONE_CARRO =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" />' +
    '<path d="M5 17h-2v-6l2 -5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0h-6m-6 -6h15m-6 0v-5" /></svg>';

  var ICONE_GRAFICO =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4 19l16 0" /><path d="M4 15l4 -6l4 2l4 -5l4 4" /></svg>';

  var ICONE_ALERTA =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 9v4" />' +
    '<path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 ' +
    '1.636 -2.871l-8.106 -13.534a1.914 1.914 0 0 0 -3.274 0z" /><path d="M12 16h.01" /></svg>';

  function htmlCartaoKpi(valor, rotulo, tom, icone) {
    return (
      '<div class="card kpi-card"><div class="card-body"><div>' +
      '<p class="kpi-valor">' + esc(valor) + '</p>' +
      '<p class="kpi-rotulo">' + esc(rotulo) + '</p>' +
      '</div><span class="kpi-chip kpi-chip-' + tom + '">' + icone + '</span></div></div>'
    );
  }

  function htmlKpis(total, items) {
    var precoMedio = items.length > 0
      ? items.reduce(function (soma, item) { return soma + item.preco_recomendado; }, 0) / items.length
      : null;
    // Alerta de qualidade OU classe nula (não avaliado) — nunca tratado como classe A.
    var comAlerta = items.filter(function (item) {
      return item.alerta_qualidade_dados || item.classe === null;
    }).length;

    return (
      '<div class="kpi-grid">' +
      htmlCartaoKpi(formatarNumero(total), 'Veículos no inventário', 'primary', ICONE_CARRO) +
      htmlCartaoKpi(
        precoMedio !== null ? formatarMoeda(precoMedio) : '—',
        'Preço recomendado médio',
        'success',
        ICONE_GRAFICO
      ) +
      htmlCartaoKpi(formatarNumero(comAlerta), 'Com alerta ou não avaliados', 'warning', ICONE_ALERTA) +
      '</div>'
    );
  }

  // =========================================================================
  // Gráficos executivos (espelha components/GraficosExecutivos.tsx)
  // =========================================================================

  var CLASSE_CSS = {
    A: 'grafico-barra-classe-a',
    B: 'grafico-barra-classe-b',
    C: 'grafico-barra-classe-c',
    D: 'grafico-barra-classe-d',
    E: 'grafico-barra-classe-e'
  };

  function classeCss(classe) {
    return classe === null || classe === undefined
      ? 'grafico-barra-nao-avaliado'
      : CLASSE_CSS[classe];
  }

  function canalCss(canal) {
    if (canal === 'Retail') return 'grafico-canal-retail';
    if (canal === 'Wholesale') return 'grafico-canal-wholesale';
    return 'grafico-canal-nao-definido';
  }

  /** Barras horizontais: quantidade de veículos por classe comercial. */
  function htmlGraficoClasses(dados) {
    var maximo = Math.max.apply(null, dados.map(function (d) { return d.quantidade; }).concat([1]));
    var total = dados.reduce(function (acc, d) { return acc + d.quantidade; }, 0);
    var resumo = dados.map(function (d) {
      return d.label + ': ' + formatarNumero(d.quantidade);
    }).join('; ');

    var barras = dados.map(function (d) {
      return (
        '<div class="grafico-barra-linha" aria-hidden="true">' +
        '<span class="grafico-barra-rotulo">' + esc(d.label) + '</span>' +
        '<span class="grafico-barra-trilho">' +
        '<span class="grafico-barra ' + classeCss(d.classe) + '" style="width: ' +
        (d.quantidade / maximo) * 100 + '%"></span>' +
        '<span class="grafico-barra-valor">' + formatarNumero(d.quantidade) + '</span>' +
        '</span></div>'
      );
    }).join('');

    var linhasTabela = dados.map(function (d) {
      return '<tr><th scope="row">' + esc(d.label) + '</th><td>' +
        formatarNumero(d.quantidade) + '</td></tr>';
    }).join('');

    return (
      '<div class="card grafico-card">' +
      '<div class="card-header"><div><h5>Composição por classe comercial</h5>' +
      '<p>Veículos do resultado filtrado por classe A–E; avaliação pendente à parte.</p></div></div>' +
      '<div class="card-body">' +
      '<div class="grafico-barras" role="img" aria-label="Distribuição de ' +
      formatarNumero(total) + ' veículos por classe comercial. ' + esc(resumo) + '.">' +
      barras +
      '</div>' +
      '<table class="sr-only"><caption>Quantidade de veículos por classe comercial</caption>' +
      '<thead><tr><th scope="col">Classe</th><th scope="col">Veículos</th></tr></thead>' +
      '<tbody>' + linhasTabela + '</tbody></table>' +
      '</div></div>'
    );
  }

  /** Barra empilhada parte-do-todo: valor recomendado total por canal sugerido. */
  function htmlGraficoCanais(dados) {
    var valorTotal = dados.reduce(function (acc, d) { return acc + d.valorTotal; }, 0);
    var segmentos = dados.filter(function (d) { return d.valorTotal > 0; });
    var resumo = dados.map(function (d) {
      return d.label + ': ' + formatarMoeda(d.valorTotal) +
        ' (' + percentualPtBr(d.valorTotal, valorTotal) + ')';
    }).join('; ');

    var pilha = segmentos.map(function (d) {
      return (
        '<span class="grafico-segmento ' + canalCss(d.canal) + '" style="width: ' +
        (d.valorTotal / valorTotal) * 100 + '%" title="' + esc(d.label) + ': ' +
        esc(formatarMoeda(d.valorTotal)) + '"></span>'
      );
    }).join('');

    var legenda = dados.map(function (d) {
      return (
        '<li><span class="grafico-legenda-swatch ' + canalCss(d.canal) + '"></span>' +
        '<span class="grafico-legenda-rotulo">' + esc(d.label) + '</span>' +
        '<span class="grafico-legenda-detalhe">' + formatarNumero(d.quantidade) + ' ' +
        (d.quantidade === 1 ? 'veículo' : 'veículos') + '</span>' +
        '<span class="grafico-legenda-valor">' + formatarMoeda(d.valorTotal) +
        '<span class="grafico-legenda-percentual"> · ' +
        percentualPtBr(d.valorTotal, valorTotal) + '</span></span></li>'
      );
    }).join('');

    var linhasTabela = dados.map(function (d) {
      return (
        '<tr><th scope="row">' + esc(d.label) + '</th><td>' + formatarNumero(d.quantidade) +
        '</td><td>' + formatarMoeda(d.valorTotal) + '</td><td>' +
        percentualPtBr(d.valorTotal, valorTotal) + '</td></tr>'
      );
    }).join('');

    return (
      '<div class="card grafico-card">' +
      '<div class="card-header"><div><h5>Valor recomendado por canal</h5>' +
      '<p>Soma do preço recomendado dos veículos filtrados, por canal sugerido.</p></div></div>' +
      '<div class="card-body">' +
      '<p class="grafico-total-rotulo">Valor total recomendado</p>' +
      '<p class="grafico-total-valor">' + formatarMoeda(valorTotal) + '</p>' +
      '<div role="img" aria-label="Valor recomendado total de ' + esc(formatarMoeda(valorTotal)) +
      ' distribuído por canal. ' + esc(resumo) + '.">' +
      '<div class="grafico-pilha" aria-hidden="true">' + pilha + '</div>' +
      '<ul class="grafico-legenda" aria-hidden="true">' + legenda + '</ul>' +
      '</div>' +
      '<table class="sr-only"><caption>Valor recomendado total por canal sugerido</caption>' +
      '<thead><tr><th scope="col">Canal</th><th scope="col">Veículos</th>' +
      '<th scope="col">Valor recomendado</th><th scope="col">Participação</th></tr></thead>' +
      '<tbody>' + linhasTabela + '</tbody></table>' +
      '</div></div>'
    );
  }

  function variacaoTexto(delta) {
    if (delta === null) return 'variação indisponível';
    var texto = delta.toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    });
    return (delta > 0 ? '+' : '') + texto + '%';
  }

  function variacaoCss(delta) {
    if (delta === null || delta === 0) return 'grafico-tendencia-neutra';
    return delta > 0 ? 'grafico-tendencia-alta' : 'grafico-tendencia-queda';
  }

  /** Abaixo desta largura (px) os rótulos diretos saem do SVG (modo compacto). */
  var LARGURA_COMPACTA = 560;

  /**
   * SVG do gráfico de linhas Recomendado vs. FIPE, desenhado na largura real do
   * container (1 unidade SVG = 1px CSS), como no componente React.
   * Eixo Y com CORTE DECLARADO — a nota no rodapé explicita o corte.
   */
  function svgFipe(historico, largura) {
    var recomendado = historico.map(function (p) { return p.precoRecomendadoMedio; });
    var fipe = historico.map(function (p) { return p.fipeMedio; });

    var todos = recomendado.concat(fipe);
    var minimo = Math.min.apply(null, todos);
    var maximo = Math.max.apply(null, todos);
    var amplitude = Math.max(maximo - minimo, 1000);
    var eixoMin = Math.floor((minimo - amplitude * 0.35) / 1000) * 1000;
    var eixoMax = Math.ceil((maximo + amplitude * 0.35) / 1000) * 1000;
    var eixoMeio = Math.round((eixoMin + eixoMax) / 2000) * 1000;

    var larg = largura > 0 ? Math.max(largura, 260) : 560;
    var compacto = larg < LARGURA_COMPACTA;
    var alt = Math.round(Math.min(340, Math.max(190, larg * 0.28)));
    var margem = {
      superior: 16,
      inferior: 30,
      esquerda: compacto ? 66 : 74,
      direita: compacto ? 18 : 150
    };
    var plotL = larg - margem.esquerda - margem.direita;
    var plotA = alt - margem.superior - margem.inferior;

    function x(i) {
      return margem.esquerda + (i * plotL) / (historico.length - 1);
    }
    function y(v) {
      return margem.superior + plotA * (1 - (v - eixoMin) / (eixoMax - eixoMin));
    }
    function caminho(serie) {
      return serie.map(function (v, i) {
        return (i === 0 ? 'M' : 'L') + ' ' + x(i).toFixed(1) + ' ' + y(v).toFixed(1);
      }).join(' ');
    }

    var ultimo = historico.length - 1;

    var grade = [eixoMin, eixoMeio, eixoMax].map(function (tick) {
      return (
        '<g><line class="grafico-linhas-grade" x1="' + margem.esquerda + '" x2="' +
        (larg - margem.direita) + '" y1="' + y(tick) + '" y2="' + y(tick) + '"></line>' +
        '<text class="grafico-linhas-tick" x="' + (margem.esquerda - 8) + '" y="' +
        (y(tick) + 3.5) + '" text-anchor="end">' + formatarMoedaInteira(tick) + '</text></g>'
      );
    }).join('');

    var meses = historico.map(function (p, i) {
      return (
        '<text class="grafico-linhas-tick" x="' + x(i) + '" y="' + (alt - 10) +
        '" text-anchor="middle">' + esc(p.label) + '</text>'
      );
    }).join('');

    var marcadores = historico.map(function (p, i) {
      return (
        '<g>' +
        '<circle class="grafico-ponto-fipe" cx="' + x(i) + '" cy="' + y(p.fipeMedio) + '" r="4"></circle>' +
        '<circle class="grafico-ponto-recomendado" cx="' + x(i) + '" cy="' +
        y(p.precoRecomendadoMedio) + '" r="4"></circle>' +
        '<circle class="grafico-ponto-alvo" cx="' + x(i) + '" cy="' + y(p.fipeMedio) + '" r="10">' +
        '<title>FIPE média · ' + esc(p.label) + '/2026: ' + formatarMoedaInteira(p.fipeMedio) +
        '</title></circle>' +
        '<circle class="grafico-ponto-alvo" cx="' + x(i) + '" cy="' +
        y(p.precoRecomendadoMedio) + '" r="10"><title>Preço recomendado médio · ' +
        esc(p.label) + '/2026: ' + formatarMoedaInteira(p.precoRecomendadoMedio) +
        '</title></circle>' +
        '</g>'
      );
    }).join('');

    var rotulos = '';
    if (!compacto) {
      rotulos =
        '<text class="grafico-linhas-rotulo" x="' + (x(ultimo) + 12) + '" y="' +
        (y(fipe[ultimo]) - 2) + '">FIPE média<tspan class="grafico-linhas-rotulo-valor" x="' +
        (x(ultimo) + 12) + '" dy="13">' + formatarMoedaInteira(fipe[ultimo]) + '</tspan></text>' +
        '<text class="grafico-linhas-rotulo" x="' + (x(ultimo) + 12) + '" y="' +
        (y(recomendado[ultimo]) - 2) + '">Recomendado<tspan class="grafico-linhas-rotulo-valor" x="' +
        (x(ultimo) + 12) + '" dy="13">' + formatarMoedaInteira(recomendado[ultimo]) +
        '</tspan></text>';
    }

    return {
      svg:
        '<svg class="grafico-linhas" viewBox="0 0 ' + larg + ' ' + alt + '" aria-hidden="true">' +
        grade + meses +
        '<path class="grafico-linha-fipe" d="' + caminho(fipe) + '"></path>' +
        '<path class="grafico-linha-recomendado" d="' + caminho(recomendado) + '"></path>' +
        marcadores + rotulos +
        '</svg>',
      eixoMin: eixoMin
    };
  }

  /** Conteúdo do card FIPE para uma dada largura de container. */
  function htmlConteudoFipe(historico, largura) {
    var recomendado = historico.map(function (p) { return p.precoRecomendadoMedio; });
    var fipe = historico.map(function (p) { return p.fipeMedio; });
    var deltaRecomendado = variacaoPercentualPeriodo(recomendado);
    var deltaFipe = variacaoPercentualPeriodo(fipe);
    var periodo = historico[0].label + '–' + historico[historico.length - 1].label;
    var ultimo = historico.length - 1;
    var desenho = svgFipe(historico, largura);

    var tendencias =
      '<ul class="grafico-tendencias" aria-hidden="true">' +
      '<li><span class="grafico-chave-linha grafico-chave-recomendado"></span>' +
      '<span class="grafico-legenda-rotulo">Preço recomendado médio</span>' +
      '<span class="grafico-tendencia-ultimo">' + formatarMoedaInteira(recomendado[ultimo]) +
      '</span><span class="grafico-tendencia ' + variacaoCss(deltaRecomendado) + '">' +
      esc(variacaoTexto(deltaRecomendado)) + ' no período ' + esc(periodo) + '</span></li>' +
      '<li><span class="grafico-chave-linha grafico-chave-fipe"></span>' +
      '<span class="grafico-legenda-rotulo">FIPE média</span>' +
      '<span class="grafico-tendencia-ultimo">' + formatarMoedaInteira(fipe[ultimo]) +
      '</span><span class="grafico-tendencia ' + variacaoCss(deltaFipe) + '">' +
      esc(variacaoTexto(deltaFipe)) + ' no período ' + esc(periodo) + '</span></li></ul>';

    var nota =
      '<p class="grafico-nota-eixo">Eixo iniciando em ' + formatarMoedaInteira(desenho.eixoMin) +
      ' (corte declarado) para evidenciar a variação mensal.</p>';

    return desenho.svg + tendencias + nota;
  }

  function htmlGraficoFipe(historico) {
    var cabecalho =
      '<div class="card-header"><div><h5>Recomendado vs. FIPE — últimos 4 meses</h5>' +
      '<p>Preço recomendado médio do portfólio contra o valor FIPE médio. Dados ilustrativos ' +
      '(mock) — a série real virá da camada Gold.</p></div></div>';

    if (historico.length < 2) {
      return (
        '<div class="card grafico-card grafico-card-largo">' + cabecalho +
        '<div class="card-body"><p class="texto-suave">Histórico indisponível para o período.</p>' +
        '</div></div>'
      );
    }

    var recomendado = historico.map(function (p) { return p.precoRecomendadoMedio; });
    var fipe = historico.map(function (p) { return p.fipeMedio; });
    var deltaRecomendado = variacaoPercentualPeriodo(recomendado);
    var deltaFipe = variacaoPercentualPeriodo(fipe);
    var periodo = historico[0].label + '–' + historico[historico.length - 1].label;
    var ultimo = historico.length - 1;

    var resumo =
      'Evolução mensal de ' + periodo + ' de 2026 — preço recomendado médio: de ' +
      formatarMoedaInteira(recomendado[0]) + ' para ' + formatarMoedaInteira(recomendado[ultimo]) +
      ' (' + variacaoTexto(deltaRecomendado) + '); FIPE média: de ' + formatarMoedaInteira(fipe[0]) +
      ' para ' + formatarMoedaInteira(fipe[ultimo]) + ' (' + variacaoTexto(deltaFipe) +
      '). Dados ilustrativos (mock).';

    var linhasTabela = historico.map(function (p) {
      return (
        '<tr><th scope="row">' + esc(p.label) + '/2026</th><td>' +
        formatarMoedaInteira(p.precoRecomendadoMedio) + '</td><td>' +
        formatarMoedaInteira(p.fipeMedio) + '</td></tr>'
      );
    }).join('');

    return (
      '<div class="card grafico-card grafico-card-largo">' + cabecalho +
      '<div class="card-body">' +
      '<div id="grafico-fipe-container" role="img" aria-label="' + esc(resumo) + '">' +
      htmlConteudoFipe(historico, 0) +
      '</div>' +
      '<table class="sr-only"><caption>Preço recomendado médio e FIPE média por mês ' +
      '(dados ilustrativos)</caption><thead><tr><th scope="col">Mês</th>' +
      '<th scope="col">Preço recomendado médio</th><th scope="col">FIPE média</th></tr></thead>' +
      '<tbody>' + linhasTabela + '</tbody></table>' +
      '</div></div>'
    );
  }

  function htmlGraficos(porClasse, porCanal, historicoFipe) {
    var totalVeiculos = porClasse.reduce(function (acc, d) { return acc + d.quantidade; }, 0);

    if (totalVeiculos === 0) {
      return (
        '<section aria-label="Visão executiva do portfólio">' +
        '<div class="estado estado-vazio">Sem dados para a visão executiva com os filtros atuais.' +
        '</div></section>'
      );
    }

    return (
      '<section aria-label="Visão executiva do portfólio" class="graficos-grid">' +
      htmlGraficoClasses(porClasse) +
      htmlGraficoCanais(porCanal) +
      htmlGraficoFipe(historicoFipe) +
      '</section>'
    );
  }

  // Redesenha o gráfico de linhas quando a largura do container muda
  // (equivale ao ResizeObserver do hook useLarguraContainer no React).
  var observadorFipe = null;

  function observarGraficoFipe() {
    if (observadorFipe) {
      observadorFipe.disconnect();
      observadorFipe = null;
    }
    var container = document.getElementById('grafico-fipe-container');
    if (!container || typeof ResizeObserver === 'undefined') return;

    var larguraAtual = 0;
    observadorFipe = new ResizeObserver(function (entradas) {
      var medida = Math.round(entradas[0] ? entradas[0].contentRect.width : 0);
      if (medida === larguraAtual || medida <= 0) return;
      larguraAtual = medida;
      container.innerHTML = htmlConteudoFipe(HISTORICO_FIPE_MOCK, medida);
    });
    observadorFipe.observe(container);
  }

  // =========================================================================
  // Tabela do inventário (espelha components/TabelaInventario.tsx)
  // =========================================================================

  function htmlTabela(items, total) {
    var linhas = items.map(function (item) {
      var selecionada = item.placa === estado.placaSelecionada;
      return (
        '<tr class="linha-clicavel' + (selecionada ? ' linha-selecionada' : '') +
        '" data-placa="' + esc(item.placa) + '" aria-selected="' + selecionada + '">' +
        '<td><button type="button" class="botao-placa" data-placa="' + esc(item.placa) +
        '" aria-label="Ver detalhes do veículo de placa ' + esc(item.placa) + '">' +
        esc(item.placa) + '</button></td>' +
        '<td>' + esc(item.marca) + ' ' + esc(item.modelo) + '</td>' +
        '<td>' + esc(item.versao) + '</td>' +
        '<td>' + esc(item.ano) + '</td>' +
        '<td class="num">' + formatarKm(item.km) + '</td>' +
        '<td>' + htmlClasseBadge(item.classe, item.classe_label) + '</td>' +
        '<td>' + htmlCanalBadge(item.canal_sugerido) + '</td>' +
        '<td class="num valor-destaque">' + formatarMoeda(item.preco_recomendado) + '</td>' +
        '<td>' + htmlConfiancaBadge(item.confianca.nivel, item.confianca.score) + '</td>' +
        '<td class="centro">' + htmlAlertaQualidadeIcone(item.alerta_qualidade_dados) + '</td>' +
        '</tr>'
      );
    }).join('');

    return (
      '<div class="card"><div class="card-header"><div>' +
      '<h5>Plate-by-Plate Pricing</h5>' +
      '<p>Plataforma de Precificação de Seminovos — inventário e recomendações</p></div>' +
      '<p class="resumo-resultados" aria-live="polite">' + formatarNumero(total) + ' ' +
      (total === 1 ? 'veículo encontrado' : 'veículos encontrados') + '</p></div>' +
      '<div class="card-body sem-padding"><div class="tabela-container">' +
      '<table class="tabela-inventario">' +
      '<caption class="sr-only">Inventário de veículos seminovos com classe, canal e preço ' +
      'recomendado</caption><thead><tr>' +
      '<th scope="col">Placa</th><th scope="col">Modelo</th><th scope="col">Versão</th>' +
      '<th scope="col">Ano</th><th scope="col" class="num">KM</th><th scope="col">Classe</th>' +
      '<th scope="col">Canal sugerido</th><th scope="col" class="num">Preço recomendado</th>' +
      '<th scope="col">Confiança</th><th scope="col" class="centro">Alerta</th>' +
      '</tr></thead><tbody>' + linhas + '</tbody></table></div></div></div>'
    );
  }

  // =========================================================================
  // Barra de filtros (espelha components/BarraFiltros.tsx)
  // =========================================================================

  function htmlOpcoes(valores, rotularComo) {
    return valores.map(function (valor) {
      var texto = rotularComo ? rotularComo(valor) : valor;
      var chave = rotularComo ? valor.valor : valor;
      return '<option value="' + esc(chave) + '">' + esc(texto) + '</option>';
    }).join('');
  }

  function montarFiltros() {
    var opcoes = OPCOES || { modelos: [], versoes: [], anos: [], classes: [], canais: [] };

    document.getElementById('area-filtros').innerHTML =
      '<form class="barra-filtros" role="search" aria-label="Pesquisa e filtros do inventário">' +
      '<div class="campo campo-busca"><label for="filtro-placa">Pesquisar por placa</label>' +
      '<input id="filtro-placa" type="search" placeholder="Ex.: BRA2E19" autocomplete="off" /></div>' +

      '<div class="campo"><label for="filtro-modelo">Modelo</label>' +
      '<select id="filtro-modelo"><option value="">Todos</option>' +
      htmlOpcoes(opcoes.modelos) + '</select></div>' +

      '<div class="campo"><label for="filtro-versao">Versão</label>' +
      '<select id="filtro-versao"><option value="">Todas</option>' +
      htmlOpcoes(opcoes.versoes) + '</select></div>' +

      '<div class="campo"><label for="filtro-ano">Ano</label>' +
      '<select id="filtro-ano"><option value="">Todos</option>' +
      htmlOpcoes(opcoes.anos) + '</select></div>' +

      '<div class="campo"><label for="filtro-classe">Classe</label>' +
      '<select id="filtro-classe"><option value="">Todas</option>' +
      htmlOpcoes(opcoes.classes, function (c) { return c.label; }) + '</select></div>' +

      '<div class="campo"><label for="filtro-canal">Canal</label>' +
      '<select id="filtro-canal"><option value="">Todos</option>' +
      htmlOpcoes(opcoes.canais) + '</select></div>' +

      '<div class="acoes-filtros">' +
      '<button type="button" class="botao botao-secundario" id="botao-limpar">Limpar filtros</button>' +
      '<button type="button" class="botao botao-primario" id="botao-exportar" ' +
      'title="Exporta o inventário filtrado atual para CSV">Exportar CSV</button>' +
      '</div></form>';

    document.querySelector('.barra-filtros').addEventListener('submit', function (e) {
      e.preventDefault();
    });

    ligarCampo('filtro-placa', 'placa', 'input');
    ligarCampo('filtro-modelo', 'modelo', 'change');
    ligarCampo('filtro-versao', 'versao', 'change');
    ligarCampo('filtro-ano', 'ano', 'change');
    ligarCampo('filtro-classe', 'classe', 'change');
    ligarCampo('filtro-canal', 'canal', 'change');

    document.getElementById('botao-limpar').addEventListener('click', function () {
      estado.filtros = Object.assign({}, FILTROS_INICIAIS);
      document.getElementById('filtro-placa').value = '';
      ['modelo', 'versao', 'ano', 'classe', 'canal'].forEach(function (campo) {
        document.getElementById('filtro-' + campo).value = '';
      });
      render();
    });

    document.getElementById('botao-exportar').addEventListener('click', function () {
      exportarCsvInventario(filtrarInventario(estado.filtros));
    });
  }

  function ligarCampo(id, campo, evento) {
    document.getElementById(id).addEventListener(evento, function (e) {
      estado.filtros[campo] = e.target.value;
      render();
    });
  }

  // =========================================================================
  // Exportação CSV (espelha utils/csv.ts)
  // =========================================================================

  var SEPARADOR = ';';
  var BOM = '﻿';

  function escaparCampo(valor) {
    if (valor.indexOf(SEPARADOR) !== -1 || valor.indexOf('"') !== -1 || valor.indexOf('\n') !== -1) {
      return '"' + valor.replace(/"/g, '""') + '"';
    }
    return valor;
  }

  /** Número com decimal vírgula, sem separador de milhar (parse correto no Excel BR). */
  function numeroCsv(valor, casasDecimais) {
    return valor.toFixed(casasDecimais === undefined ? 2 : casasDecimais).replace('.', ',');
  }

  var CABECALHO_CSV = [
    'Placa', 'Marca', 'Modelo', 'Versão', 'Ano', 'KM', 'Classe', 'Canal sugerido',
    'Preço recomendado (R$)', 'Confiança', 'Score de confiança', 'Alerta de qualidade de dados'
  ];

  function linhaCsv(item) {
    return [
      item.placa,
      item.marca,
      item.modelo,
      item.versao,
      String(item.ano),
      String(item.km),
      item.classe_label,
      item.canal_sugerido === null || item.canal_sugerido === undefined
        ? 'Não definido'
        : item.canal_sugerido,
      numeroCsv(item.preco_recomendado),
      labelConfianca(item.confianca.nivel),
      String(item.confianca.score),
      item.alerta_qualidade_dados ? 'Sim' : 'Não'
    ];
  }

  function gerarCsvInventario(items) {
    var linhas = [CABECALHO_CSV].concat(items.map(linhaCsv));
    return linhas.map(function (linha) {
      return linha.map(escaparCampo).join(SEPARADOR);
    }).join('\r\n');
  }

  function exportarCsvInventario(items) {
    var conteudo = BOM + gerarCsvInventario(items);
    var blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var data = new Date().toISOString().slice(0, 10);
    var link = document.createElement('a');
    link.href = url;
    link.download = 'inventario-precificacao-' + data + '.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // =========================================================================
  // Painel de detalhe (espelha components/detalhe/*.tsx)
  // =========================================================================

  var ROTULO_IMPACTO = { positivo: 'Positivo', negativo: 'Negativo', neutro: 'Neutro' };

  function htmlSecaoPrecificacao(p) {
    var percentis = [
      { rotulo: 'P10', valor: p.percentis.p10 },
      { rotulo: 'P25', valor: p.percentis.p25 },
      { rotulo: 'P50', valor: p.percentis.p50 },
      { rotulo: 'P75', valor: p.percentis.p75 },
      { rotulo: 'P90', valor: p.percentis.p90 }
    ];

    return (
      '<section class="secao" aria-labelledby="titulo-precificacao">' +
      '<h3 id="titulo-precificacao">Precificação</h3>' +
      '<p class="preco-recomendado"><span class="preco-recomendado-rotulo">Preço recomendado</span>' +
      '<strong class="preco-recomendado-valor">' + formatarMoeda(p.preco_recomendado) +
      '</strong></p>' +
      '<dl class="lista-definicoes">' +
      '<div><dt>Faixa operacional</dt><dd>' +
      formatarFaixa(p.faixa_operacional.minimo, p.faixa_operacional.maximo) + '</dd></div>' +
      '<div><dt>Faixa conservadora</dt><dd>' +
      formatarFaixa(p.faixa_conservadora.minimo, p.faixa_conservadora.maximo) + '</dd></div>' +
      '<div><dt>Referência interna (estimada)</dt><dd>' +
      formatarMoeda(p.preco_interno_estimado) + '</dd></div>' +
      '<div><dt>Referência externa (mercado)</dt><dd>' +
      formatarMoeda(p.referencia_externa_mercado) + '</dd></div>' +
      '<div><dt>Data de referência do mercado</dt><dd>' +
      esc(formatarData(p.data_referencia_mercado)) + '</dd></div>' +
      '</dl>' +
      '<h4>Percentis de mercado</h4>' +
      '<table class="tabela-percentis">' +
      '<caption class="sr-only">Percentis de preço dos comparáveis de mercado</caption>' +
      '<thead><tr>' +
      percentis.map(function (x) { return '<th scope="col">' + x.rotulo + '</th>'; }).join('') +
      '</tr></thead><tbody><tr>' +
      percentis.map(function (x) {
        return '<td class="num">' + formatarMoeda(x.valor) + '</td>';
      }).join('') +
      '</tr></tbody></table></section>'
    );
  }

  function htmlSecaoConfianca(confianca, motivos, alerta) {
    var html =
      '<section class="secao" aria-labelledby="titulo-confianca">' +
      '<h3 id="titulo-confianca">Confiança e qualidade de dados</h3>' +
      '<p>Nível de confiança: ' + htmlConfiancaBadge(confianca.nivel, confianca.score) + '</p>';

    if (motivos && motivos.length > 0) {
      html +=
        '<div class="aviso aviso-atencao"><h4>Motivos de baixa confiança</h4><ul>' +
        motivos.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') +
        '</ul></div>';
    }

    if (alerta && alerta.ativo) {
      html +=
        '<div class="aviso aviso-alerta" role="alert">' +
        '<h4><span aria-hidden="true">⚠ </span>Alerta de qualidade de dados</h4><ul>' +
        alerta.motivos.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') +
        '</ul></div>';
    }

    return html + '</section>';
  }

  function htmlSecaoClassificacao(classificacao, matching, fatores) {
    var listaFatores = fatores.length === 0
      ? '<p class="texto-suave">Nenhum fator de explicação disponível.</p>'
      : '<ul class="lista-fatores">' + fatores.map(function (f) {
          return (
            '<li class="fator fator-' + esc(f.impacto) + '">' +
            '<span class="badge badge-impacto-' + esc(f.impacto) + '">' +
            esc(ROTULO_IMPACTO[f.impacto] || f.impacto) + '</span>' +
            '<div><strong>' + esc(f.fator) + '</strong><p>' + esc(f.descricao) + '</p></div></li>'
          );
        }).join('') + '</ul>';

    return (
      '<section class="secao" aria-labelledby="titulo-classificacao">' +
      '<h3 id="titulo-classificacao">Classificação e canal</h3>' +
      '<dl class="lista-definicoes">' +
      '<div><dt>Classe</dt><dd>' +
      htmlClasseBadge(classificacao.classe, classificacao.classe_label) + '</dd></div>' +
      '<div><dt>Canal sugerido</dt><dd>' + htmlCanalBadge(classificacao.canal_sugerido) +
      '</dd></div>' +
      '<div><dt>Regra aplicada</dt><dd>' + esc(classificacao.regra_aplicada) + '</dd></div>' +
      '<div><dt>Exceção possível</dt><dd>' +
      (classificacao.excecao_possivel ? 'Sim' : 'Não') + '</dd></div>' +
      '<div><dt>Matching</dt><dd>' + esc(matching.modelo) + ' ' + esc(matching.versao) +
      ' — nível ' + esc(matching.nivel) + ' (' + esc(matching.regra) + ')</dd></div>' +
      '</dl><h4>Fatores da recomendação</h4>' + listaFatores + '</section>'
    );
  }

  function htmlComparaveis(comparaveis, quantidade) {
    var corpo;
    if (comparaveis.length === 0) {
      corpo = '<p class="estado estado-vazio">Nenhum comparável de mercado encontrado.</p>';
    } else {
      corpo =
        '<div class="tabela-container"><table class="tabela-secundaria">' +
        '<caption class="sr-only">Anúncios comparáveis usados na precificação</caption>' +
        '<thead><tr><th scope="col">Fonte</th><th scope="col">Anúncio</th>' +
        '<th scope="col">Ano</th><th scope="col" class="num">KM</th>' +
        '<th scope="col" class="num">Preço anunciado</th><th scope="col">Data</th>' +
        '<th scope="col">Matching</th></tr></thead><tbody>' +
        comparaveis.map(function (c) {
          return (
            '<tr><td>' + esc(c.fonte) + '</td>' +
            '<td>' + esc(c.modelo_anuncio) + ' ' + esc(c.versao_anuncio) + '</td>' +
            '<td>' + esc(c.ano) + '</td>' +
            '<td class="num">' + formatarKm(c.km) + '</td>' +
            '<td class="num">' + formatarMoeda(c.preco_anunciado) + '</td>' +
            '<td>' + esc(formatarData(c.data_anuncio)) + '</td>' +
            '<td>' + esc(c.nivel_matching) + ' <span class="texto-suave">(' +
            esc(c.regra_matching) + ')</span></td></tr>'
          );
        }).join('') +
        '</tbody></table></div>';
    }

    return (
      '<section class="secao" aria-labelledby="titulo-comparaveis">' +
      '<h3 id="titulo-comparaveis">Comparáveis de mercado <span class="contador">(' +
      esc(quantidade) + ')</span></h3>' + corpo + '</section>'
    );
  }

  function htmlDadosVeiculo(v) {
    return (
      '<section class="secao" aria-labelledby="titulo-dados-veiculo">' +
      '<h3 id="titulo-dados-veiculo">Dados do veículo</h3>' +
      '<dl class="lista-definicoes">' +
      '<div><dt>Ano</dt><dd>' + esc(v.ano) + '</dd></div>' +
      '<div><dt>Quilometragem</dt><dd>' + formatarKm(v.km) + '</dd></div>' +
      '<div><dt>KM médio anual</dt><dd>' + formatarKm(v.km_medio_anual) + '</dd></div>' +
      '<div><dt>Cor</dt><dd>' + esc(v.cor) + '</dd></div>' +
      '<div><dt>Combustível</dt><dd>' + esc(v.combustivel) + '</dd></div>' +
      // Avaria nula NÃO é zero: exibida como "Não avaliada" (regra da spec).
      '<div><dt>Avaria</dt><dd>' +
      (v.avaria_valor === null || v.avaria_valor === undefined
        ? '<span class="badge badge-nao-avaliado">Não avaliada</span>'
        : formatarMoeda(v.avaria_valor)) + '</dd></div>' +
      '<div><dt>Valor FIPE</dt><dd>' + formatarMoeda(v.valor_fipe) + '</dd></div>' +
      '<div><dt>Entrada no estoque</dt><dd>' + esc(formatarData(v.data_entrada_estoque)) +
      '</dd></div>' +
      '</dl></section>'
    );
  }

  function htmlHistorico(eventos) {
    if (!eventos || eventos.length === 0) {
      return '<p class="estado estado-vazio">Nenhum evento de histórico para este veículo.</p>';
    }

    // API retorna do mais antigo ao mais recente; exibimos o mais recente primeiro.
    var ordenados = eventos.slice().reverse();

    return (
      '<div class="tabela-container"><table class="tabela-secundaria">' +
      '<caption class="sr-only">Histórico de preços e atualizações, do mais recente ao mais ' +
      'antigo</caption><thead><tr><th scope="col">Data</th><th scope="col">Evento</th>' +
      '<th scope="col" class="num">Preço recomendado</th><th scope="col">Faixa operacional</th>' +
      '<th scope="col">Faixa conservadora</th><th scope="col">Confiança</th></tr></thead><tbody>' +
      ordenados.map(function (e) {
        return (
          '<tr><td>' + esc(formatarData(e.data)) + '</td><td>' + esc(e.evento) + '</td>' +
          '<td class="num">' + formatarMoeda(e.preco_recomendado) + '</td>' +
          '<td>' + formatarFaixa(e.faixa_operacional.minimo, e.faixa_operacional.maximo) + '</td>' +
          '<td>' + formatarFaixa(e.faixa_conservadora.minimo, e.faixa_conservadora.maximo) +
          '</td><td>' + htmlConfiancaBadge(e.confianca_nivel) + '</td></tr>'
        );
      }).join('') +
      '</tbody></table></div>'
    );
  }

  function abrirDetalhe(placa) {
    estado.placaSelecionada = placa;

    var detalhe = DETALHES[placa] || null;
    var historico = HISTORICOS[placa] || null;

    var conteudo;
    var titulo;
    if (detalhe) {
      titulo = detalhe.veiculo.marca + ' ' + detalhe.veiculo.modelo + ' ' + detalhe.veiculo.versao;
      conteudo =
        htmlSecaoPrecificacao(detalhe.precificacao) +
        htmlSecaoConfianca(
          detalhe.precificacao.confianca,
          detalhe.precificacao.motivos_baixa_confianca,
          detalhe.alerta_qualidade_dados
        ) +
        htmlSecaoClassificacao(
          detalhe.classificacao,
          detalhe.precificacao.matching,
          detalhe.precificacao.fatores_explicacao
        ) +
        htmlComparaveis(detalhe.comparaveis, detalhe.precificacao.quantidade_comparaveis) +
        htmlDadosVeiculo(detalhe.veiculo);
    } else {
      titulo = 'Veículo ' + placa;
      conteudo =
        '<div class="estado estado-erro" role="alert"><p>Detalhe não encontrado no snapshot ' +
        'local para a placa ' + esc(placa) + '. Regere os dados com html/gerar-dados.ps1.</p></div>';
    }

    fecharDetalhe(true);

    var aside = document.createElement('aside');
    aside.className = 'painel-detalhe';
    aside.id = 'painel-detalhe';
    aside.setAttribute('role', 'dialog');
    aside.setAttribute('aria-modal', 'false');
    aside.setAttribute('aria-label', 'Detalhes do veículo ' + placa);
    aside.innerHTML =
      '<header class="painel-detalhe-cabecalho"><div><h2>' + esc(titulo) + '</h2>' +
      '<p class="texto-suave">Placa ' + esc(placa) + '</p></div>' +
      '<button type="button" class="botao botao-fechar" id="botao-fechar-detalhe" ' +
      'aria-label="Fechar painel de detalhes">✕</button></header>' +
      '<div class="painel-detalhe-conteudo">' + conteudo +
      '<section class="secao" aria-labelledby="titulo-historico">' +
      '<h3 id="titulo-historico">Histórico de preços e atualizações</h3>' +
      htmlHistorico(historico ? historico.eventos : null) +
      '</section></div>';

    aside.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') fecharDetalhe();
    });

    document.getElementById('app-wrapper').appendChild(aside);
    document.getElementById('botao-fechar-detalhe').addEventListener('click', function () {
      fecharDetalhe();
    });
    document.getElementById('botao-fechar-detalhe').focus();

    render();
  }

  function fecharDetalhe(manterSelecao) {
    var painel = document.getElementById('painel-detalhe');
    if (painel) painel.remove();
    if (!manterSelecao) {
      estado.placaSelecionada = null;
      render();
    }
  }

  // =========================================================================
  // Render e inicialização (espelha App.tsx)
  // =========================================================================

  function render() {
    var items = filtrarInventario(estado.filtros);
    var total = items.length;

    document.getElementById('area-kpis').innerHTML = htmlKpis(total, items);
    document.getElementById('area-graficos').innerHTML = htmlGraficos(
      contarPorClasse(items),
      somarValorPorCanal(items),
      HISTORICO_FIPE_MOCK
    );
    observarGraficoFipe();

    document.getElementById('area-inventario').innerHTML = total === 0
      ? '<p class="estado estado-vazio">Nenhum veículo encontrado para os filtros selecionados.</p>'
      : htmlTabela(items, total);

    var temFiltroAtivo = Object.keys(estado.filtros).some(function (campo) {
      return estado.filtros[campo] !== '';
    });
    var botaoLimpar = document.getElementById('botao-limpar');
    var botaoExportar = document.getElementById('botao-exportar');
    if (botaoLimpar) botaoLimpar.disabled = !temFiltroAtivo;
    if (botaoExportar) botaoExportar.disabled = total === 0;
  }

  function iniciar() {
    if (!DADOS) {
      document.getElementById('area-inventario').innerHTML =
        '<div class="estado estado-erro" role="alert"><p>Snapshot de dados não carregado ' +
        '(js/dados.js). Rode html/gerar-dados.ps1 com o backend no ar.</p></div>';
      return;
    }

    montarFiltros();
    render();

    // Clique na linha (ou no botão da placa) abre o detalhe — delegação de evento.
    document.getElementById('area-inventario').addEventListener('click', function (e) {
      var alvo = e.target.closest('[data-placa]');
      if (alvo) abrirDetalhe(alvo.getAttribute('data-placa'));
    });

    // Escape fecha o painel mesmo quando o foco já saiu dele.
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && estado.placaSelecionada) fecharDetalhe();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
