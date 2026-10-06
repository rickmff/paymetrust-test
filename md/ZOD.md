# Zod: o que é, como usar, e as perguntas de entrevista

Guia de estudo para a entrevista da PayMeTrust. Na vaga, este tema aparece em "Forms & Validation" e em "API contracts". As explicações estão em português. As perguntas e as respostas da parte 5 estão em inglês, prontas para dizer em voz alta.

- **Parte 1:** o que é o Zod.
- **Parte 2:** o vocabulário, em 13 palavras.
- **Parte 3:** como se usa.
- **Parte 4:** como foi usado neste repositório.
- **Parte 5:** as 12 perguntas mais comuns, com a resposta pronta.

Pronúncia: "Zod" soa _zód_. "Schema" soa _SKI-ma_. "Parse" soa _párs_.

---

## 1 · O que é

O Zod é uma biblioteca de validação para TypeScript. Você descreve o formato de um dado uma vez, num "schema", e recebe duas coisas: a validação com o app a rodar, e o tipo do TypeScript.

**Porque é preciso**

Os tipos do TypeScript desaparecem quando o código é compilado. Um tipo para uma resposta da API é uma promessa, não uma garantia. Um dado que vem de fora tem de ser conferido com o app a rodar.

|                       | Só TypeScript                 | TypeScript + Zod                      |
| --------------------- | ----------------------------- | ------------------------------------- |
| Quando confere        | ao compilar                   | ao compilar e com o app a rodar       |
| Dado de fora          | acredita no que você declarou | confere de verdade                    |
| Onde o tipo é escrito | à mão                         | sai do schema                         |
| A API muda um campo   | dado errado na tela, sem erro | falha na entrada, com o nome do campo |

**O que ele tem de especial**

- **O tipo sai do schema.** Não se escreve o formato duas vezes.
- **Valida sem lançar erro**, se você quiser: devolve "válido, e aqui está o dado" ou "inválido, e aqui estão os erros".
- **Converte além de validar:** texto vira número, um telefone com espaços sai limpo.
- **Regras entre dois campos**, com a mensagem no campo certo.
- **Um formato por status:** cada status só aceita os campos que existem para ele.
- **Erros por campo**, prontos para um formulário.
- **Liga-se ao React Hook Form** com um resolver.

**Onde usar**

Em toda fronteira por onde entra dado de fora: a API, o formulário, a URL, o armazenamento do navegador. Dentro do app, depois de validado, bastam os tipos.

---

## 2 · O vocabulário

| Termo               | O que é                                                 | Como dizer sem código                     |
| ------------------- | ------------------------------------------------------- | ----------------------------------------- |
| Schema              | a descrição do formato de um dado                       | "a schema: the shape of the data"         |
| Parse               | validar e devolver o dado já tipado                     | "I validate it"                           |
| `safeParse`         | validar sem lançar erro: devolve sucesso ou falha       | "it tells me if the data is valid"        |
| `z.infer`           | o tipo do TypeScript tirado do schema                   | "the type comes from the schema"          |
| Refine              | uma regra à medida, até entre dois campos               | "a custom rule that reads two fields"     |
| Transform           | mudar o valor depois de validar                         | "the schema converts the value"           |
| Coerce              | converter antes de validar: texto vira número           | "the schema turns the text into a number" |
| Input e output      | o que entra no schema, e o que sai dele                 | "what the user types, and what comes out" |
| Discriminated union | vários formatos, escolhidos por um campo, como o status | "each status has its own fields"          |
| Brand               | uma etiqueta no tipo, que só existe para o TypeScript   | "a branded type"                          |
| Resolver            | a ponte entre o schema e o React Hook Form              | "the Zod resolver"                        |
| Issue               | um erro de validação, com o caminho do campo            | "an error on a field"                     |
| `.catch`            | um valor de reserva quando a validação falha            | "an invalid value is dropped"             |

---

## 3 · Como se usa

**Instalar**

```bash
npm install zod
```

**A anatomia**

```ts
import { z } from "zod";

// 1. Descrever o formato, uma vez
const TransactionSchema = z.object({
  id: z.string(),
  amount: z.number().int(), // inteiro, na menor unidade da moeda
  status: z.enum(["pending", "success", "failed"]),
});

// 2. O tipo sai do schema: não se escreve duas vezes
type Transaction = z.infer<typeof TransactionSchema>;

// 3. Validar o que vem de fora
const result = TransactionSchema.safeParse(await response.json());

if (!result.success) {
  // O contrato quebrou: mostra-se um erro, não um dado errado.
} else {
  result.data.amount; // tipado e conferido
}
```

**Num formulário**

```tsx
const FormSchema = z.object({
  recipient_name: z.string().trim().min(2, "Enter the recipient's full name"),
  // O input dá texto. O schema entrega um número.
  amount: z.coerce.number().int().positive("Amount must be greater than 0"),
});

const form = useForm({ resolver: zodResolver(FormSchema) });
```

Atenção: `z.coerce.number` converte com `Number()`, que também lê `1e3` e `0x1F4` como números. Num campo de dinheiro, confira primeiro o texto e só depois converta. É o que este repositório faz: ver 4.6.

**As peças do dia a dia**

| Peça                                         | Para que serve                                             |
| -------------------------------------------- | ---------------------------------------------------------- |
| `z.object`, `z.string`, `z.number`, `z.enum` | os blocos básicos                                          |
| `.optional()` e `.nullable()`                | o campo pode faltar, ou pode ser `null`                    |
| `.min()`, `.max()`, `.regex()`, `.int()`     | as regras, cada uma com a sua mensagem                     |
| `.parse()`                                   | valida, e lança erro se falhar                             |
| `.safeParse()`                               | valida, e devolve sucesso com o dado ou falha com os erros |
| `z.infer`                                    | o tipo                                                     |
| `.transform()` e `z.coerce`                  | converter o valor                                          |
| `.refine()` e `.superRefine()`               | uma regra à medida                                         |
| `z.discriminatedUnion()`                     | um formato por status                                      |
| `.extend()` e `.and()`                       | compor schemas                                             |

**As cinco regras**

1. Valide em toda fronteira: a API, o formulário, a URL, o armazenamento.
2. Escreva o schema e tire o tipo dele. Nunca os dois à mão.
3. Use `safeParse` quando a falha é um caso normal, e `parse` quando seria um bug.
4. A validação do frontend é para a experiência do usuário. O backend valida de novo.
5. Dê aos campos do formulário os mesmos nomes da API, para um erro do servidor voltar ao campo certo sem tradução.

---

## 4 · Como foi usado neste repositório

### 4.1 Os ficheiros

| Ficheiro                                                                        | Papel                                                    |
| ------------------------------------------------------------------------------- | -------------------------------------------------------- |
| [src/lib/api.ts](../src/lib/api.ts)                                             | valida todas as respostas, e o formato único de erro     |
| [src/lib/money.ts](../src/lib/money.ts)                                         | a moeda, e o valor em dinheiro com etiqueta              |
| [src/lib/operators.ts](../src/lib/operators.ts)                                 | a lista de operadoras                                    |
| [src/lib/sort.ts](../src/lib/sort.ts)                                           | a ordenação lida da URL                                  |
| [src/features/auth/schemas.ts](../src/features/auth/schemas.ts)                 | o usuário e as credenciais do login                      |
| [src/features/transactions/schemas.ts](../src/features/transactions/schemas.ts) | a transação por status, e os filtros da URL              |
| [src/features/payouts/schemas.ts](../src/features/payouts/schemas.ts)           | o payout por status, e um schema por etapa do formulário |
| [src/features/payouts/new/wizard.ts](../src/features/payouts/new/wizard.ts)     | o rascunho lido do `sessionStorage`                      |
| [src/features/dashboard/api.ts](../src/features/dashboard/api.ts)               | o resumo do dashboard                                    |

### 4.2 As quatro fronteiras

| Por onde entra o dado               | Onde é validado                                | O que acontece se for inválido                   |
| ----------------------------------- | ---------------------------------------------- | ------------------------------------------------ |
| Respostas da API                    | a função `api`, em `lib/api.ts`                | erro `contract_mismatch`, com o campo no console |
| Formulários                         | os schemas de cada feature, com `zodResolver`  | a mensagem aparece no campo                      |
| URL: filtros e ordenação            | `TransactionFiltersSchema` e `sortSchema`      | o valor inválido é descartado                    |
| `sessionStorage` e estado do router | `DraftSchema`, `RedirectState`, `CreatedState` | começa-se de novo, sem quebrar a tela            |

### 4.3 A fronteira da API

Em [lib/api.ts](../src/lib/api.ts):

- **A função `api` exige um schema.** Não há forma de chamar a API sem dizer que formato se espera.
- **A resposta passa por `safeParse`.** Se não bater, o console mostra o endpoint e o campo (`z.prettifyError`), e o usuário vê "The server sent an unexpected response".
- **O erro também é validado.** O Go responde sempre no mesmo formato de erro, e o `ProblemSchema` confere-o. Um corpo estranho vira um erro genérico.
- **`pageOf`** monta o envelope de qualquer lista: os itens e o cursor da página seguinte.

### 4.4 Um formato por status

Em [transactions/schemas.ts](../src/features/transactions/schemas.ts), o Go envia uma struct só, com campos opcionais. No frontend ela vira uma discriminated union:

| Status     | Campos a mais                |
| ---------- | ---------------------------- |
| `pending`  | nenhum                       |
| `success`  | `settled_at`                 |
| `failed`   | `failure_reason`             |
| `reversed` | `settled_at` e `reversed_at` |

Uma transação "failed sem motivo" é recusada na entrada, e não se consegue representar dentro do app. Os payouts seguem a mesma ideia: só um payout rejeitado tem `decision_reason`.

### 4.5 O dinheiro

Em [lib/money.ts](../src/lib/money.ts), `MinorUnitsSchema` é um número inteiro com uma etiqueta (`brand`):

- Um valor com casas decimais vindo da API falha na entrada.
- Um `number` comum não passa onde se espera dinheiro. Tem de vir de um schema ou de `toMinorUnits`.

### 4.6 O formulário de payout

Em [payouts/schemas.ts](../src/features/payouts/schemas.ts):

- **Telefone:** `transform` tira os espaços, e `pipe` valida o resultado. O usuário escreve "+225 07 01 02 03 04", e o schema entrega "+2250701020304".
- **Operadora e prefixo:** `superRefine` lê os dois campos. O `path` põe a mensagem no campo do telefone.
- **Valor:** o texto é conferido como texto, e só depois vira número, com `transform` e `pipe`. Só dígitos são aceites, com ou sem espaços ("25 000"). Um valor como "12.5" recebe a mensagem "XOF has no cents", e "abc" ou "1e3" recebem "Enter the amount in digits". Não se usa `z.coerce`, porque `Number()` leria "1e3" como mil.
- **Depois de virar número,** cada regra tem a sua mensagem: positivo, mínimo, máximo.
- **O formulário completo** é a junção dos schemas das duas etapas, com `.and()`.
- **Dois tipos:** `z.input` é o que o campo guarda (o valor é texto), e `z.output` é o que sai validado (o valor é número).

Estas regras são só para dar resposta rápida. O Go confere tudo de novo.

### 4.7 A URL

Em [transactions/schemas.ts](../src/features/transactions/schemas.ts), `TransactionFiltersSchema` usa `.optional().catch(undefined)`: `?status=banana` é descartado, e a página abre sem filtro.

Em [lib/sort.ts](../src/lib/sort.ts), `sortSchema` lê a ordenação como um texto só: `amount` é crescente, `-amount` é decrescente, e a vírgula combina colunas (`-amount,created_at`). Uma coluna que a lista não sabe ordenar, ou repetida, é descartada; as outras ficam.

### 4.8 O armazenamento e o estado do router

- **O rascunho do formulário**, em [wizard.ts](../src/features/payouts/new/wizard.ts): o `sessionStorage` é uma entrada de fora, porque o usuário pode editá-lo e uma versão antiga do app pode ter escrito outro formato. Se o `DraftSchema` falhar, começa-se um rascunho novo.
- **O estado do router** não tem tipo. Por isso [LoginPage.tsx](../src/features/auth/LoginPage.tsx) e [PayoutsPage.tsx](../src/features/payouts/PayoutsPage.tsx) passam-no por um schema pequeno antes de o usar.
- **O endereço para onde voltar depois do login** só é aceite se for um caminho de dentro do app. Um valor como "//outro-site" é recusado, e a pessoa vai para o dashboard.

### 4.9 O que sai dos schemas além da validação

- **Os tipos:** `Transaction`, `Payout`, `User` e os outros são todos `z.infer` de um schema.
- **As opções dos selects:** a lista de operadoras e de status vem de `.options` do próprio enum.
- **O resumo do dashboard** usa `z.record` sobre o enum dos status, que exige um número para cada status.

### 4.10 Uma decisão a conhecer: valores desconhecidos

- **Status:** um status que esta versão do app não conhece é recusado. Cada status precisa do seu rótulo e do seu tratamento, e mostrar um desconhecido podia enganar o usuário.
- **Permissões:** são texto livre de propósito. Se o backend lançar uma permissão nova, o login tem de continuar a funcionar.

### 4.11 Os testes

| Ficheiro                                                                         | Teste                                                              |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [transactions/schemas.test.ts](../src/features/transactions/schemas.test.ts)     | "accepts each status with the fields that belong to it"            |
|                                                                                  | "rejects a failed transaction that has no reason"                  |
|                                                                                  | "rejects a status this version of the app doesn't know"            |
|                                                                                  | "rejects an amount sent as a float"                                |
|                                                                                  | "drops an invalid filter instead of failing the whole page"        |
| [payouts/schemas.test.ts](../src/features/payouts/schemas.test.ts)               | "normalizes the phone number the way the API expects it"           |
|                                                                                  | "rejects a number from another operator, on the phone field"       |
|                                                                                  | "asks for an operator when none is chosen"                         |
| [lib/sort.test.ts](../src/lib/sort.test.ts)                                      | "drops a sort the list can't do instead of failing the whole page" |
| [payouts/new/NewPayout.test.tsx](../src/features/payouts/new/NewPayout.test.tsx) | "rejects a zero amount without calling the API"                    |

Os schemas são lógica pura, por isso são testados com testes unitários: rápidos e sem tela.

---

## 5 · As 12 perguntas mais comuns

A entrevista é só de voz, por isso nenhuma resposta tem código nem cita este repositório. Os exemplos são de qualquer sistema de pagamentos.

Frases entre [colchetes] falam da sua experiência. Só use se forem verdade.

### 1 · A sua experiência

**"What's your experience with schema validation, for example with Zod?"**

Escolha a variante verdadeira.

Se já usou no trabalho:

> "[I've used Zod at … to validate … .]"

Se ainda não usou em produção:

> "[In production I've validated forms with … .] I haven't used Zod in production yet. I've been practicing with it: validating API responses, each step of a multi-step form, and filters that come from the URL, and getting the TypeScript types from the schemas. So I know how I would use it in a real project."

### 2 · Porquê validar com o app a rodar

**"Why validate at runtime if you already have TypeScript?"**

> "Because TypeScript types disappear at runtime. A type for an API response is a promise, not a guarantee. If the backend renames a field, TypeScript can't see it: the screen shows a wrong amount, or it breaks far from the cause. So I validate the data when it enters the app. If it doesn't match, it fails right there, and the error says which field is wrong."

Âncora: **types disappear at runtime → a promise, not a guarantee → validate when it enters → the error names the field.**

### 3 · Onde validar

**"Where do you validate data in a frontend app?"**

> "Everywhere data comes in from outside. There are four places. API responses, because the contract can change. Forms, because users type anything. The URL, because anyone can edit a filter or an id. And browser storage, because an older version of the app may have written it. Inside the app, after that check, I trust the types."

Âncora: **API responses → forms → the URL → browser storage → inside, I trust the types.**

### 4 · Os tipos e a API

**"Our backend is written in Go. How do you keep your TypeScript types in sync with the API?"**

> "The role mentions API contracts with the Go team. If the contract is an OpenAPI spec, I generate the TypeScript types from it, so when a field changes, my code stops compiling. And at runtime, I validate the response with Zod. If the API sends something different, it fails loudly, and the error says which field is wrong."

Âncora: **API contracts → OpenAPI generates the types → Zod validates at runtime → fails loudly.**

É a mesma resposta da pergunta 7 de [TYPESCRIPT.md](TYPESCRIPT.md).

Se perguntarem "What if there is no OpenAPI spec?": "Then I write a Zod schema for each response, and I get the type from the schema, so I write it only once. A contract change still fails at the boundary."

Cuidado: a vaga fala em "REST APIs" e "API contracts", não em OpenAPI. Não diga "I know you are using OpenAPI".

### 5 · Uma resposta fora do contrato

**"What do you do when a response doesn't match what you expect?"**

> "I treat it as a broken contract, not as a normal error. The user sees a clear message, like 'the server sent an unexpected response', not a half-filled screen. The details go to the logs, with the endpoint and the field that failed, so the backend team and I can fix it fast. I don't show partial data, because in payments a wrong amount is worse than an error message."

Âncora: **a broken contract → a clear message → endpoint and field in the logs → no partial data.**

### 6 · Um status novo

**"What happens if the backend adds a new status that the frontend doesn't know?"**

> "It depends on the field. For a payment status, I prefer to fail loudly: every status needs its own label and its own handling, and showing an unknown one could mislead the user. So we agree on the contract first, and the frontend ships before the backend starts sending the new status. For less critical values, like a list of permissions, I accept values I don't know, so a new one doesn't break the login."

Âncora: **depends on the field → a status fails loudly → agree first, frontend ships first → permissions accept unknown values.**

### 7 · Um formulário

**"How do you validate a form?"**

> "I write one Zod schema for the form. It gives me the validation rules and the TypeScript type, so I write the fields only once. I connect it to React Hook Form with the Zod resolver. Then the field names are checked: a typo in a field name fails at compile time. And the submit handler receives data that is already validated and typed."

Âncora: **one Zod schema → rules + type → Zod resolver → field names checked → submit gets validated data.**

É a mesma resposta da pergunta 15 de [TYPESCRIPT.md](TYPESCRIPT.md).

### 8 · Uma regra com dois campos

**"How do you validate a rule that depends on two fields?"**

> "With a custom rule on the whole form, not on one field. For example, the phone number must belong to the selected mobile money operator, and each operator has its own prefixes. The rule reads both fields. And I attach the error to the phone field, so the message appears where the user can fix it."

Âncora: **a rule on the whole form → phone must belong to the operator → reads both fields → error on the phone field.**

### 9 · Texto que tem de ser número

**"An input gives you text, but the API wants a number. How do you handle it?"**

> "The schema converts it. So the form really has two types. The input type is what the user types, where the amount is text. The output type is what comes out after validation, where the amount is a whole number. The same for a phone number: the user types it with spaces, and the schema gives me the clean version the API expects. So the submit handler always gets data that is ready to send."

Âncora: **the schema converts → input type: text → output type: a whole number → phone with spaces comes out clean.**

### 10 · O frontend basta?

**"Is frontend validation enough?"**

> "No. Frontend validation is for the user experience: fast feedback, next to the field. The backend must validate again, because anyone can call the API directly. And the backend knows things the frontend can't, like whether a mobile money wallet really exists. So I also handle the server's validation errors: when it rejects a field, I show its message on that field."

Âncora: **user experience, not security → the backend validates again → the backend knows more → server errors go on the field.**

### 11 · Modelar os status

**"How would you model a transaction that can be pending, successful or failed?"**

> "I use a discriminated union. It is a union of object types that share one field, the status, with a different value in each one. A pending transaction has no extra fields. A successful one has a settlement date. A failed one has a failure reason. When I check the status, TypeScript knows which fields exist. So the screen can't show a failure reason for a successful payment."

Âncora: **one shared field, the status → different fields for each status → check the status → TypeScript knows the fields.**

É a mesma resposta da pergunta 11 de [TYPESCRIPT.md](TYPESCRIPT.md). Se quiser ligar ao Zod, acrescente: "And the schema checks the same thing at runtime: a failed transaction without a reason is rejected when it arrives."

### 12 · Filtros na URL

**"How do you handle filters or ids that come from the URL?"**

> "Everything in the URL is a string, and it is user input: anyone can type anything there. So I don't trust it. A route param, like the transaction id, can be missing, so I handle that case. For filters, like status and operator, I read them from the URL and validate them with a Zod schema. An invalid value is dropped instead of breaking the page. After that, the filters are typed."

Âncora: **URL = strings + user input → a param can be missing → filters validated with Zod → invalid value dropped → typed filters.**

É a mesma resposta da pergunta 17 de [TYPESCRIPT.md](TYPESCRIPT.md).

---

## Como dizer os termos em voz alta

- `z.infer`: "the type comes from the schema"
- `safeParse`: "it tells me if the data is valid, without throwing"
- `superRefine`: "a custom rule that reads two fields"
- `z.coerce`: "the schema turns the text into a number"
- `z.input` e `z.output`: "what the user types, and what comes out after validation"
- `.catch(undefined)`: "an invalid value is dropped"
- Discriminated union: "each status has its own fields"
- 422 = "four-two-two"
