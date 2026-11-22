# ADR-0003 — Representar valores monetários em centavos

## Status

Accepted

## Contexto

Valores financeiros não podem depender de aproximações de ponto flutuante. Depósitos, saques, pagamentos e benefícios alteram saldos, e uma falha entre a atualização do saldo e o registro da movimentação produziria dados inconsistentes.

Foram consideradas operações aritméticas diretamente com números decimais em ponto flutuante e a representação em unidades inteiras mínimas. Também foi necessário escolher como tratar concorrência em movimentações simultâneas sobre a mesma conta.

## Decisão

Converter valores monetários recebidos pela aplicação para centavos inteiros e realizar as validações e operações de saldo nessa unidade. No PostgreSQL, persistir os montantes em colunas decimais com escala monetária. Executar a atualização do saldo e a gravação da movimentação — e de seus registros associados, quando aplicável — na mesma transação, bloqueando a conta para atualização concorrente.

## Consequências

- A aritmética do domínio evita os erros de precisão mais comuns em cálculos com ponto flutuante.
- A transação impede que saldo e registros associados sejam confirmados apenas parcialmente.
- O bloqueio da conta protege atualizações concorrentes, mas pode reduzir a vazão quando muitas operações disputam a mesma conta.
- Conversões precisam ocorrer nas fronteiras entre HTTP, aplicação e banco; esquecê-las ou fazê-las mais de uma vez pode causar erros de escala.
- O modelo assume centavos como unidade mínima e não atende moedas que exijam outra escala sem uma evolução explícita.
