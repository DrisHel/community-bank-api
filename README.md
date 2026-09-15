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
