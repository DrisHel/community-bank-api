# ADR-0004 — Registrar crédito solidário sem aprovar ou liberar recursos

## Status

Accepted

## Contexto

A funcionalidade solicitada registra pedidos de crédito para empreendimentos solidários. O escopo acadêmico contempla receber e consultar pedidos, mas não define critérios de análise, papéis autorizados para aprovação, integração com financiadores nem processo de liberação dos recursos.

Foram consideradas a aprovação automática ao registrar o pedido e a separação entre registrar uma solicitação e decidir seu resultado. A primeira alternativa inventaria critérios e poderia representar como concedido um crédito que não foi analisado.

## Decisão

Persistir cada solicitação de empreendimento com juros de 0% e status inicial `pending`, exigindo o nome do empreendimento. O endpoint apenas registra a solicitação: não aprova, não rejeita e não movimenta o saldo da conta. A decisão de crédito e eventual liberação ficam fora do escopo atual.

## Consequências

- O sistema não confunde o recebimento de um pedido com a concessão de crédito.
- A exigência do empreendimento e as restrições de status e juros são verificadas na aplicação e reforçadas pelo banco.
- Clientes e operadores não recebem, por essa funcionalidade, uma decisão de elegibilidade ou previsão de liberação.
- Um fluxo futuro de análise precisará definir critérios, autorização, transições de status, auditoria e tratamento de falhas antes de aprovar ou desembolsar recursos.
- A taxa de 0% é uma regra do escopo atual, não uma política financeira geral; alterá-la exige revisão explícita desta decisão e das restrições persistidas.
