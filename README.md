# community-bank-api

API desenvolvida com Node.js, TypeScript e Express.

## Como rodar o projeto

### Pré-requisitos

- Node.js instalado
- npm instalado
- PostgreSQL instalado e em execução

### Instalação

Na raiz do projeto, instale as dependências:

```bash
npm install
```

### Configuração do PostgreSQL

Crie um banco chamado `community_bank` usando o `psql` ou o pgAdmin:

```sql
CREATE DATABASE community_bank;
```

Na raiz do projeto, crie o arquivo `.env` a partir do exemplo:

```bash
copy .env.example .env
```

Edite o `.env` e informe a senha do usuário do PostgreSQL:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=community_bank
DB_USER=postgres
DB_PASSWORD=sua_senha
PORT=3000
```

A API testa a conexão com o PostgreSQL ao iniciar. Se o banco estiver desligado ou as credenciais estiverem incorretas, o processo será encerrado com erro.

### Desenvolvimento

Inicie o servidor em modo de desenvolvimento:

```bash
npm run dev
```

O servidor será iniciado em `http://localhost:3000`.

### Verificação e build

Para verificar os tipos do projeto:

```bash
npm run typecheck
```

Para compilar o projeto:

```bash
npm run build
```

Após a compilação, execute a versão gerada com:

```bash
npm start
```

### Endpoints disponíveis

- `GET /` - retorna a mensagem da API
- `GET /health` - verifica o status da API
- `GET /customers` e `POST /customers` - lista e cadastra clientes (`name`, `email` opcional).
- `GET /accounts` - lista contas e o `customerId` associado.
- `POST /accounts` - abre conta vinculada. Envie `customerId` existente ou `holderName` para cadastrar o cliente junto; `balance` é opcional e começa em zero.
- `GET /accounts/:accountId/statement` - consulta o extrato da conta.
- `GET /accounts/:accountId/transactions` - alias para consulta de movimentações.
- `POST /accounts/:accountId/deposits` - registra depósito (`amount`).
- `POST /accounts/:accountId/withdrawals` - registra saque (`amount`).
- `POST /accounts/:accountId/transactions` - endpoint compatível para depósito ou saque (`type: "deposit" | "withdrawal"`, `amount`).
- `POST /credit/solidarity` - solicita crédito produtivo (`customerId`, `enterpriseName`, `purpose`, `amount`, `accountId` opcional).
- `POST /credit/personal` - solicita crédito pessoal/familiar (`customerId`, `purpose`, `amount`, `accountId` opcional).
- `GET /credit/requests?customerId=...` - consulta solicitações de crédito, opcionalmente filtradas por cliente.
- `POST /cards` - registra pedido de cartão popular (`accountId`, `cardholderName`).
- `GET /cards?accountId=...` - consulta pedidos de cartão, opcionalmente filtrados por conta.
- `POST /payments` - registra pagamento de conta e debita a conta (`accountId`, `payee`, `description`, `amount`).
- `GET /accounts/:accountId/payments` - consulta pagamentos registrados.
- `POST /accounts/:accountId/benefits` - registra benefício recebido e credita a conta (`benefitType`, `amount`, `reference` opcional).
- `GET /accounts/:accountId/benefits` - consulta benefícios recebidos.
- `GET /accounts/:accountId/managers` - lista responsáveis associados.
- `POST /accounts/:accountId/managers` - associa responsável (`name`, `email`, `role` opcional: `responsavel` ou `gerente`).
- `DELETE /accounts/:accountId/managers/:managerId` - remove associação de responsável.
- `GET /reports/daily` e `GET /reports/weekly` - consolida movimentações, valores por categoria, saldo líquido movimentado e contas ativas.

### Regras e escopo

- Depósitos, saques, pagamentos e benefícios usam valores monetários em centavos. Saldo e lançamento são confirmados na mesma transação PostgreSQL, com bloqueio da conta (`SELECT ... FOR UPDATE`). Saques e pagamentos não podem ultrapassar o saldo.
- Solicitações de crédito são persistidas com juros de 0% e status inicial `pending`; a API não aprova a solicitação nem libera dinheiro. Solicitação de empreendimento exige `enterpriseName`.
- Pedido de cartão é registrado como `requested`; não gera número de cartão nem integra operadora/emissor.
- Pagamento é debitado e registrado imediatamente; é um registro acadêmico, sem integração bancária ou liquidação externa.
- Benefícios são lançamentos de entrada informados por operador; não há integração com órgão governamental. Uma `reference` não pode ser repetida na mesma conta.
- Relatórios cobrem as últimas 24 horas (diário) ou os últimos 7 dias (semanal), em UTC conforme o PostgreSQL.
- Dados de demonstração são inseridos somente se ainda não existem. Na atualização, contas já existentes recebem clientes de migração para preservar os dados e permitir o vínculo obrigatório para novas contas.
- Não há autenticação, autorização por perfil ou aprovação de crédito implementadas; os endpoints são para demonstração acadêmica.

### Organização em camadas

- `src/presentation/account-controller.ts` recebe rotas de clientes/contas; `src/presentation/community-controller.ts` expõe as rotas de crédito, cartão, pagamento, benefício, responsáveis e relatórios.
- `src/application/account-service.ts` coordena contas, clientes e movimentações; `src/application/community-service.ts` implementa os casos de uso de crédito, cartões, pagamentos, benefícios, responsáveis e relatórios.
- `src/application/account-repository.ts` define contratos de persistência; as regras de saldo e conta ativa ficam em `src/domain/account.ts`.
- `src/infrastructure/postgres-account-repository.ts` implementa os contratos PostgreSQL e mantém operações financeiras atômicas.
- `public/` oferece a interface web de contas, movimentações e extrato; a comunicação com a API é HTTP/JSON.

Diagramas e explicação arquitetural: [diagrama atual do projeto](docs/Diagrama%20Arquitetural%20Atual%20-%20Banco%20Comunit%C3%A1rio%20Solid%C3%A1rio.pdf), [complemento de movimentações](docs/Banco%20Comunit%C3%A1rio%20Solid%C3%A1rio%20-%20Funcionalidade%20de%20movimenta%C3%A7%C3%B5es.pdf).
