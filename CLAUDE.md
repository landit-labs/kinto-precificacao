# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é este projeto

Workspace do chamado SDP **#5211 — Plataforma de Inteligência e Precificação de Veículos Seminovos** (KINTO). A fonte de verdade é a especificação em **`5211-requisitos.html`**: um documento de requisitos para contratação de consultoria, dividido em **6 fases** — (1) descoberta, (2) integração com APIs de 2 fornecedores de preços de mercado, (3) medalhão Bronze/Silver/Gold na AWS, (4) integração AWS–Snowflake, (5) modelo de precificação com classificação comercial A–E e canal Retail/Wholesale, (6) interface para o time de Precificação (painel analítico ou aplicação operacional).

Ainda não há código no repositório. O trabalho atual é de produto/planejamento: transformar a especificação em backlog e artefatos derivados.

## Convenções da especificação

Todo requisito tem identificador rastreável — sempre referencie por ID ao criar histórias, cenários ou tarefas:

- `RF-Fx-nn` — requisito funcional da fase x (variantes: `RF-F3-BZ/SV/AG/AD`, `RF-F4-RC`, `RF-F5-RS/VL`, `RF-F6-A/B`)
- `RNF-nn` — requisito não funcional · `ENT-Fx-nn` — entregável · `TST-nn` — teste · `PRE-nn` — premissa · `ORC-nn` — item de orçamento

Regras de negócio críticas da spec que não podem ser violadas em nenhum artefato derivado:

- Snapshots de coleta são **imutáveis** — histórico nunca é sobrescrito.
- Classificação comercial A–E é **sequencial e parametrizável**; avaria **nula não é zero**.
- Matching veículo↔anúncio segue hierarquia de 7 níveis (FIPE primeiro; similaridade textual apenas como fallback).
- Backtests mantêm vendas futuras fora do treinamento.
- O modelo tem **dois cenários orçados separadamente**: (a) industrializar a lógica da KINTO ou (b) revisar/desenvolver metodologia.

## Modo de trabalho (regra do usuário)

- Claude é **parceiro técnico**: opina, aponta riscos e alternativas, mas **não escreve código nem altera o projeto sem aprovação prévia** do usuário.
- A execução passa pelo agente **`orquestrador`** (`.claude/agents/orquestrador.md`), porta de entrada que delega aos especialistas — ele apresenta um plano e só dispara os sub-agentes após o OK.
- Histórias e backlog são responsabilidade do agente **`product-owner`** do projeto (preferir ao `fabrica-agentes:product-owner` do plugin); os demais especialistas vêm do plugin `fabrica-agentes` (tech-lead, bdd-gherkin, backend-python, frontend-react, playwright-tester, etc.).
- Artefatos de produto vão em **`backlog/`** (visão em `backlog/00-visao.md`, uma feature por arquivo), com critérios de aceite em Gherkin em português (Dado/Quando/Então), seguindo as skills `fabrica-agentes:po-land` e `fabrica-agentes:gherkin-land`.
- Todo artefato e comunicação em **português (pt-BR)**.
