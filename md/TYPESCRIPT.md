# TypeScript: perguntas e respostas (entrevista só verbal)

Entrevista 2 da PayMeTrust, por voz e sem compartilhar tela. As perguntas e as respostas estão em inglês, como vão ser ditas. As notas estão em português.

Nenhuma resposta depende de mostrar código. Cada uma explica a ideia com palavras e dá um exemplo de pagamentos. O código ficou recolhido em "Para entender", só para estudo.

- **Parte 1:** só as perguntas, para você se testar.
- **Parte 2:** as 9 perguntas treinadas na sessão, com a melhor resposta.
- **Parte 3:** 10 perguntas extras ligadas à vaga, com a resposta pronta.

**Como usar**

1. Abra a Parte 1, escolha uma pergunta e responda em voz alta em 30–45 segundos.
2. Só depois compare com a resposta.
3. No dia seguinte, repita as que saíram mal.

**Como falar de código sem mostrar código**

1. Diga o nome do conceito.
2. Explique numa frase simples o que ele faz.
3. Dê um exemplo de pagamentos: um status, um valor, um payout, uma permissão.
4. Diga o ganho: o que aquilo evita ou garante.

Não soletre sintaxe. Em vez de "key of Row", diga "the column must be a real field of the row". A lista completa está no fim.

**Frases para uma chamada só de voz**

- Para ganhar tempo: "Let me think for a second."
- Se não ouviu bem: "Sorry, could you repeat the question?"
- Se a pergunta for ambígua: "Do you mean … or …?"
- Se a pergunta pedir código: "It's hard to show without a screen, so let me describe it step by step."
- Se travar: "Let me start again."

**Três regras que valem para todas as respostas**

- Comece pela resposta, não por repetir a pergunta.
- Diga o ganho: a frase com "so…".
- Decida a frase final antes de começar a falar.

Frases entre [colchetes] falam da sua experiência. Só use se forem verdade; senão, troque ou corte.

---

## Parte 1 · Só as perguntas

### Da sessão

1. When do you use a `type` and when an `interface`? What's actually different between them?
2. What's the difference between `any`, `unknown` and `never`? Where would you use each one?
3. How do you use generics in your React code? Can you give me an example?
4. A value can be one of several types. How do you narrow it down to one? Give me one or two ways.
5. Which utility types do you use most, and what do you use them for?
6. How do you type a React component? Tell me about props, children and events.
7. Our backend is written in Go. How do you keep your TypeScript types in sync with the API?
8. What does `as const` do, and when do you use it?
9. What does `strict` mode do in TypeScript, and why do you turn it on?

### Extras

10. How comfortable are you with TypeScript? How do you use it day to day?
11. How would you model a transaction that can be pending, successful or failed?
12. How do you deal with values that can be null or undefined?
13. How do you avoid writing the same type twice?
14. How do you handle errors from the API?
15. How do you type a form with validation?
16. How do you type the data that comes from the server in your components?
17. How do you handle filters or ids that come from the URL?
18. How would you type role-based permissions in the frontend?
19. How do you represent money in the frontend?

---

## Parte 2 · As 9 perguntas da sessão, com a melhor resposta

### 1 · `type` vs `interface`

**"When do you use a `type` and when an `interface`? What's actually different between them?"**

> "Both can describe objects. I use `type` by default, because a type can be a union: a fixed list of options, like a payment status that is pending, success or failed. I use `interface` when I want to extend another one, or add fields to a library's types. And if the team has a convention, I follow it."

≈ 57 palavras

**Âncora:** both describe objects → `type` = unions → `interface` = extend → team convention.

**Se pedirem mais**

- "Can a type extend another type?" → "Yes. I can combine two types into one, with an intersection. For example, an admin is a user plus a list of permissions."

**Cuidado:** `type` não é "para variáveis individuais". Ele também descreve objetos.

<details>
<summary>Para entender (código, não é para dizer)</summary>

```ts
type Status = "pending" | "success" | "failed"; // só `type` faz isto

interface User {
  id: string;
}
interface Admin extends User {
  permissions: string[];
}
```

</details>

### 2 · `any`, `unknown`, `never`

**"What's the difference between `any`, `unknown` and `never`? Where would you use each one?"**

> "I avoid `any`, because it turns type checking off. I use `unknown` for data that comes from outside, like an API response: I must check it before I use it. And I use `never` when I go through all the statuses in a switch. In the default case, nothing should be left. So if someone adds a new status, the code stops compiling until I handle it."

≈ 68 palavras

**Âncora:** `any` = off → `unknown` = check first → `never` = nothing left, a new status breaks the build.

**Se pedirem mais**

- "Is `never` the same as `void`?" → "No. `void` is a function that returns nothing. `never` is a value that can't exist."
- "What do you do when you see `any` in a pull request?" → "I ask why it is there. Usually `unknown` with a check, or a real type from the API, solves it. If `any` is really needed, I ask for a comment, and I keep it in one small place."
- "Why a generic and not `unknown`?" → "`unknown` loses the type, so I must check again. A generic keeps the type that the caller already knows."

**Cuidado:** diga "I avoid `any`" e "I use `unknown`". "I used to" significa que você já não faz isso.

<details>
<summary>Para entender (código, não é para dizer)</summary>

```ts
function show(a: any, u: unknown) {
  a.toFixed(); // passa, e pode quebrar em produção
  u.toFixed(); // erro: cheque primeiro
  if (typeof u === "number") u.toFixed(); // ok
}

switch (transaction.status) {
  case "pending": // ...
  case "success": // ...
  case "failed": // ...
  default:
    return assertNever(transaction); // um status novo faz esta linha dar erro
}
```

**No app:** [src/lib/api.ts](src/lib/api.ts#L75-L89) (`unknown`) · [TransactionDetailPage.tsx](src/features/transactions/TransactionDetailPage.tsx#L20-L33) e [assert-never.ts](src/lib/assert-never.ts) (`never`)

</details>

### 3 · Generics

**"How do you use generics in your React code? Can you give me an example?"**

> "A generic is a type parameter: I write the component once, and whoever uses it chooses the type.
> A good example is a data table. The same table shows transactions and payouts, so the type of the row is a parameter. For a transactions table, the column names must be real fields of a transaction, like amount or status. If I misspell one, the build fails.
> Without the generic, I would need `any`, and lose that check."

≈ 77 palavras

**Âncora:** type parameter → one table, many row types → columns must be real fields → misspell = build fails → without it, `any`.

**Se pedirem mais**

- "Can you limit which types are accepted?" → "Yes, with a constraint. For example, the table needs an id for every row, so the row type must have an id."
- "Do you have to say the type every time you use the table?" → "No. TypeScript infers it from the rows I pass."
- "Where else do you use generics?" → "In the function that calls the API. I give it the schema of the response, and it returns data with that type. And `useState` in React is a generic too."

<details>
<summary>Para entender (código, não é para dizer)</summary>

```tsx
type Column<Row> = { key: keyof Row; header: string };

function DataTable<Row extends { id: string }>(props: {
  columns: Column<Row>[];
  rows: Row[];
}) {
  /* ... */
}

const columns: Column<Transaction>[] = [
  { key: "amount", header: "Amount" }, // ok
  { key: "amout", header: "Amount" }, // erro: não é um campo de Transaction
];
```

**No app:** [DataTable.tsx](src/components/DataTable.tsx#L4-L43) · [TransactionsPage.tsx](src/features/transactions/TransactionsPage.tsx#L22) · [api.ts](src/lib/api.ts#L56)

</details>

### 4 · Narrowing

**"A value can be one of several types. How do you narrow it down to one? Give me one or two ways."**

> "I narrow with a check, so TypeScript knows the exact type. One way is `typeof`: I check if the value is a string or a number. Another way is to check a field: if the transaction status is `failed`, TypeScript knows it has a failure reason. And for API data, I validate it with Zod first, so I can trust the types."

≈ 64 palavras

**Âncora:** check → TypeScript knows the exact type → `typeof` for simple values → status for objects → Zod for API data.

**Se pedirem mais**

- "What is a type guard?" → "A small function that does the check and tells TypeScript the result. For example, a function that answers: is this error an API error? After I call it, TypeScript knows the error has a status code."

**Cuidado:** no status você compara o valor: "if the status is failed". O `typeof` serve para distinguir texto de número.

<details>
<summary>Para entender (código, não é para dizer)</summary>

```ts
function show(value: string | number) {
  if (typeof value === "string") return value.toUpperCase(); // aqui é texto
  return value.toFixed(2); // aqui é número
}

if (transaction.status === "failed") {
  transaction.failure_reason; // só existe quando falhou
}
```

**No app:** [TransactionDetailPage.tsx](src/features/transactions/TransactionDetailPage.tsx#L20-L33) · [api.ts](src/lib/api.ts#L36-L38)

</details>

### 5 · Utility types

**"Which utility types do you use most, and what do you use them for?"**

> "The one I use most is `Partial`. [I've built many multi-step forms], and each step saves only part of the data. For a payout, step one saves the recipient, and step two saves the amount. `Partial` makes all fields optional, so each step can save its part.
> I also use `Omit` to remove a field: a create form is the same type without the id."

≈ 65 palavras

**Âncora:** `Partial` = all optional → multi-step form. `Omit` = remove → create form without the id. Don't write the type twice.

**Se pedirem mais**

- "Any others?" → "`Pick` takes only some fields, and `Record` is an object with one value for each key, like a label for each operator."

**Cuidado**

- O colchete tem de ser verdade. Se foi na TLScontact, diga "At TLScontact I built multi-step visa application forms".
- Quem recebe o dinheiro é o "recipient". "Receipt" é o recibo.

<details>
<summary>Para entender (código, não é para dizer)</summary>

```ts
type Payout = { id: string; name: string; amount: number };

Partial<Payout>; // { id?: string; name?: string; amount?: number }
Omit<Payout, "id">; // { name: string; amount: number }
```

**No app:** [wizard.ts](src/features/payouts/new/wizard.ts#L68) (`Partial`) · [payouts/api.ts](src/features/payouts/api.ts#L49) (`Omit`) · [operators.ts](src/lib/operators.ts#L13-L18) (`Record`)

</details>

### 6 · Tipar um componente React

**"How do you type a React component? Tell me about props, children and events."**

> "For props, I write a type with each field, and I mark the optional ones as optional.
> Children are typed as `ReactNode`, which is anything React can render.
> For events, React has a type for each one, like a change event of an input, so the value I read from it is typed.
> And when I wrap a native element, like a button, I reuse the props of the real button, so my button accepts everything a real button does."

≈ 80 palavras

**Âncora:** props = a type, some optional → children = `ReactNode` → events have their own types → reuse the props of the native element.

**Se pedirem mais**

- "Do you always write the event type?" → "No. When the handler is written inline, TypeScript infers it. I write the type only when the handler is a separate function."
- "How do you type state that starts empty?" → "I say what it will hold. For example, a selected transaction starts as null, so the state is 'a transaction or null'. Then TypeScript makes me check for null before I use it."
- "`React.FC` or a plain function?" → "A plain function with typed props. It is simpler, and it works with generic components."

**Cuidado:** reaproveitar as props do botão não é o mesmo que tipar o evento do clique. São duas coisas diferentes.

<details>
<summary>Para entender (código, não é para dizer)</summary>

```tsx
type PageHeaderProps = {
  title: string;
  description?: string; // ? = opcional
  children?: ReactNode; // qualquer coisa que o React consegue mostrar
};

function handleChange(event: ChangeEvent<HTMLInputElement>) {
  event.target.value; // o TypeScript sabe que é texto
}

type ButtonProps = ComponentProps<"button"> & { isLoading?: boolean };

const [selected, setSelected] = useState<Transaction | null>(null);
```

**No app:** [PageHeader.tsx](src/components/PageHeader.tsx#L3-L8) · [FormTextField.tsx](src/components/FormTextField.tsx#L40-L43)

</details>

### 7 · Tipos em sincronia com a API

**"Our backend is written in Go. How do you keep your TypeScript types in sync with the API?"**

> "The role mentions API contracts with the Go team. If the contract is an OpenAPI spec, I generate the TypeScript types from it, so when a field changes, my code stops compiling. And at runtime, I validate the response with Zod. If the API sends something different, it fails loudly, and the error says which field is wrong."

≈ 59 palavras

**Âncora:** API contracts → OpenAPI generates the types → Zod validates at runtime → fails loudly.

**Se pedirem mais**

- "What if there is no OpenAPI spec?" → "Then I write a Zod schema for each response, and I get the type from the schema, so I write it only once. A contract change still fails at the boundary."
- "Why validate if you already have types?" → "TypeScript types disappear at runtime. A type for a response is a promise, not a guarantee."

**Pergunta para fazer a eles:** "How do you define the API contracts with the Go team: an OpenAPI spec, or something else?"

**Cuidado:** a vaga fala em "REST APIs" e "API contracts", não em OpenAPI. Não diga "I know you are using OpenAPI".

<details>
<summary>Para entender (código, não é para dizer)</summary>

```ts
const TransactionSchema = z.object({ id: z.string(), amount: z.number() });
type Transaction = z.infer<typeof TransactionSchema>; // o tipo sai do schema

const result = TransactionSchema.safeParse(await response.json());
if (!result.success) {
  // contrato quebrado: mostro um erro, em vez de dado errado
}
```

**No app:** [schemas.ts](src/features/transactions/schemas.ts#L32-L42) · [api.ts](src/lib/api.ts#L75-L89)

</details>

### 8 · `as const`

**"What does `as const` do, and when do you use it?"**

Também pode vir assim: "Do you use enums in TypeScript?"

> "I use `as const` instead of enums. When I have a list of statuses, like pending, success and failed, `as const` keeps the exact values and makes the list read-only. From that list I get the union type, and I use the same list to build a filter on the screen. So I write it only once."

≈ 59 palavras

**Âncora:** instead of enums → keeps the exact values, read-only → type from the list → same list builds the filter → write it once.

**Se pedirem mais**

- "Why not an enum?" → "An enum creates real JavaScript code. A union is only a type, so it disappears after compile. And the API sends plain strings, which fit a union directly."
- "What does `satisfies` do?" → "It checks that an object has the right shape, for example one label for every status, without losing the exact values."

**Cuidado:** `as const` não é o mesmo que dizer "trata isto como uma Transaction". O primeiro pede exatidão; o segundo é "confia em mim" e ninguém confere.

<details>
<summary>Para entender (código, não é para dizer)</summary>

```tsx
const STATUSES = ["pending", "success", "failed"] as const;

type Status = (typeof STATUSES)[number]; // "pending" | "success" | "failed"

STATUSES.map((status) => <option key={status}>{status}</option>); // o filtro
```

**No app:** [operators.ts](src/lib/operators.ts#L13-L18) · [schemas.ts](src/features/transactions/schemas.ts#L45-L54)

</details>

### 9 · `strict`

**"What does `strict` mode do in TypeScript, and why do you turn it on?"**

> "`strict` turns on the strictest checks of TypeScript. It checks values that can be undefined or null, so I must handle them before I use them. It also blocks implicit `any`: if I forget a type, it is an error. So the errors show up while I write the code, not in production. And Vite doesn't check types, so the build runs the TypeScript compiler first, and then the Vite build."

≈ 72 palavras

**Âncora:** strictest checks → null checks → no implicit `any` → errors while I write → Vite doesn't check types, compiler first.

**Se pedirem mais**

- "Any other option you like?" → "There is one that treats an item of a list as possibly missing. So I must check that the item exists before I use it."

Essa opção chama-se `noUncheckedIndexedAccess`. Não precisa dizer o nome.

**Cuidado:** Vite pronuncia-se _vit_ (como "veet").

<details>
<summary>Para entender (código, não é para dizer)</summary>

```ts
const tx = transactions.find((t) => t.id === id); // Transaction | undefined
tx.amount; // erro com strict
if (tx) tx.amount; // ok

function format(value) {} // erro com strict: faltou o tipo
```

**No app:** [tsconfig.base.json](tsconfig.base.json#L11-L12) · o script `build` em [package.json](package.json)

</details>

---

## Parte 3 · 10 perguntas extras, com a resposta pronta

Estas não foram treinadas na sessão. Leia, entenda a ideia e depois responda em voz alta.

### 10 · A sua experiência com TypeScript

**Por que pode cair:** o tema da entrevista é "TypeScript proficiency". Numa conversa só de voz, costuma ser a primeira pergunta.

**"How comfortable are you with TypeScript? How do you use it day to day?"**

> "[I've used TypeScript in production for X years, with React and with Vue.] Day to day, I use strict mode. I model fixed options, like a payment status, as union types. I type and validate the API responses, because that is where most bugs come from. And I try to derive types instead of writing them twice. For me, the goal is that mistakes show up while I write the code, not in production."

≈ 74 palavras

**Âncora:** experience → strict → unions for statuses → validate API responses → derive types → mistakes while I write, not in production.

Cada frase desta resposta abre uma pergunta deste ficheiro. Se o entrevistador puxar por uma, você já tem a resposta.

**Se pedirem mais**

- "Can you give an example where TypeScript caught a real problem?" → conte um caso real seu, de um projeto de trabalho. Um formato simples: o que mudou, o que o compilador mostrou, e o que isso evitou.

**Cuidado:** preencha o colchete com os anos e os projetos verdadeiros.

### 11 · Modelar os status de uma transação

**Por que pode cair:** a vaga pede que "amounts, fees and statuses" apareçam "clearly and accurately".

**"How would you model a transaction that can be pending, successful or failed?"**

Também pode vir assim: "What is a discriminated union?"

> "I use a discriminated union. It is a union of object types that share one field, the status, with a different value in each one. A pending transaction has no extra fields. A successful one has a settlement date. A failed one has a failure reason. When I check the status, TypeScript knows which fields exist. So the screen can't show a failure reason for a successful payment."

≈ 69 palavras

**Âncora:** one shared field, the status → different fields for each status → check the status → TypeScript knows the fields.

**Se pedirem mais**

- "What happens when the backend adds a new status?" → "The response no longer matches my schema, so it fails at the boundary with a clear error. Then I add the status, and the compiler shows me every screen that must handle it."

<details>
<summary>Para entender (código, não é para dizer)</summary>

```ts
type Transaction =
  | { status: "pending" }
  | { status: "success"; settled_at: string }
  | { status: "failed"; failure_reason: string };
```

**No app:** [schemas.ts](src/features/transactions/schemas.ts#L32-L41) · [TransactionDetailPage.tsx](src/features/transactions/TransactionDetailPage.tsx#L20-L33)

</details>

### 12 · Valores que podem ser `null` ou `undefined`

**Por que pode cair:** é do dia a dia, e o caso do zero importa em dinheiro.

**"How do you deal with values that can be null or undefined?"**

> "First, strict mode: TypeScript doesn't let me use a value that can be missing until I check it.
> To read a field safely, I use optional chaining: if the object doesn't exist, I get undefined instead of a crash.
> For a default value, I use nullish coalescing. It only replaces null and undefined. That matters for money: with the older 'or' operator, an amount of zero is replaced by the default. With nullish coalescing, zero stays zero."

≈ 77 palavras

**Âncora:** strict makes me check → optional chaining = no crash → nullish coalescing = default only for null and undefined → zero stays zero.

**Se pedirem mais**

- "What about the exclamation mark, the non-null assertion?" → "It tells TypeScript 'trust me, this is not null'. I avoid it, because it hides the problem instead of handling it."

**Pronúncia:** "optional chaining" = _ÓP-sho-nal TCHEI-ning_ · "nullish coalescing" = _NÂ-lish cou-a-LÉ-sing_.

<details>
<summary>Para entender (código, não é para dizer)</summary>

```ts
const name = user?.profile?.name; // optional chaining: undefined se user não existir
const shown = fee ?? "-"; // nullish coalescing: fee = 0 → mostra 0
const wrong = fee || "-"; // "or": fee = 0 → mostra "-", errado para dinheiro
const sure = user!.name; // non-null assertion: "confia em mim"
```

**No app:** [TransactionsPage.tsx](src/features/transactions/TransactionsPage.tsx#L65)

</details>

### 13 · Não escrever o mesmo tipo duas vezes

**Por que pode cair:** mostra maturidade em TypeScript, e liga formulários, API e tabelas.

**"How do you avoid writing the same type twice?"**

> "I pick one source and derive the rest from it. For API data and forms, the source is the Zod schema: it gives me the validation and the type. For variations, I use utility types: a create form is the same type without the id. And for a fixed list, like the statuses, I write the list once and get the type from it. So when something changes, I change one place, and the compiler shows me what else must change."

≈ 81 palavras

**Âncora:** one source → Zod schema gives the type → utility types for variations → list written once → change one place.

**Se pedirem mais**

- "What do `keyof` and `typeof` do?" → "`typeof` gives me the type of a value I already have. `keyof` gives me the names of the fields of a type. In a table, I use it so a column can only point to a real field."

<details>
<summary>Para entender (código, não é para dizer)</summary>

```ts
type Transaction = z.infer<typeof TransactionSchema>; // o tipo sai do schema

const LABELS = { pending: "Pending", success: "Paid" };
type Labels = typeof LABELS; // { pending: string; success: string }
type Status = keyof typeof LABELS; // "pending" | "success"
```

Existem dois `typeof`. O que distingue texto de número roda com o app. O que tira o tipo de um valor só existe nos tipos.

**No app:** [DataTable.tsx](src/components/DataTable.tsx#L6) · [payouts/api.ts](src/features/payouts/api.ts#L47-L54)

</details>

### 14 · Erros da API

**Por que pode cair:** a vaga pede "properly handling loading, empty and error states".

**"How do you handle errors from the API?"**

> "In TypeScript, a caught error is `unknown`, because anything can be thrown. So I check what it is before I read it. I use one error class for API errors, with the HTTP status and an error code.
> Then the screen decides by status. A 401 sends the user to login. A 422 shows the messages on the form fields. A 500 or a network failure shows a retry button.
> And I never retry a payment automatically, because it could charge twice."

≈ 82 palavras

**Âncora:** caught error = `unknown` → check it → one error class → 401 login, 422 form fields, 500 retry → never retry a payment.

**Como dizer os números:** 401 = "four-oh-one" · 422 = "four-two-two" · 500 = "five hundred".

<details>
<summary>Para entender (código, não é para dizer)</summary>

```ts
function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

if (isApiError(error) && error.status === 401) {
  // vai para o login
}
```

**No app:** [api.ts](src/lib/api.ts#L36-L38) · [ErrorState.tsx](src/components/ErrorState.tsx#L14-L17)

</details>

### 15 · Formulário com validação

**Por que pode cair:** a vaga cita "Forms & Validation" e "multi-step forms".

**"How do you type a form with validation?"**

> "I write one Zod schema for the form. It gives me the validation rules and the TypeScript type, so I write the fields only once. I connect it to React Hook Form with the Zod resolver. Then the field names are checked: a typo in a field name fails at compile time. And the submit handler receives data that is already validated and typed."

≈ 64 palavras

**Âncora:** one Zod schema → rules + type → Zod resolver → field names checked → submit gets validated data.

**Se pedirem mais**

- "How do you validate a multi-step form?" → "Each step has its own schema and validates only its fields. At the end, I validate the whole form again before I send it. If the server rejects a field, I send the user back to the step that owns that field."
- "A number input gives text. How do you handle it?" → "The schema converts it. So the form really has two types: what the user types, where the amount is text, and what comes out after validation, where it is a number."
- "Is frontend validation enough?" → "No. It is for the user experience. The backend must validate again."

<details>
<summary>Para entender (código, não é para dizer)</summary>

```ts
const RecipientSchema = z.object({
  recipient_name: z.string().min(1, "Enter the name"),
  recipient_phone: z.string().min(8, "Enter the phone number"),
});
type RecipientForm = z.infer<typeof RecipientSchema>;

const form = useForm<RecipientForm>({ resolver: zodResolver(RecipientSchema) });
form.register("recipient_name"); // ok
form.register("recipient_nam"); // erro de compilação
```

**No app:** [RecipientStep.tsx](src/features/payouts/new/RecipientStep.tsx#L19-L34) · [payouts/schemas.ts](src/features/payouts/schemas.ts#L117-L121)

</details>

### 16 · Dados do servidor nos componentes

**Por que pode cair:** a vaga cita "Data Fetching & Caching" e os estados "loading, empty and error".

**"How do you type the data that comes from the server in your components?"**

> "I don't type the hook by hand. The function that fetches the data returns a typed result, because the response is validated with Zod. The query hook infers the type of the data from that function.
> And while the request is loading, the data is undefined, so TypeScript makes me handle loading and error before I show the data. That gives me the states of every screen: loading, error and data. And for a list, a fourth one: empty."

≈ 80 palavras

**Âncora:** typed fetch function → the hook infers the type → data is undefined while loading → loading, error, data, and empty for lists.

A vaga não diz qual biblioteca usam. Se não for o TanStack Query, a ideia é a mesma: a função devolve um dado tipado e validado, e o hook herda esse tipo.

<details>
<summary>Para entender (código, não é para dizer)</summary>

```tsx
const query = useQuery(transactionQueries.detail(id)); // data: Transaction | undefined

if (query.isPending) return <Skeleton />;
if (query.isError) return <ErrorState title="Error" error={query.error} />;

query.data.amount; // aqui o TypeScript sabe que data existe
```

**No app:** [transactions/api.ts](src/features/transactions/api.ts#L21-L60) · [TransactionDetailPage.tsx](src/features/transactions/TransactionDetailPage.tsx#L36-L41)

</details>

### 17 · Filtros e ids na URL

**Por que pode cair:** React Router está na stack, e tabelas grandes têm filtros.

**"How do you handle filters or ids that come from the URL?"**

> "Everything in the URL is a string, and it is user input: anyone can type anything there. So I don't trust it. A route param, like the transaction id, can be missing, so I handle that case. For filters, like status and operator, I read them from the URL and validate them with a Zod schema. An invalid value is dropped instead of breaking the page. After that, the filters are typed."

≈ 73 palavras

**Âncora:** URL = strings + user input → a param can be missing → filters validated with Zod → invalid value dropped → typed filters.

**Se pedirem mais**

- "Why keep the filters in the URL?" → "They survive a refresh and the back button, and the user can share the link."

<details>
<summary>Para entender (código, não é para dizer)</summary>

```ts
const FiltersSchema = z.object({
  status: StatusSchema.optional().catch(undefined), // ?status=banana vira undefined
});

const [searchParams] = useSearchParams();
const filters = FiltersSchema.parse(Object.fromEntries(searchParams));
```

**No app:** [TransactionsPage.tsx](src/features/transactions/TransactionsPage.tsx#L57-L61) · [schemas.ts](src/features/transactions/schemas.ts#L56-L65)

</details>

### 18 · Permissões por perfil

**Por que pode cair:** a vaga pede "role-based permissions", e é um ponto forte seu: Keycloak e RBAC na TLScontact.

**"How would you type role-based permissions in the frontend?"**

> "I type each permission as a resource plus an action, for example 'payout, approve'. With a template literal type, TypeScript builds every valid combination, so a typo in a permission name fails at compile time.
> The screens ask one function: can this user do this? It checks permissions, not role names, because roles change.
> And hiding a button is only user experience: the API must check the same permission again."

≈ 70 palavras

**Âncora:** resource + action → template literal type → typo fails at compile time → one function checks permissions, not roles → the API checks again.

Se puder, abra com a sua experiência real: "[At TLScontact, the roles came from Keycloak.]" Confirme os detalhes antes de usar.

**Se pedirem mais**

- "Where do the permissions come from?" → "From the backend, with the user's session. The frontend doesn't decide them; it only reads them."

**Pronúncia:** "template literal" = _TEM-plet LI-te-ral_.

<details>
<summary>Para entender (código, não é para dizer)</summary>

```ts
type Resource = "transaction" | "payout";
type Action = "read" | "create" | "approve";
type Permission = `${Resource}:${Action}`; // "payout:approve" | "payout:read" | ...

can("payout:approve"); // ok
can("payout:aprove"); // erro de compilação
```

**No app:** [auth/schemas.ts](src/features/auth/schemas.ts#L3-L10) · [session.ts](src/features/auth/session.ts#L17-L25)

</details>

### 19 · Dinheiro

**Por que pode cair:** é uma fintech, e a vaga fala em "transaction amounts, fees".

**"How do you represent money in the frontend?"**

> "As an integer in the smallest unit of the currency, never a float, because floats make rounding errors.
> The API sends integers, and I only format the amount when I show it, with the browser's built-in number formatter, which knows that the CFA franc has no decimals.
> To be safer, I use a branded type for the amount: it is still a number, but TypeScript doesn't let me pass a normal number where money is expected."

≈ 75 palavras

**Âncora:** integer, smallest unit, never a float → format only when I show it → CFA franc has no decimals → branded type.

O "brand" é uma etiqueta que só existe para o TypeScript. Com o app rodando, o valor é um número normal. O formatador do navegador chama-se `Intl.NumberFormat`.

**Se pedirem mais**

- "Why not a float?" → "In JavaScript, zero point one plus zero point two is not exactly zero point three. With money, that becomes a wrong total."

<details>
<summary>Para entender (código, não é para dizer)</summary>

```ts
type MinorUnits = number & { readonly __brand: "MinorUnits" };

function formatMoney(amount: MinorUnits, currency: "XOF" | "GHS"): string {
  /* ... */
}

formatMoney(1500, "XOF"); // erro: um number comum não serve
formatMoney(toMinorUnits(1500, "XOF"), "XOF"); // ok
```

**No app:** [money.ts](src/lib/money.ts#L7-L40) · [Money.tsx](src/components/Money.tsx)

</details>

---

## Como dizer sem soletrar o código

- Um campo com `?`: "an optional field"
- `A | B`: "a union: A or B"
- `<T>`: "a type parameter"
- `extends` num generic: "a constraint: the type must have an id"
- `keyof`: "the names of the fields of a type"
- `z.infer`: "the type comes from the schema"
- `?.`: "optional chaining" · `??`: "nullish coalescing" · `!`: "the non-null assertion"
- `tsc`: "the TypeScript compiler"
- `XOF`: "the CFA franc"

## Erros a evitar (apareceram na sessão)

- "I used to" quer dizer "eu costumava" e já não faço. Para um hábito atual, diga "I use" ou "I usually".
- Não feche com "so yeah, that's pretty much it", "or whatever" ou "or something like that".
- Não ponha "right?" no fim da frase, e não repita a pergunta antes de responder.
- "As far as I know", não "as long as I know".
- "TypeScript knows", sem "the". "An `if`", não "a if".
- "Recipient" (_ri-SI-pi-ent_) é quem recebe. "Receipt" (_ri-SIIT_) é o recibo.
- "Multi-step forms", não "form steps". "Amount" e "status", não "price" e "title".
- Pronúncia: "Vite" = _vit_ · "unknown" = _an-NOUN_, com o N final · "error" = _EH-rer_ · "const" com o T final.
- Não afirme o que não sabe sobre a empresa. Pergunte.
