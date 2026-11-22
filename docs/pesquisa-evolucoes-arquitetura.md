# Possíveis evoluções da arquitetura

## Contexto e objetivo

Esta pesquisa parte da arquitetura acadêmica documentada em [Visão arquitetural](visao-arquitetural.md): uma interface web estática servida pela API Node.js/Express, casos de uso organizados em um monólito e persistência PostgreSQL por contratos de repositório. Atualmente não há autenticação/autorização, gateway, fila de mensagens, observabilidade distribuída ou integração com provedores externos.

As opções abaixo são propostas de evolução, não funcionalidades implementadas nem recomendações para adicionar todas de uma vez. Para um banco digital real, segurança de acesso a dados financeiros e capacidade de diagnosticar operações devem preceder a exposição pública. Novos componentes distribuídos só se justificam quando requisitos concretos superarem a simplicidade do monólito atual.

Neste documento, `Accounts`, `Credit` e `Payments` são áreas funcionais usadas para indicar impacto futuro; hoje não são módulos independentes e parte desses casos de uso está agrupada nos serviços existentes.

## 1. Segurança de APIs

### 1.1 HTTPS com TLS

**Problema que resolve:** protege a comunicação entre navegador e API contra leitura e alteração do tráfego em redes não confiáveis e autentica o servidor perante o cliente. É essencial para proteger credenciais, tokens e dados de contas em trânsito. O TLS 1.3 está especificado na [RFC 9846](https://www.rfc-editor.org/rfc/rfc9846).

**Onde aplicar:** terminar HTTPS no gateway ou balanceador de borda; proteger também as conexões gateway–API e API–PostgreSQL quando atravessarem redes ou hosts distintos. Manter HTTP apenas em desenvolvimento local isolado.

**Cuidados, limitações e trade-offs:**

- Emitir, renovar e revogar certificados; automatizar a renovação e monitorar vencimentos.
- Configurar versões e cifras seguras, redirecionamento para HTTPS e cabeçalhos apropriados; não confiar em cabeçalhos de proxy sem configurar corretamente proxies confiáveis.
- TLS protege o canal, não substitui autenticação, autorização por conta ou criptografia de dados armazenados.
- Terminar TLS em um proxy simplifica certificados, mas cria um ponto que precisa ser protegido e monitorado; conexões internas em texto claro ainda podem expor dados.

### 1.2 OpenID Connect e OAuth 2.0 com autorização por recurso

**Problema que resolve:** a API atual aceita identificadores fornecidos pelo cliente e não identifica de forma confiável quem fez uma operação. Isso não permite restringir o acesso de uma pessoa às suas próprias contas. A [OWASP API Security Top 10](https://owasp.org/API-Security/editions/2023/en/0x11-t10/) destaca riscos de autenticação quebrada e de autorização em nível de objeto. [OpenID Connect (OIDC)](https://openid.net/specs/openid-connect-core-1_0.html) fornece uma camada de identidade sobre OAuth 2.0; OAuth 2.0 permite obter tokens de acesso para APIs, com recomendações de segurança atuais na [RFC 9700](https://www.rfc-editor.org/rfc/rfc9700).

**Onde aplicar:** autenticar a pessoa na interface web por um provedor de identidade OIDC; enviar token de acesso à API; validar assinatura, emissor, audiência e validade no limite da API. Em cada caso de uso, aplicar autorização para a ação e para o recurso específico — por exemplo, verificar que a pessoa pode consultar ou movimentar a conta indicada. Em uma aplicação web pública, avaliar Authorization Code Flow com PKCE.

**Cuidados, limitações e trade-offs:**

- OAuth 2.0 não é, sozinho, um protocolo de autenticação; OIDC cobre a camada de identidade. JWT é um formato de token, não um mecanismo completo de segurança.
- A validação de token não substitui a checagem de propriedade da conta: um token válido não deve permitir acesso a qualquer `accountId`.
- Definir expiração, rotação e revogação de tokens, proteção contra roubo, recuperação de conta, MFA conforme o risco, mapeamento de permissões e trilhas de auditoria.
- Delegar identidade reduz a implementação própria, mas adiciona dependência operacional de um provedor e exige proteger suas configurações e credenciais.
- A API ainda deve negar por padrão e validar autorização nas operações de domínio; esconder botões na interface não é controle de acesso.

### 1.3 Limitação de taxa e consumo de recursos

**Problema que resolve:** reduz abuso automatizado e limita impacto de rajadas ou clientes defeituosos sobre disponibilidade e custo. A [OWASP API4:2023](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/) aponta riscos de negação de serviço e aumento de custos quando não há limites de consumo.

**Onde aplicar:** configurar limites de requisições e tamanho de payload no gateway, inicialmente por endereço de origem e, após implantação de identidade, por usuário/cliente. Definir limites mais rigorosos para operações custosas, listagens e fluxos sensíveis; complementar com paginação máxima, timeouts e limites de concorrência na API e no banco.

**Cuidados, limitações e trade-offs:**

- Um limite único por IP pode bloquear usuários legítimos atrás de NAT ou ser contornado por múltiplas origens; combinar dimensões e ajustar a política ao risco.
- Em múltiplas instâncias, limites por processo não são globais; pode ser necessário estado compartilhado, que por sua vez cria outra dependência.
- Limitação de taxa não substitui autorização, proteção contra ataques volumétricos na rede, controles antifraude ou idempotência de operações financeiras.
- Limites rígidos podem degradar a experiência em períodos de uso legítimo elevado; medir antes de definir quotas e disponibilizar respostas claras para excesso de requisições.

## 2. Evolução tecnológica da arquitetura

### 2.1 Keycloak como provedor de identidade OIDC

**Problema que resolve:** fornece autenticação centralizada e emissão de tokens, em vez de cada módulo implementar login, gestão de senha e sessão por conta própria.

**Onde entraria:** como serviço de identidade externo à API. O navegador redirecionaria o usuário para o Keycloak; a API atuaria como resource server, validando tokens e convertendo claims em identidade e permissões internas. A documentação do [Keycloak para proteger aplicações e serviços](https://www.keycloak.org/securing-apps/overview) descreve suporte a OAuth 2.0 e OpenID Connect e recomenda aproveitar bibliotecas compatíveis com o ecossistema quando disponíveis.

**Módulos impactados:** interface web, middleware de autenticação da API, autorização nos casos de uso de Accounts, Credit e Payments, configuração operacional e auditoria. As regras de propriedade de conta continuam nos casos de uso, não apenas no provedor de identidade.

**Por que faz sentido:** responde diretamente à lacuna de segurança do sistema e evita criar um mecanismo de credenciais próprio. Permite papéis e identidade centralizados, relevantes quando existirem clientes, operadores e responsáveis com permissões distintas.

**Custos, limitações e trade-offs:** exige implantação, atualização, backup, alta disponibilidade e monitoramento do provedor; erros de configuração de clientes, claims ou chaves podem bloquear usuários ou autorizar acessos indevidos. A API fica dependente da disponibilidade do emissor para autenticação/renovação; validar tokens localmente reduz chamadas por requisição, mas exige atualização segura das chaves. A autorização de negócio permanece responsabilidade da aplicação.

### 2.2 Kong Gateway como gateway de API

**Problema que resolve:** centraliza entrada, roteamento e políticas transversais quando houver múltiplas APIs, consumidores ou necessidades de operação. A documentação oficial descreve o [Kong Gateway](https://developer.konghq.com/gateway/) como proxy reverso que gerencia, configura e roteia requisições para APIs REST, extensível por módulos e plugins.

**Onde entraria:** à frente do contêiner Express, recebendo tráfego externo, aplicando TLS, limites de taxa, limites de payload, roteamento e identificadores de correlação. O tráfego encaminhado ao backend continuaria sujeito à autorização de recurso da própria aplicação.

**Módulos impactados:** infraestrutura de entrada e implantação; configuração de rotas para os adaptadores HTTP; integração com autenticação/observabilidade; indiretamente, os consumidores web e externos. Não exige separar Accounts, Credit ou Payments em microserviços.

**Por que faz sentido:** pode oferecer um ponto consistente para políticas de borda se o banco passar a expor APIs para diferentes clientes ou múltiplos serviços. É compatível com a evolução gradual do monólito e pode reduzir duplicação de políticas de transporte entre APIs.

**Custos, limitações e trade-offs:** adiciona um salto de rede, configuração, atualização, monitoramento e um possível ponto de falha. Políticas duplicadas no gateway e na aplicação podem divergir; o gateway não deve ser a única camada de autorização por conta. Para o projeto atual — uma API pequena e uma interface servida pelo próprio Express — o ganho provavelmente não compensa o custo operacional; adotar somente quando houver necessidade mensurável.

### 2.3 RabbitMQ para tarefas assíncronas

**Problema que resolve:** desacopla tarefas demoradas de uma requisição HTTP e absorve indisponibilidade temporária de integrações externas, por exemplo notificações ou processamento de pagamentos com um provedor.

**Onde entraria:** entre os casos de uso e trabalhadores assíncronos. Um caso de uso registraria no PostgreSQL o estado da operação e o evento a processar; um publisher enviaria uma mensagem, e um consumidor executaria a tarefa. Para não perder eventos entre commit no banco e publicação, usar uma outbox transacional ou estratégia equivalente.

**Módulos impactados:** principalmente Payments e Credit, além de infraestrutura de persistência, adaptadores externos, implantação e observabilidade. Operações locais rápidas e consultas continuariam síncronas; não se deve colocar toda chamada HTTP em uma fila.

**Por que faz sentido:** um banco digital futuro pode integrar pagamentos, notificações e análise de crédito sujeitos a latência e falhas externas. Filas permitem retentativas e isolamento sem manter a conexão do usuário aberta durante todo o processamento.

**Custos, limitações e trade-offs:** exige operar e monitorar broker, filas, consumidores, retentativas, mensagens inválidas e capacidade. A mensagem pode ser entregue mais de uma vez; consumidores devem ser idempotentes e operações financeiras devem ter identificadores de idempotência e estados explícitos. A resposta passa a ser eventualmente consistente, e o usuário precisa consultar o andamento. A [documentação de confiabilidade do RabbitMQ](https://www.rabbitmq.com/docs/reliability) ressalta que a confiabilidade de entrega envolve broker, produtores e consumidores; confirmações e acknowledgements são necessários e não eliminam a necessidade de idempotência.

### 2.4 OpenTelemetry para observabilidade

**Problema que resolve:** facilita investigar latência, erros e dependências entre uma requisição e serviços externos, complementando logs isolados com traces e métricas correlacionados.

**Onde entraria:** instrumentação no Express e nos casos de uso, e instrumentação de chamadas PostgreSQL, gateway e, futuramente, broker. Exportar a telemetria para um OpenTelemetry Collector e deste para backends de visualização/armazenamento; o OpenTelemetry é a camada de instrumentação e coleta, não o backend em si. A documentação oficial destaca a neutralidade de fornecedor e os sinais de traces, métricas e logs ([visão geral](https://opentelemetry.io/docs/what-is-opentelemetry/); [JavaScript/Node.js](https://opentelemetry.io/docs/languages/js/)).

**Módulos impactados:** inicialização e middleware HTTP, serviços de aplicação, adaptador PostgreSQL, futuros consumidores RabbitMQ, infraestrutura de coleta e operação. A instrumentação deve preservar os limites entre camadas e evitar acoplar o domínio a um fornecedor de observabilidade.

**Por que faz sentido:** operações financeiras exigem diagnóstico de falhas e medição de latência; traces correlacionados ajudam a distinguir problemas na API, no banco ou em um provedor. A instrumentação pode ser implantada antes da mensageria e continuar útil no monólito atual.

**Custos, limitações e trade-offs:** instrumentação e coleta consomem CPU, armazenamento e largura de banda; cardinalidade alta e retenção longa aumentam custos. Sampling pode descartar eventos úteis, e telemetria pode expor dados pessoais ou financeiros: não incluir tokens, valores sensíveis ou identificadores desnecessários em atributos e logs. É preciso escolher e operar um backend, definir retenção e alertas. A documentação atual do SDK JavaScript indica traces e métricas como estáveis e logs como ainda em desenvolvimento; recomenda-se começar por traces/métricas e rever essa maturidade antes de padronizar logs via SDK.

## Priorização recomendada

1. **Antes de qualquer exposição real:** HTTPS, autenticação OIDC, autorização por recurso/conta, limitação de taxa, gestão segura de segredos e auditoria. Esses controles atendem riscos que o código atual não cobre.
2. **Para operação responsável:** adicionar OpenTelemetry e métricas/alertas para API e PostgreSQL, com política de privacidade e retenção.
3. **Quando houver mais clientes ou APIs:** avaliar Kong Gateway para políticas de borda e roteamento centralizados; não introduzi-lo apenas por antecipação.
4. **Quando integrações ou tarefas demoradas justificarem:** adotar RabbitMQ com outbox, idempotência e estados consultáveis; manter requisições simples e consultas síncronas.

Essa sequência preserva o monólito modular como ponto de partida, prioriza segurança e capacidade de diagnóstico e adia a complexidade distribuída até que a necessidade exista.

## Fontes

Fontes oficiais consultadas em 22/11/2026:

- [IETF RFC 9846 — TLS 1.3](https://www.rfc-editor.org/rfc/rfc9846)
- [IETF RFC 9700 — OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/rfc/rfc9700)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)
- [OWASP API Security Top 10 — 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/)
- [OWASP API4:2023 — Unrestricted Resource Consumption](https://owasp.org/API-Security/editions/2023/en/0xa4-unrestricted-resource-consumption/)
- [Keycloak — Securing applications and services](https://www.keycloak.org/securing-apps/overview)
- [Kong Gateway — documentação oficial](https://developer.konghq.com/gateway/)
- [RabbitMQ — Reliability Guide](https://www.rabbitmq.com/docs/reliability)
- [OpenTelemetry — What is OpenTelemetry?](https://opentelemetry.io/docs/what-is-opentelemetry/)
- [OpenTelemetry JavaScript — documentação](https://opentelemetry.io/docs/languages/js/)
