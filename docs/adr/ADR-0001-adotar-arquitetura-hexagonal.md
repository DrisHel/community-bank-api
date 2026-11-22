# ADR-0001 — Adotar uma arquitetura hexagonal pragmática

## Status

Accepted

## Contexto

A API reúne regras de domínio bancário, casos de uso, endpoints HTTP e acesso ao banco. Misturar essas responsabilidades faria com que mudanças no Express ou no PostgreSQL se propagassem para as regras da aplicação, dificultando testes e evolução.

O projeto é acadêmico e precisa tornar explícitos o núcleo da aplicação e suas integrações externas, sem exigir a complexidade de uma arquitetura distribuída. As alternativas consideradas foram manter toda a lógica nos controladores, adotar uma arquitetura em camadas sem contratos de persistência ou separar o núcleo por portas e adaptadores.

## Decisão

Adotar uma arquitetura hexagonal pragmática: manter regras e casos de uso em `domain` e `application`, definir contratos de saída para persistência na aplicação e implementar esses contratos em `infrastructure`. A camada `presentation` atua como adaptador HTTP, e `app.ts` conecta os adaptadores às implementações concretas.

Os serviços da aplicação são os pontos de entrada dos casos de uso; não será criada uma interface adicional para cada serviço enquanto isso não trouxer benefício concreto.

## Consequências

- As regras centrais podem ser testadas sem iniciar o servidor HTTP ou conectar ao PostgreSQL.
- Adaptadores externos podem ser substituídos mantendo os contratos da aplicação.
- A composição das dependências fica concentrada no ponto de entrada da API.
- A organização adiciona contratos e separação entre arquivos, o que exige disciplina para evitar camadas artificiais.
- A arquitetura é pragmática, não uma implementação estrita de portas nomeadas para cada caso de uso; novos limites explícitos poderão ser necessários se o sistema crescer.
