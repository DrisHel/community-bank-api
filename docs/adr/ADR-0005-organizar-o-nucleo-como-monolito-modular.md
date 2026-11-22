# ADR-0005 — Organizar os domínios como módulos de um monólito

## Status

Proposed

## Contexto

O escopo atual é pequeno, mas um banco digital real precisaria evoluir Accounts, Credit, Payments e outros domínios com regras e ciclos de mudança distintos. Um único módulo compartilhado sem fronteiras claras facilitaria dependências acidentais; separar cada domínio em um serviço desde o início acrescentaria custos de rede, operação e implantação para uma equipe e um produto ainda pequenos.

Os atributos prioritários são modificabilidade, clareza das responsabilidades e consistência das operações financeiras, mantendo baixa complexidade operacional. Foram consideradas uma aplicação sem fronteiras explícitas, microserviços por domínio e um monólito modular.

## Decisão

Para uma evolução do produto, organizar o núcleo como monólito modular, com módulos `Accounts`, `Credit` e `Payments` (e outros quando houver necessidade). Cada módulo será responsável por seus casos de uso, modelo e contratos públicos; dependências entre módulos ocorrerão apenas por interfaces explícitas ou casos de uso publicados, sem acesso direto às estruturas internas de outro módulo.

Manter um único processo e banco inicialmente. Uma separação em serviços será considerada somente quando houver necessidade comprovada de escala, disponibilidade ou autonomia de implantação.

## Consequências

- Fronteiras explícitas melhoram a coesão, a testabilidade e a possibilidade de evolução independente do modelo de cada domínio.
- A implantação permanece simples e operações que atravessam módulos podem compartilhar transações locais.
- O monólito reduz a sobrecarga de rede e de operação em comparação com microserviços.
- A separação exige disciplina para evitar dependências circulares e tabelas compartilhadas sem proprietário claro.
- Uma extração futura de módulo para serviço distribuído exigirá definir contratos de rede e lidar com consistência eventual; as fronteiras modulares reduzem, mas não eliminam, esse trabalho.
