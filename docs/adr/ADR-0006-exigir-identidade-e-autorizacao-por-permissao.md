# ADR-0006 — Exigir identidade autenticada e autorização por permissão

## Status

Proposed

## Contexto

A API atual é acadêmica e não implementa autenticação ou autorização. Em um banco digital real, operações sobre contas, crédito e pagamentos expõem dados financeiros e podem movimentar recursos. Identificar apenas o cliente informado no corpo da requisição não comprova sua identidade nem sua autoridade.

Os atributos prioritários são confidencialidade, integridade, auditabilidade e disponibilidade segura. Foram consideradas a autenticação implementada diretamente pela aplicação, a confiança em identificadores enviados pelo cliente e a delegação da identidade a um provedor compatível com OpenID Connect, mantendo a autorização como responsabilidade explícita da API.

## Decisão

Antes de expor a API a usuários reais, delegar autenticação a um provedor de identidade compatível com OpenID Connect e validar tokens de acesso em cada requisição protegida. A aplicação deverá aplicar autorização negada por padrão, verificando permissões e o vínculo do usuário ao recurso solicitado; papéis administrativos não substituirão verificações de propriedade da conta.

Credenciais, tokens e dados sensíveis não serão registrados em logs. Segredos serão fornecidos por mecanismo seguro de configuração, não mantidos no repositório.

## Consequências

- A identidade centralizada evita que cada funcionalidade implemente seu próprio mecanismo de login.
- Verificações explícitas de autorização reduzem o risco de acesso indevido a contas e operações.
- A validação de tokens e o gerenciamento de permissões aumentam a complexidade de desenvolvimento, configuração e testes.
- A dependência de um provedor externo introduz riscos de disponibilidade, configuração incorreta e gestão de chaves; cache e estratégia de contingência deverão ser definidos sem aceitar tokens inválidos.
- Esta decisão não está implementada no escopo acadêmico atual; publicar a API em produção sem resolver essa lacuna não é aceitável.
