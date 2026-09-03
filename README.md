# community-bank-api

API desenvolvida com Node.js, TypeScript e Express.

## Como rodar o projeto

### Pré-requisitos

- Node.js instalado
- npm instalado

### Instalação

Na raiz do projeto, instale as dependências:

```bash
npm install
```

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
