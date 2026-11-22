# ADR-0008 — Combinar HTTP síncrono com processamento assíncrono

## Status

Proposed

## Contexto

Operações simples, como consultar saldo ou registrar uma solicitação, precisam de resposta imediata e previsível para a interface. Em um banco digital real, tarefas como integração com provedores, notificações e análise de crédito podem ser lentas ou temporariamente indisponíveis. Executá-las dentro de cada requisição pode aumentar a latência e reduzir a disponibilidade; tornar tudo assíncrono, por outro lado, complica o acompanhamento e a consistência percebida pelo usuário.

Os atributos prioritários são baixa latência para operações interativas, resiliência a falhas externas e clareza do estado apresentado ao cliente. Foram consideradas comunicação inteiramente síncrona, comunicação inteiramente assíncrona e uma estratégia híbrida.

## Decisão

Manter HTTP síncrono para operações locais curtas cujo resultado possa ser confirmado antes da resposta. Para tarefas demoradas ou dependentes de serviços externos, responder com um identificador e estado explícito de processamento, executando o trabalho por fila ou trabalhador assíncrono.

Ao combinar uma gravação PostgreSQL com a publicação de um evento, usar uma outbox transacional ou mecanismo equivalente para evitar confirmar uma alteração local sem registrar o trabalho pendente. Consumidores deverão ser idempotentes, e o estado final deverá poder ser consultado pela API.

## Consequências

- Requisições interativas não ficam bloqueadas por tarefas demoradas e falhas externas podem ser tentadas novamente.
- O estado de uma operação assíncrona precisa ser comunicado, consultado e monitorado; o usuário pode não obter resultado final na mesma resposta.
- Filas, trabalhadores, retentativas, filas de mensagens não processadas e observabilidade aumentam a complexidade operacional.
- A consistência entre serviços passa a ser eventualmente consistente, exigindo estados intermediários e reconciliação.
- A outbox evita a janela entre gravação local e publicação, mas exige retenção, limpeza e monitoramento dos eventos pendentes.
- Esta decisão é uma proposta para evolução; o projeto atual não possui fila, trabalhador nem outbox.
