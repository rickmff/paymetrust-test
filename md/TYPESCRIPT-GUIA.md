# TypeScript: o que é, como usar, e como foi usado neste repositório

Guia de estudo para a entrevista da PayMeTrust. Este ficheiro completa o [TYPESCRIPT.md](TYPESCRIPT.md): aqui estão o conceito, o vocabulário, o uso e o código deste repositório. As 19 perguntas de entrevista, com as respostas treinadas, continuam lá.

- **Parte 1:** o que é o TypeScript.
- **Parte 2:** o vocabulário, em 15 palavras.
- **Parte 3:** como se usa.
- **Parte 4:** como foi usado neste repositório.
- **Parte 5:** as perguntas, e onde ver cada uma no código.

Pronúncia: "strict" soa _strikt_, com o T final. "Generic" soa _dje-NÉ-rik_. "Narrowing" soa _NÉ-rou-ing_. "Unknown" soa _an-NOUN_.

---

## 1 · O que é

O TypeScript é JavaScript com tipos. O compilador confere o código antes de ele rodar. Depois os tipos são removidos, e o navegador recebe JavaScript normal.

**A diferença para o JavaScript**

|                                | JavaScript                            | TypeScript                               |
| ------------------------------ | ------------------------------------- | ---------------------------------------- |
| Um erro de digitação num campo | aparece em produção, como `undefined` | não compila                              |
| Mudar o formato de um dado     | procurar à mão onde ele é usado       | o compilador lista todos os lugares      |
| Um status novo                 | uma tela esquecida não mostra nada    | o build falha até cada tela o tratar     |
| No editor                      | sugestões fracas                      | autocomplete e renomear com segurança    |
| Com o app a rodar              | sem verificação                       | sem verificação: os tipos já não existem |

A última linha é o limite do TypeScript. Um dado que vem de fora (a API, um formulário, a URL) tem de ser validado com o app a rodar. Neste repositório quem faz isso é o Zod: ver [ZOD.md](ZOD.md).

**O que ele tem de especial**

- **Inferência:** na maior parte do código não se escreve o tipo. O TypeScript descobre-o.
- **Unions:** um valor que é uma de várias opções, como um status.
- **Narrowing:** depois de um `if`, o TypeScript sabe qual das opções é.
- **Generics:** um componente ou uma função que funciona com vários tipos, sem perder o tipo.
- **Modo `strict`:** as verificações mais rigorosas, a começar por `null` e `undefined`.
- **Tipos por forma:** se um objeto tem os campos pedidos, serve. O nome do tipo não importa.

---

## 2 · O vocabulário

| Termo                 | O que é                                                    | Como dizer sem código                      |
| --------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| Union                 | um valor que é uma de várias opções                        | "a union: pending, success or failed"      |
| Discriminated union   | objetos diferentes, distinguidos por um campo comum        | "each status has its own fields"           |
| Narrowing             | reduzir um tipo largo a um tipo exato, com uma verificação | "I check it first, then TypeScript knows"  |
| Generic               | um tipo com um parâmetro                                   | "a type parameter"                         |
| Constraint            | um limite no parâmetro de um generic                       | "a constraint: the row must have an id"    |
| `keyof`               | os nomes dos campos de um tipo                             | "the names of the fields of a type"        |
| Utility type          | um tipo feito a partir de outro                            | "the same type without one field"          |
| Type guard            | uma função que prova o tipo de um valor                    | "a function that checks what the value is" |
| `unknown`             | um valor que tem de ser conferido antes de ser usado       | "I must check it before I use it"          |
| `never`               | um valor que não pode existir                              | "nothing should be left"                   |
| `as const`            | fixar um valor nos seus literais, só de leitura            | "the exact values, read-only"              |
| `satisfies`           | conferir um valor contra um tipo, sem perder os literais   | "it checks that every status has a label"  |
| Branded type          | um tipo com uma etiqueta, que só existe para o compilador  | "a number that TypeScript treats as money" |
| Template literal type | um tipo de texto montado por combinação                    | "a resource plus an action"                |
| Type assertion        | dizer ao compilador "confia em mim" (`as`)                 | "a cast: I avoid it"                       |

---

## 3 · Como se usa

**Instalar**

Num projeto novo com Vite, o TypeScript já vem no modelo:

```bash
npm create vite@latest my-app -- --template react-ts
```

Atenção: o Vite só remove os tipos, não os confere. Quem confere é o compilador, `tsc`.

**A anatomia**

```ts
// 1. Uma union: uma lista fechada de opções
type Status = "pending" | "success" | "failed";

// 2. Um objeto por status: cada um só tem os campos que existem para ele
type Transaction =
  | { status: "pending"; id: string }
  | { status: "success"; id: string; settled_at: string }
  | { status: "failed"; id: string; failure_reason: string };

// 3. Narrowing: dentro de cada caso, o TypeScript sabe que campos existem
function describe(transaction: Transaction): string {
  switch (transaction.status) {
    case "pending":
      return "Waiting for the customer";
    case "success":
      return `Paid on ${transaction.settled_at}`;
    case "failed":
      return `Failed: ${transaction.failure_reason}`;
  }
}
```

**Um componente genérico**

```tsx
// A tabela não sabe o que é uma linha, mas confere as colunas contra ela.
type Column<Row> = { key: keyof Row; header: string };

type DataTableProps<Row extends { id: string }> = {
  rows: Row[];
  columns: Column<Row>[];
};

function DataTable<Row extends { id: string }>(props: DataTableProps<Row>) {
  /* ... */
}
```

**Os comandos do dia a dia**

| Comando                    | Para que serve                                        |
| -------------------------- | ----------------------------------------------------- |
| `npx tsc --noEmit`         | confere os tipos, sem gerar ficheiros                 |
| `npx tsc -b`               | confere todos os projetos listados no `tsconfig.json` |
| `npx tsc --noEmit --watch` | confere a cada alteração                              |
| No editor                  | o erro aparece sublinhado enquanto você escreve       |

**As cinco regras**

1. `strict` ligado desde o primeiro dia.
2. Sem `any`. Um dado de fora é `unknown` até ser conferido.
3. Escreva um tipo uma vez, e derive os outros dele.
4. Modele os estados com unions, para um estado impossível não se conseguir escrever.
5. Um `as` é uma promessa ao compilador. Use pouco, num lugar só, com um comentário a dizer porquê.

---

## 4 · Como foi usado neste repositório

### 4.1 Os ficheiros

| Ficheiro                                                                | Papel                                                    |
| ----------------------------------------------------------------------- | -------------------------------------------------------- |
| [tsconfig.json](../tsconfig.json)                                       | a lista dos três projetos que `tsc -b` confere           |
| [tsconfig.base.json](../tsconfig.base.json)                             | as regras que os três partilham                          |
| [tsconfig.app.json](../tsconfig.app.json)                               | o app: navegador, JSX, e o atalho `@/` para `src/`       |
| [tsconfig.node.json](../tsconfig.node.json)                             | a configuração do Vite, que roda em Node                 |
| [tsconfig.playwright.json](../tsconfig.playwright.json)                 | os testes do Playwright                                  |
| [src/lib/api.ts](../src/lib/api.ts)                                     | a função genérica `api`, a classe de erro e o type guard |
| [src/lib/assert-never.ts](../src/lib/assert-never.ts)                   | a verificação de "tratei todos os casos"                 |
| [src/lib/money.ts](../src/lib/money.ts)                                 | o dinheiro como tipo com etiqueta                        |
| [src/features/auth/schemas.ts](../src/features/auth/schemas.ts)         | o tipo das permissões                                    |
| [src/components/DataTable.tsx](../src/components/DataTable.tsx)         | a tabela genérica                                        |
| [src/components/FormTextField.tsx](../src/components/FormTextField.tsx) | o campo de formulário genérico                           |

### 4.2 A configuração

Em [tsconfig.base.json](../tsconfig.base.json):

- **`strict`:** liga as verificações rigorosas. A mais importante obriga a tratar `null` e `undefined`.
- **`noUncheckedIndexedAccess`:** o primeiro item de uma lista pode não existir, e o compilador obriga a tratar esse caso.
- **`noUnusedLocals` e `noUnusedParameters`:** código morto não compila.
- **`noFallthroughCasesInSwitch`:** um `case` sem `return` ou `break` não compila.
- **`erasableSyntaxOnly`:** só é aceite sintaxe que se pode apagar sem mudar o programa. Por isso não há `enum` no projeto: as listas fechadas são unions.
- **`verbatimModuleSyntax`:** um tipo tem de ser importado com `import type`.

Quem confere os tipos:

- `npm run typecheck` roda `tsc -b`.
- `npm run build` roda `tsc -b` antes do `vite build`.
- No CI, o passo `typecheck` vem primeiro, com o comentário "Vite only strips types; it never checks them."

Não existe nenhum `any` no código do app nem nos testes do Playwright.

### 4.3 Os tipos saem dos schemas

Os tipos dos dados não são escritos à mão. Cada um é tirado do schema do Zod que valida esse dado: `Transaction`, `Payout`, `User`, `Currency`, `Operator`.

Assim o formato existe num lugar só. Se o schema muda, o tipo muda, e o compilador mostra cada tela a corrigir.

### 4.4 Um estado impossível não se escreve

- **Os status são discriminated unions.** Uma transação `failed` tem `failure_reason`, e uma `pending` não tem ([transactions/schemas.ts](../src/features/transactions/schemas.ts)).
- **O narrowing aparece nas telas.** Na lista de payouts, o nome de quem decidiu só é lido depois de conferir que o status não é `pending_approval` ([PayoutsPage.tsx](../src/features/payouts/PayoutsPage.tsx)).
- **A decisão é uma union.** O tipo `Decision` aceita "aprovar", ou "rejeitar com um motivo". Rejeitar sem motivo não compila ([payouts/api.ts](../src/features/payouts/api.ts)).

### 4.5 Tratar todos os casos

Em [assert-never.ts](../src/lib/assert-never.ts), `assertNever` recebe um valor do tipo `never`.

A função `describe`, em [TransactionDetailPage.tsx](../src/features/transactions/TransactionDetailPage.tsx), tem um `switch` sobre o status que acaba em `assertNever`. Se alguém acrescentar um quinto status, essa linha deixa de compilar até a função o tratar.

### 4.6 Mapas que têm de cobrir tudo

O padrão `as const satisfies Record<...>` aparece em todos os mapas de rótulos:

| Mapa                 | Onde                                                               | O que o compilador exige                |
| -------------------- | ------------------------------------------------------------------ | --------------------------------------- |
| `OPERATOR_LABEL`     | [lib/operators.ts](../src/lib/operators.ts)                        | um rótulo para cada operadora           |
| `TRANSACTION_STATUS` | [transactions/schemas.ts](../src/features/transactions/schemas.ts) | rótulo, cor e ícone para cada status    |
| `PAYOUT_STATUS`      | [payouts/schemas.ts](../src/features/payouts/schemas.ts)           | o mesmo, para os payouts                |
| `STEP_OF_FIELD`      | [payouts/new/wizard.ts](../src/features/payouts/new/wizard.ts)     | uma etapa para cada campo do formulário |

O `satisfies` confere que não falta nenhuma chave. O `as const` guarda os valores exatos.

Há um caso de propósito sem este padrão: `OPERATOR_PREFIXES` tem uma anotação de tipo normal, porque ali se quer uma lista de texto qualquer, para o `includes` aceitar qualquer prefixo.

### 4.7 O dinheiro com etiqueta

Em [money.ts](../src/lib/money.ts), `MinorUnits` é um número inteiro com uma etiqueta. Para o JavaScript é um número normal. Para o TypeScript é um tipo à parte: um `number` comum, como o que o usuário digitou, não passa onde se espera dinheiro.

Só há duas portas de entrada: o schema, para o que vem da API, e `toMinorUnits`, para o que o usuário digitou.

Um teste em [money.test.ts](../src/lib/money.test.ts) confere isto no próprio compilador: se a etiqueta for removida, o teste deixa de compilar.

### 4.8 As permissões

Em [auth/schemas.ts](../src/features/auth/schemas.ts), `Permission` é um template literal type: um recurso, dois pontos, uma ação. O TypeScript monta todas as combinações válidas, e um erro de digitação numa permissão não compila.

### 4.9 Os generics

| Onde                                                     | O que o generic garante                                 |
| -------------------------------------------------------- | ------------------------------------------------------- |
| `api`, em [lib/api.ts](../src/lib/api.ts)                | o tipo do resultado vem do schema que se passa          |
| `pageOf`, no mesmo ficheiro                              | o envelope de uma lista, para qualquer tipo de item     |
| [DataTable.tsx](../src/components/DataTable.tsx)         | a chave de uma coluna tem de ser um campo real da linha |
| [FormTextField.tsx](../src/components/FormTextField.tsx) | o `name` só aceita campos de texto daquele formulário   |
| `sortSchema`, em [lib/sort.ts](../src/lib/sort.ts)       | só se ordena pelas colunas que a lista declarou         |

### 4.10 `unknown` e os type guards

- **A resposta da API** é `unknown` até passar pelo schema.
- **Um erro apanhado** é `unknown`. O type guard `isApiError` prova que é um erro da API antes de ler o status ([lib/api.ts](../src/lib/api.ts)).
- **[ErrorState.tsx](../src/components/ErrorState.tsx)** recebe `error: unknown` e faz essa verificação uma vez, para todas as telas.
- **O `sessionStorage`** também é lido como `unknown` e validado ([wizard.ts](../src/features/payouts/new/wizard.ts)).

### 4.11 Tipos derivados

| Utility type     | Onde                                                              | Para quê                                                           |
| ---------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| `Omit`           | `NewPayout`, em [payouts/api.ts](../src/features/payouts/api.ts)  | o corpo do pedido é o formulário, com o valor trocado por dinheiro |
| `Partial`        | o rascunho, em [wizard.ts](../src/features/payouts/new/wizard.ts) | guardar uma etapa de cada vez                                      |
| `Pick`           | [FormTextField.tsx](../src/components/FormTextField.tsx)          | aceitar só algumas props do campo do HeroUI                        |
| `ComponentProps` | [StatusChip.tsx](../src/components/StatusChip.tsx)                | as cores vêm do componente do HeroUI, não de uma lista copiada     |
| `NonNullable`    | os tipos de ordenação                                             | tirar o `undefined` de um tipo                                     |
| Tipo de um array | `Step`, em [wizard.ts](../src/features/payouts/new/wizard.ts)     | a lista das etapas é a única fonte dos seus nomes                  |

### 4.12 Os poucos `as`, e a única `interface`

Cada `as` do código tem um comentário a dizer porque é seguro:

- **O cursor da primeira página**, em [transactions/api.ts](../src/features/transactions/api.ts): o valor inicial é `null`, mas os seguintes são texto. O `as` alarga o tipo.
- **O valor do campo**, em [FormTextField.tsx](../src/components/FormTextField.tsx): o `name` só aceita campos de texto, mas o compilador não consegue seguir isso através do generic.
- **O contexto das etapas**, em [wizard.ts](../src/features/payouts/new/wizard.ts): o hook do router devolve o que se lhe disser. Fica num hook só, ao lado do tipo que a rota-pai fornece.

A única `interface` está em [RootLayout.tsx](../src/app/RootLayout.tsx). É "declaration merging": acrescentar campos a um tipo de uma biblioteca. Só uma `interface` faz isso.

---

## 5 · As perguntas

As perguntas e as respostas estão em [TYPESCRIPT.md](TYPESCRIPT.md). Não as repito aqui, para haver uma versão só de cada resposta.

Esta tabela liga cada pergunta ao código deste guia, para estudar. Na entrevista, os exemplos são de qualquer sistema de pagamentos, não deste repositório.

| Pergunta em TYPESCRIPT.md                 | Onde ver neste guia |
| ----------------------------------------- | ------------------- |
| 1 · `type` vs `interface`                 | 4.12                |
| 2 · `any`, `unknown`, `never`             | 4.2, 4.5, 4.10      |
| 3 · Generics                              | 4.9                 |
| 4 · Narrowing                             | 4.4, 4.10           |
| 5 · Utility types                         | 4.11                |
| 6 · Tipar um componente React             | 4.9                 |
| 7 · Tipos em sincronia com a API          | 4.3                 |
| 8 · `as const`                            | 4.6                 |
| 9 · `strict`                              | 4.2                 |
| 11 · Modelar os status de uma transação   | 4.4, 4.5            |
| 13 · Não escrever o mesmo tipo duas vezes | 4.3, 4.11           |
| 14 · Erros da API                         | 4.10                |
| 18 · Permissões por perfil                | 4.8                 |
| 19 · Dinheiro                             | 4.7                 |

---

## Como dizer os termos em voz alta

- `strict`: "strict mode"
- `keyof`: "the names of the fields of a type"
- `satisfies`: "it checks that nothing is missing"
- `never`: "nothing should be left"
- `Omit`: "the same type without one field"
- Branded type: "a number that TypeScript treats as money"
- Template literal type: "a resource plus an action"
- `tsc`: "the TypeScript compiler"

A lista completa está no fim de [TYPESCRIPT.md](TYPESCRIPT.md).
