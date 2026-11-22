# ADR-0007 — Integrar serviços externos por adaptadores isolados

## Status

Proposed

## Contexto

Um banco digital real pode depender de provedores de pagamento, notificações, identidade ou análise de crédito. Cada provedor possui contratos, limites, disponibilidade e formatos próprios. Acoplar esses detalhes aos casos de uso prejudicaria a substituição de fornecedores e a testabilidade; chamadas diretas sem limites de tempo ou proteção contra repetição podem degradar a API ou duplicar operações financeiras.

Os atributos prioritários são modificabilidade, resiliência, segurança e rastreabilidade. Foram consideradas chamadas ao provedor diretamente nos controladores ou serviços de domínio, além de integrações isoladas por portas e adaptadores.

## Decisão

Quando integrações externas forem introduzidas, defini-las atrás de portas de saída da aplicação e implementá-las em adaptadores de infraestrutura específicos por provedor. Os casos de uso dependerão de contratos internos, não dos SDKs ou modelos externos. Cada chamada terá timeout explícito, tratamento de indisponibilidade, observabilidade sem exposição de dados sensíveis e chave de idempotência para operações que possam ser repetidas.

Respostas externas serão validadas e mapeadas para tipos internos antes de influenciar o domínio. Não será escolhido um provedor específico até que os requisitos e as restrições de negócio sejam conhecidos.

## Consequências

- Fornecedores podem ser substituídos com menor impacto no núcleo e os adaptadores podem ser testados isoladamente.
- Timeouts e tratamento de falhas limitam o impacto de indisponibilidade externa sobre a API.
- Idempotência ajuda a evitar duplicação, mas depende de suporte e semântica compatíveis no provedor; não substitui reconciliação.
- Adaptadores, métricas, gestão de credenciais e testes de contrato aumentam o custo de implementação e operação.
- Uma chamada externa não participa da transação PostgreSQL local; fluxos que combinem ambas precisarão tratar falhas parciais e reconciliação.
