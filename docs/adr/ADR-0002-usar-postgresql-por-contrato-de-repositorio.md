# ADR-0002 — Persistir dados relacionais por meio de um repositório

## Status

Accepted

## Contexto

Clientes, contas, movimentações e solicitações possuem relações e restrições de integridade. Operações financeiras também precisam ser persistidas de forma transacional. O projeto já utiliza PostgreSQL, e a API precisa preservar essas propriedades sem acoplar os casos de uso à biblioteca `pg`.

Foram consideradas a persistência direta nos controladores, a adoção de armazenamento em memória ou arquivo e a manutenção do PostgreSQL atrás de contratos de repositório. A primeira alternativa mistura responsabilidades; as alternativas não relacionais simplificariam o início, mas exigiriam outras soluções para integridade e transações.

## Decisão

Manter o PostgreSQL como banco relacional e acessar os dados por contratos definidos na aplicação. `PostgresAccountRepository` implementa esses contratos e concentra SQL, mapeamento de registros e operações transacionais; a aplicação recebe o contrato, não a conexão ou os detalhes do driver.

## Consequências

- Chaves estrangeiras, restrições e transações do banco ajudam a preservar a integridade dos dados.
- A aplicação pode testar casos de uso com repositórios substitutos, sem depender de um servidor PostgreSQL.
- Consultas e recursos específicos do PostgreSQL ficam isolados no adaptador de infraestrutura.
- A execução local requer PostgreSQL e configuração de conexão, aumentando o custo de instalação e operação.
- Trocar de banco continua exigindo uma nova implementação e validação das consultas, restrições e semântica transacional; o contrato não elimina essas diferenças.
