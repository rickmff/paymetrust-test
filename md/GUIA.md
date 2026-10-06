# Guia passo a passo: Merchant Console

Um app pequeno com a stack da vaga da PayMeTrust. Cada passo abaixo cobre um
requisito da vaga, na ordem em que você construiria do zero.

Cada passo tem: **objetivo**, **arquivos**, **como fazer**, **atenção** e
**na entrevista** (pergunta em inglês e a frase para usar, como combinamos).
As referências `Doc 1 · Q4` e `Doc 2 · T9` apontam para os seus dois roteiros.

## Passo 0 · Rodar

O Go **não está instalado na sua máquina**. Instale antes de tudo:

```bash
brew install go
npm install
npm run api   # terminal 1: API em Go, porta 8080
npm run dev   # terminal 2: app em http://localhost:5173
```

Contas (senha `demo1234`): `viewer@demo.test`, `maker@demo.test`,
`approver@demo.test`. A tela de login tem um botão para cada uma.

```bash
npm run check   # tipos + lint + formatação + 53 testes (Vitest)
npm run e2e     # 12 testes no navegador real (Playwright sobe API e app sozinho)
```

## Mapa: requisito da vaga → onde está

| Requisito                  | Onde                                                                             | Passo |
| -------------------------- | -------------------------------------------------------------------------------- | ----- |
| Contrato de API com Go     | [api/](api/), [src/lib/api.ts](src/lib/api.ts)                                   | 1, 4  |
| Vite, TypeScript           | [vite.config.ts](vite.config.ts), [tsconfig.app.json](tsconfig.app.json)         | 2     |
| Tailwind, HeroUI           | [src/index.css](src/index.css), [src/components/](src/components/)               | 3, 9  |
| Data fetching e caching    | [src/app/query-client.ts](src/app/query-client.ts)                               | 6     |
| React Router               | [src/app/router.tsx](src/app/router.tsx)                                         | 7     |
| RBAC                       | [src/features/auth/](src/features/auth/), [api/http.go](api/http.go)             | 8     |
| Componentes compartilhados | [src/components/](src/components/)                                               | 9     |
| Data tables                | [TransactionsPage.tsx](src/features/transactions/TransactionsPage.tsx)           | 10    |
| Detail pages               | [TransactionDetailPage.tsx](src/features/transactions/TransactionDetailPage.tsx) | 11    |
| Multi-step forms           | [src/features/payouts/new/](src/features/payouts/new/)                           | 12    |
| Approval flows             | [PayoutsPage.tsx](src/features/payouts/PayoutsPage.tsx)                          | 13    |
| Dashboards                 | [DashboardPage.tsx](src/features/dashboard/DashboardPage.tsx)                    | 14    |
| Testes de componente       | [src/test/](src/test/), arquivos `*.test.tsx`                                    | 15    |
| E2E (Playwright)           | [e2e/](e2e/), [playwright.config.ts](playwright.config.ts)                       | 16    |
| Git, CI                    | [.github/workflows/ci.yml](.github/workflows/ci.yml)                             | 17    |

---

## Passo 1 · O contrato: API REST em Go

**Objetivo:** decidir o contrato antes de desenhar tela. A API usa só a
biblioteca padrão do Go e guarda os dados em memória.

**Arquivos:** [main.go](api/main.go) (rotas) · [http.go](api/http.go) (erro
único, middleware) · [store.go](api/store.go) (structs = contrato) ·
[handlers.go](api/handlers.go)

**Como fazer**

1. Rotas com método e parâmetro no padrão: `"GET /api/transactions/{id}"`.
2. Um formato de erro para tudo: `{ status, code, detail, errors: [{ field, message }] }`.
3. Toda lista responde `{ items, next_cursor }`. O cursor é a chave de ordenação do último item, `(valores, id)` com um valor por campo do `sort`, mais o `sort` a que pertence.
4. Dinheiro é `int64` na menor unidade da moeda, sempre com `currency`.
5. Middleware `can("payout:approve")` responde 401 ou 403. É a fonte da verdade do RBAC.
6. `POST /payouts` exige o header `Idempotency-Key`.

**Atenção**

- Slice `nil` em Go vira `null` no JSON, não `[]`. Por isso `make([]T, 0)`.
- Um `float` enviado para um campo `int64` dá 400. O tipo é o contrato.
- Campos `omitempty` são opcionais no Go. No front eles viram uma union discriminada (passo 11).
- Status HTTP usados: 401 sem sessão, 403 sem permissão, 409 estado mudou, 422 campo inválido.
- As rotas `/api/test/*` simulam a operadora e só existem com `ENABLE_TEST_ROUTES=1`.

**Na entrevista** (Doc 1 · Q9)

- **"How do you agree on an API contract with the backend team?"**
  Before coding, we agree on one error shape, pagination rules, status enums and money as integers. Ideally an OpenAPI spec generates the TypeScript types; in this app, Zod schemas mirror the Go structs, so a contract change fails at the boundary.
- **"What's the difference between 401, 403, 409 and 422?"**
  401: not signed in. 403: signed in but not allowed. 409: the resource changed under you, like a payout already decided. 422: valid JSON, invalid data, with one error per field.
- **"Any Go detail a frontend developer should know?"**
  A nil slice encodes as `null`, not `[]`, and optional fields come from `omitempty`. I ask for lists that are never null and I validate responses at runtime.

## Passo 2 · Vite + TypeScript estrito

**Objetivo:** projeto que não deixa erro de tipo chegar à produção.

**Arquivos:** [vite.config.ts](vite.config.ts) · [tsconfig.base.json](tsconfig.base.json) · [tsconfig.app.json](tsconfig.app.json) · [package.json](package.json)

**Como fazer**

1. `npm create vite@latest . -- --template react-ts`
2. Em `tsconfig.base.json`, que os três projetos estendem: `strict` e `noUncheckedIndexedAccess`. Em `tsconfig.app.json`: o alias `@/*`.
3. Em `vite.config.ts`: `resolve.tsconfigPaths` e o proxy de `/api` para o Go.

**Atenção**

- O Vite só remove os tipos, não verifica. Quem verifica é o `tsc -b`, no `build` e no CI.
- `noUncheckedIndexedAccess`: `array[0]` passa a ser `T | undefined`.
- `erasableSyntaxOnly` (padrão do template) proíbe `enum` e `constructor(private x)`.
- `verbatimModuleSyntax` exige `import type` para tipos.
- O proxy deixa tudo na mesma origem: cookie de sessão first-party e nenhum CORS.
- São três tsconfig: app (browser), node (config do Vite) e e2e (Playwright).

**Na entrevista** (Doc 2 · T11, T6)

- **"Which compiler settings matter to you?"**
  `strict` plus `noUncheckedIndexedAccess`. And Vite doesn't type-check, so the build runs `tsc -b` first and CI runs it on every pull request.
- **"Enums or union types?"**
  Unions from `as const` or `z.enum`: no runtime code, and they match the strings the API sends. With `erasableSyntaxOnly`, enums don't even compile.

## Passo 3 · Tailwind v4 + HeroUI v3

**Objetivo:** UI acessível sem escrever CSS de componente.

**Arquivos:** [index.css](src/index.css) · [RootLayout.tsx](src/app/RootLayout.tsx)

**Como fazer**

1. `npm i @heroui/react @heroui/styles` e `npm i -D tailwindcss @tailwindcss/vite`.
2. Plugin `tailwindcss()` no `vite.config.ts`.
3. No CSS: `@import "tailwindcss";` e depois `@import "@heroui/styles";`. Nessa ordem.
4. Na rota raiz, o `RouterProvider` do React Aria recebe `useNavigate` e `useHref`.

**Atenção**

- HeroUI v3 não é a v2: componentes compostos (`Card.Header`, `Select.Trigger`), sem Provider, sem `tailwind.config`. Props do React Aria: `onPress`, `isDisabled`, `isPending`, `isInvalid`.
- O tema é feito de variáveis CSS. Mudei só `--link` para os links terem cor.
- O `Alert` do HeroUI é só visual. Eu adiciono `role="alert"` para o leitor de tela anunciar.
- Link do router com cara de botão: `className={buttonVariants({ size: "sm" })}`.
- Sem o passo 4, um `<Link href>` do HeroUI recarrega a página inteira.

**Na entrevista** (Doc 1 · Q7)

- **"How do you customise a component library like HeroUI?"**
  In three layers: theme tokens as CSS variables, Tailwind classes through `className`, and domain components that wrap the primitives. I don't rebuild the primitives.
- **"What does HeroUI give you for accessibility?"**
  It's built on React Aria: focus management, keyboard navigation and ARIA wiring between label, description and error come for free. I still own semantics like `role="alert"` and never showing a status by color alone.

## Passo 4 · Camada de API: fetch + Zod

**Objetivo:** um único lugar chama `fetch`, e nada entra no app sem validação.

**Arquivos:** [api.ts](src/lib/api.ts)

**Como fazer**

1. `api<T>(path, { schema })`: o tipo de retorno vem do schema, não de um `as`.
2. `response.json()` é tratado como `unknown` e passa por `schema.safeParse`.
3. Erro HTTP vira `ApiError` com `status`, `code` e `fieldErrors`.
4. `pageOf(item)` monta o envelope de lista. Espelha o `page[T]` do Go.

**Atenção**

- Tipo é promessa, não garantia. O schema é a garantia.
- Contrato quebrado gera `contract_mismatch` e um log com `z.prettifyError`. Falha alto, não mostra dado errado.
- A UI decide por `status` e `code`, nunca pelo texto da mensagem.
- `isApiError(error): error is ApiError` é o type guard usado em todo `catch`.
- O `signal` do TanStack Query é repassado ao `fetch`: request cancelado quando a tela sai.

**Na entrevista** (Doc 2 · T2, T4, T8)

- **"How do you type data coming from the API?"**
  Types disappear at runtime, so a typed response is only a promise. I parse every response with a Zod schema and infer the type from it; a contract change fails loudly at the boundary.
- **"What's the difference between `any`, `unknown` and `never`?"**
  `any` turns checking off. `unknown` forces me to narrow first, so it's what `response.json()` and caught errors are. `never` is a value that can't exist; I use it for exhaustive checks.

## Passo 5 · Dinheiro

**Objetivo:** tornar impossível tratar um número qualquer como dinheiro.

**Arquivos:** [money.ts](src/lib/money.ts) · [Money.tsx](src/components/Money.tsx) · [money.test.ts](src/lib/money.test.ts)

**Como fazer**

1. `MinorUnitsSchema = z.number().int().brand<"MinorUnits">()`.
2. `toMinorUnits(major, currency)` é a única porta de entrada para um valor digitado.
3. `formatMoney` usa `Intl.NumberFormat`. As casas decimais vêm do próprio `Intl`.

**Atenção**

- XOF tem zero casas decimais. Fixar duas casas é bug real.
- `19.99 * 100` dá `1998.9999999999998`. Por isso o `Math.round`.
- O `Intl` separa milhar com espaço especial (U+202F). Nos testes, use `\s` na regex.
- O teste com `@ts-expect-error` falha no `tsc` se alguém remover o brand.

**Na entrevista** (Doc 2 · T9, Doc 1 · Q10)

- **"What is a branded type?"**
  It makes two numbers incompatible. Amounts from the API are branded as minor units, so a number the user typed can't reach `formatMoney` without an explicit conversion.
- **"Why not floats for money?"**
  Floats can't represent decimals exactly. Amounts travel as integers in the smallest unit with a currency code, and I only format for display with `Intl.NumberFormat`.

## Passo 6 · TanStack Query: fetching e cache

**Objetivo:** cache com regras claras, sem estado de servidor em `useState`.

**Arquivos:** [query-client.ts](src/app/query-client.ts) · [transactions/api.ts](src/features/transactions/api.ts) · [payouts/api.ts](src/features/payouts/api.ts)

**Como fazer**

1. `createQueryClient()` é uma fábrica: o app cria um, cada teste cria o seu.
2. Cada feature tem um objeto com `queryOptions`: chave, fetcher e opções juntos.
3. Chaves hierárquicas: `["transactions"]` invalida listas e detalhes.
4. `staleTime` por tipo de dado:

| Dado                | staleTime     | Por quê                             |
| ------------------- | ------------- | ----------------------------------- |
| Sessão (`me`)       | `Infinity`    | Só muda em login, logout ou 401     |
| Dashboard           | 30 s (padrão) | Agregado, tolera atraso             |
| Lista de transações | 5 s           | Status muda em segundos             |
| Detalhe pendente    | 0 + polling   | O usuário está esperando a resposta |
| Cotação de taxa     | 60 s          | Regra do servidor, muda pouco       |

**Atenção**

- Padrões da v5: `staleTime` 0, `gcTime` 5 min, 3 retries em query, 0 em mutation.
- Retry só para rede e 5xx. Um 4xx falharia igual.
- Mutation nunca faz retry automático: um pagamento repetido pode pagar duas vezes.
- Qualquer 401 chama `endSession`: sessão vira `null` e o cache dos outros dados é removido.
- Retornar a promise do `invalidateQueries` no `onSuccess` mantém a mutation pendente até a lista atualizar.

**Na entrevista** (Doc 1 · Q5)

- **"What's the difference between `staleTime` and `gcTime`?"**
  `staleTime` is how long data counts as fresh, so no refetch. `gcTime` is how long unused data stays in memory. Stale data is still shown while it revalidates in the background.
- **"How do you decide how long to cache?"**
  By how fast the data changes: the session never goes stale, a summary for 30 seconds, a transaction list for 5, and a pending payment is polled.
- **"Why a factory for the QueryClient?"**
  So every test gets its own cache with retries off. A shared client leaks data between tests and makes them flaky.

## Passo 7 · React Router 8

**Objetivo:** rotas como dados, com layouts e guards aninhados.

**Arquivos:** [router.tsx](src/app/router.tsx) · [main.tsx](src/main.tsx) · [AppLayout.tsx](src/app/AppLayout.tsx) · [RouteError.tsx](src/app/RouteError.tsx)

**Como fazer**

1. Exporte `routes` como array de objetos. O app usa `createBrowserRouter(routes)`.
2. Rotas sem `path` são layout routes: `RootLayout` → `RequireAuth` → `AppLayout` → página.
3. `errorElement` na raiz: erro de render mostra uma tela, não uma página em branco.
4. `NavLink` no menu: ele põe `aria-current="page"` sozinho.

**Atenção**

- Na v8 não existe mais `react-router-dom`. `RouterProvider` vem de `react-router/dom`, o resto de `react-router`.
- Os testes usam a mesma árvore com `createMemoryRouter`. Guards e layouts reais são testados.
- `location.state` é `any`. Eu faço parse com Zod, como qualquer entrada externa.
- Alternativa que não usei: `loader` + `queryClient.ensureQueryData`. Carrega antes de renderizar, mas tira os estados de loading do componente.

**Na entrevista**

- **"How do you protect routes?"**
  With layout routes. One resolves the session and redirects to login, another checks a single permission, and the pages render inside them. The API checks again, so the guard is only UX.
- **"Loaders or TanStack Query?"**
  They solve different problems: a loader decides when to fetch, Query decides how to cache. Here I fetch in components to keep loading and error states explicit; with loaders I'd call `ensureQueryData`.

## Passo 8 · Autenticação e RBAC

**Objetivo:** uma única pergunta na UI: "este usuário pode fazer X?".

**Arquivos:** [schemas.ts](src/features/auth/schemas.ts) · [api.ts](src/features/auth/api.ts) · [session.ts](src/features/auth/session.ts) · [guards.tsx](src/features/auth/guards.tsx) · [LoginPage.tsx](src/features/auth/LoginPage.tsx)

**Como fazer**

1. A sessão é a query `["me"]`: `User` logado, `null` anônimo. Um 401 ali vira `null`, não erro.
2. `RequireAuth` (layout route) redireciona ou entrega o usuário pelo `SessionContext`.
3. `useSession()` lança erro fora do provider. Quem consome nunca vê `undefined`.
4. `useCan()` devolve `can(permission)`. `<Can>` esconde, `RequirePermission` bloqueia rota.
5. Login só grava o usuário no cache. A rota reage ao estado, sem `navigate()`.

**Atenção**

- Checar permissão, nunca role. Role muda de nome; "pode aprovar payout?" não.
- Nunca pode → esconder. Pode, mas está bloqueado agora → desabilitar e dizer o motivo em texto.
- `Permission` é um template literal type: `can("payout:aprove")` não compila.
- `permissions` chega como `string[]`. Permissão nova no backend não pode quebrar o login.
- Cookie `HttpOnly`: o JavaScript não lê, então XSS não rouba a sessão. `SameSite=Lax` contra CSRF.
- No logout, o cache é limpo. O próximo usuário não vê dados do anterior.
- O 401 de `/api/me` no console do navegador é esperado para visitante anônimo.

**Na entrevista** (Doc 1 · Q6, Doc 2 · T7, T10)

- **"How did you implement role-based permissions?"**
  The UI asks about permissions, not roles, through one `can()` used by route guards, menus and buttons. If a user can never do something, I hide it; if it's only blocked for now, I disable it and say why. The backend is the source of truth, so a 403 is always handled.
- **"Where do you keep the session?"**
  In an HttpOnly cookie set by the server, so scripts can't read it. The frontend only holds the user object in the query cache and clears every cached query on logout.
- **"How do you type a context?"**
  The default is `undefined` and a custom hook throws outside the provider, so consumers never deal with undefined.

## Passo 9 · Componentes compartilhados

**Objetivo:** regra de negócio de UI em um lugar só.

**Arquivos:** [DataTable.tsx](src/components/DataTable.tsx) · [SelectField.tsx](src/components/SelectField.tsx) · [FormTextField.tsx](src/components/FormTextField.tsx) · [StatusChip.tsx](src/components/StatusChip.tsx) · [Money.tsx](src/components/Money.tsx) · [ErrorState.tsx](src/components/ErrorState.tsx)

**Como fazer**

1. `DataTable<Row extends { id: string }>`: `key: keyof Row & string`. Coluna com erro de digitação não compila.
2. `SelectField<Value extends string>`: as opções definem o tipo que o `onChange` devolve.
3. `FormTextField`: a ponte React Hook Form ↔ HeroUI, escrita uma vez com `useController`.
4. `StatusChip` + mapa `as const satisfies Record<Status, StatusMeta>`: status sem label não compila.
5. `ErrorState`: o único jeito de mostrar erro de request. Decide sozinho se cabe "Retry".

**Atenção**

- Tipos derivados da biblioteca: `ComponentProps<typeof Chip>["color"]`. Nada redigitado.
- `validationBehavior="aria"`: quem valida é o Zod, não o balão nativo do navegador.
- O `ref` do RHF vai para o `Input`. É ele que foca o primeiro campo inválido no submit.
- `as` aparece só duas vezes no código do app, as duas com comentário: um que alarga o tipo (`null as string | null`, seguro) e um no `FormTextField`, onde o TypeScript não acompanha o genérico.
- `satisfies` mantém os literais; anotação `Record<...>` alarga para `string[]`. Veja [operators.ts](src/lib/operators.ts).
- `sortable` numa coluna do `DataTable` vira um botão no cabeçalho (com `aria-sort`). A tabela só mostra a ordem e avisa o clique: quem ordena é a página, ou o servidor.
- Clique ordena só por aquela coluna. Shift+clique junta a coluna à ordenação, como desempate: de novo inverte, na terceira vez tira. A regra é uma função pura, `nextSort`, em [sort.ts](src/lib/sort.ts). O `aria-sort` fica só no primeiro cabeçalho; os outros mostram um número e dizem a posição em texto para o leitor de tela.
- Não abstraia cedo: extraia quando o padrão aparecer pela terceira vez.

**Na entrevista** (Doc 1 · Q7, Doc 2 · T3, T6, T10)

- **"How do you use generics?"**
  To keep types connected. My `DataTable<Row>` only accepts columns that are real keys of the row, with a constraint that every row has an `id`.
- **"When do you use `as const` and `satisfies`?"**
  Together: `as const` keeps the literal values, `satisfies` checks the shape without widening. A new status without a label fails to compile.
- **"How do you connect React Hook Form to a component library?"**
  One wrapper with `useController`: the form library owns value and errors, the UI library owns markup and accessibility. I turn off native validation so only the schema decides.

## Passo 10 · Tabela de transações

**Objetivo:** tabela com filtro, ordenação e paginação no servidor, e todos os estados tratados.

**Arquivos:** [TransactionsPage.tsx](src/features/transactions/TransactionsPage.tsx) · [api.ts](src/features/transactions/api.ts) · [schemas.ts](src/features/transactions/schemas.ts)

**Como fazer**

1. Filtros vêm de `useSearchParams` e passam por `TransactionFiltersSchema`.
2. Os filtros entram na `queryKey`. Filtro novo, entrada nova no cache.
3. `useInfiniteQuery`: `getNextPageParam` devolve o `next_cursor` do servidor.
4. `placeholderData: keepPreviousData` mantém as linhas antigas enquanto as novas carregam.
5. Ordenação: `?sort=-amount` (o `-` é decrescente) na URL, na `queryKey` e na API. A vírgula combina colunas: `?sort=-amount,created_at` é o maior valor primeiro e, entre valores iguais, o mais antigo. Passa por `TransactionSortSchema`, como os filtros.

**Atenção**

- A URL é entrada do usuário. `?status=banana` é descartado com `.catch(undefined)`, não quebra a tela.
- Cursor em vez de offset: transações novas chegam o tempo todo e o offset pula ou repete linhas.
- Quatro estados: skeleton, vazio sem dados, vazio com filtros (com "Clear filters") e erro.
- Se um refetch falha, os últimos dados bons continuam na tela, com o erro acima.
- Valores à direita com `tabular-nums`. Status com ícone e texto, nunca só cor.
- Com paginação, quem ordena é o servidor: o navegador só tem as páginas já carregadas. O id desempata no fim, depois de todos os campos do `sort`, e o cursor guarda o `sort`: cursor de outra ordenação é 400.
- Payouts segue o mesmo padrão: páginas com cursor e ordenação no servidor, só por `id` e `amount`. Ordenar por qualquer coluna era possível quando a lista cabia inteira no navegador; com páginas, cada ordenação é trabalho do servidor (num banco, um índice).
- O seed tem 50 000 transações e 1 004 payouts: nenhuma das listas cabe numa resposta. Um payout pendente pode estar na página 4, por isso a lista filtra por status, e o número do dashboard abre a lista já filtrada.
- TanStack Table ficou de fora de propósito: quem pagina, filtra e ordena é o servidor, e o cabeçalho ordenável já vem do HeroUI (React Aria). Ele entra quando houver seleção ou colunas configuráveis no cliente.

**Na entrevista** (Doc 1 · Q4, Q5)

- **"How would you build a transactions table with a lot of data?"**
  Pagination and filters run on the server, with a cursor instead of an offset. Filters live in the URL, the query key is built from them, and the previous rows stay visible while the next ones load.
- **"Cursor or offset pagination?"**
  Cursor for data that keeps arriving: an offset skips or repeats rows when new ones come in. The cost is no jump to page N, and totals need a separate count.
- **"Which states does a list screen have?"**
  Loading with a skeleton, two kinds of empty, and errors by status: 403 explains, 5xx offers a retry and keeps the last good data.

## Passo 11 · Detalhe com status assíncrono

**Objetivo:** mostrar o estado real de um pagamento que muda sozinho.

**Arquivos:** [TransactionDetailPage.tsx](src/features/transactions/TransactionDetailPage.tsx) · [schemas.ts](src/features/transactions/schemas.ts) · [assert-never.ts](src/lib/assert-never.ts)

**Como fazer**

1. `z.discriminatedUnion("status", [...])`: cada status carrega só os campos que existem nele.
2. `switch (transaction.status)` com `default: return assertNever(transaction)`.
3. `refetchInterval` como função: enquanto `pending`, `pollDelay` devolve 2 s, 4 s, 8 s, 16 s, 30 s.

**Atenção**

- "Falhou sem motivo" é rejeitado na fronteira. O estado impossível não existe no app.
- Um status novo quebra a compilação em dois lugares: no mapa de labels e no `switch`.
- A tela nunca mostra sucesso antes de o backend confirmar.
- O polling para no estado final e pausa com a aba em segundo plano (padrão do Query).
- `role="status"` anuncia a mudança para leitor de tela. "Last checked at" mostra a idade do dado.

**Na entrevista** (Doc 1 · Q2, Q10, Doc 2 · T4)

- **"How do you model a transaction status?"**
  As a discriminated union validated at the API boundary. Inside each branch TypeScript knows which fields exist, and a `never` check makes a new status break the build until every screen handles it.
- **"How does an asynchronous payment status reach the UI?"**
  Mobile money is confirmed on the customer's phone, so the payment stays pending. I poll with backoff only while it's pending and show when it was last checked. With more volume I'd ask the backend for server-sent events.

## Passo 12 · Formulário multi-etapas

**Objetivo:** criar um payout em três telas sem perder dado e sem pagar duas vezes.

**Arquivos:** [schemas.ts](src/features/payouts/schemas.ts) · [wizard.ts](src/features/payouts/new/wizard.ts) · [NewPayoutLayout.tsx](src/features/payouts/new/NewPayoutLayout.tsx) · [RecipientStep.tsx](src/features/payouts/new/RecipientStep.tsx) · [AmountStep.tsx](src/features/payouts/new/AmountStep.tsx) · [ReviewStep.tsx](src/features/payouts/new/ReviewStep.tsx)

**Como fazer**

1. Um schema por etapa. O formulário completo é `RecipientStepSchema.and(AmountStepSchema)`.
2. Cada etapa é uma rota com seu próprio `useForm` e `zodResolver`.
3. A layout route guarda o rascunho em `sessionStorage` e o entrega pelo `<Outlet context>`.
4. Guard: abrir `/review` sem as etapas anteriores redireciona para a primeira incompleta.
5. A revisão valida tudo de novo e mostra valor, taxa e total. A taxa vem do servidor.
6. O envio leva o `Idempotency-Key` que nasceu junto com o rascunho.
7. Um 422 volta para a etapa dona do campo, com a mensagem no campo (`useForm({ errors })`).

**Atenção**

- `z.input` ≠ `z.output`: o campo guarda texto (`"5000"`), o schema entrega número. O telefone entra com espaços e sai normalizado.
- `mode: "onTouched"`: valida ao sair do campo, não a cada tecla.
- Regra entre dois campos usa `superRefine` com `path` (prefixo do telefone × operadora).
- A validação do front é só UX. O Go valida tudo de novo e sabe o que o front não sabe (carteira inexistente).
- A chave de idempotência é criada com o rascunho, não no clique. Retry, duplo clique e refresh reenviam a mesma chave.
- O rascunho lido do `sessionStorage` passa por Zod. Nunca guarde PIN, OTP ou token.
- `isPending` desabilita o botão. O botão também fica desabilitado até a taxa aparecer.
- `.extend()` não funciona em schema com `superRefine`. Por isso o `.and()`.
- Próximo passo natural: `useBlocker` para avisar ao sair no meio do fluxo.

**Na entrevista** (Doc 1 · Q3)

- **"Tell me about a multi-step form you built."**
  One schema per step, composed into the full schema for the final submit. Each step is a route with its own form; a layout route owns the draft, so going back or refreshing loses nothing. Server errors are mapped back to the field and the step that owns it.
- **"What's the difference between `z.input` and `z.output`?"**
  Input is what the form holds while typing, output is what validation produces. An amount is text in the input and a number after coercion.
- **"How do you prevent a double payment?"**
  The button is disabled while submitting, mutations never auto-retry, and the request carries an idempotency key created with the draft. The same key always returns the same payout.

## Passo 13 · Fluxo de aprovação

**Objetivo:** decisão sobre dinheiro com confirmação, regra de quatro olhos e conflito tratado.

**Arquivos:** [PayoutsPage.tsx](src/features/payouts/PayoutsPage.tsx) · [DecisionDialog.tsx](src/features/payouts/DecisionDialog.tsx) · [api.ts](src/features/payouts/api.ts)

**Como fazer**

1. Coluna de ações só existe para quem tem `payout:approve`.
2. Clique abre um `AlertDialog`. Nada é enviado antes da confirmação.
3. `Decision` é uma union: rejeitar sem `reason` não compila.
4. Sem optimistic update. A linha muda depois da resposta do servidor (`invalidateQueries`).

**Atenção**

- Maker-checker: quem criou não decide. A UI desabilita e explica; a API responde 403.
- Dois aprovadores ao mesmo tempo: o segundo recebe 409. O diálogo mostra a mensagem e a lista é atualizada (`onSettled`, não `onSuccess`).
- Botões com `aria-label="Approve PO-2004"`. Sem isso, o leitor de tela ouve "Approve" dez vezes.
- Motivo do bloqueio em texto visível. Tooltip não serve: botão desabilitado não recebe foco.
- O `AlertDialog` não fecha com Esc nem com clique fora. O papel ARIA é `alertdialog`, não `dialog`.

**Na entrevista** (Doc 1 · Q10)

- **"What's different about building interfaces for payments?"**
  Accuracy, honesty about state and safety on actions: integer amounts, never showing success before the backend confirms, and confirmation plus idempotency on anything that moves money.
- **"Why no optimistic updates here?"**
  An optimistic update shows something that may not be true. For money, the UI only reflects what the server confirmed.
- **"What if two people approve the same payout at once?"**
  The server answers the second one with 409. I show that message and refresh the list, because a conflict means my data was stale.

## Passo 14 · Dashboard

**Objetivo:** números-chave com o mesmo padrão de dados e estados.

**Arquivos:** [DashboardPage.tsx](src/features/dashboard/DashboardPage.tsx) · [api.ts](src/features/dashboard/api.ts)

**Atenção**

- O agregado vem pronto do servidor. O front não soma dinheiro.
- `z.record` sobre um enum é exaustivo: falta de um status na resposta é erro de contrato.
- Skeleton com o tamanho final do número, para o layout não pular.
- A taxa de sucesso é um float. Razão pode ser float; dinheiro não.

## Passo 15 · Testes unitários e de integração

**Objetivo:** confiança no comportamento, com só a rede mockada.

**Arquivos:** [setup.ts](src/test/setup.ts) · [server.ts](src/test/server.ts) · [fixtures.ts](src/test/fixtures.ts) · [render.tsx](src/test/render.tsx)

**Como fazer**

1. `npm i -D vitest jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom msw`
2. Bloco `test` no `vite.config.ts`: `environment: "jsdom"` e `setupFiles`.
3. `setup.ts`: `server.listen({ onUnhandledRequest: "error" })`, `resetHandlers` e `cleanup` a cada teste.
4. `server.ts`: handlers do caminho feliz de todo GET. Cada teste sobrescreve só o que importa.
5. `renderApp("/payouts", { as: "viewer" })`: app real, rota real, usuário escolhido.

**O que cada nível cobre (53 testes)**

| Nível       | Arquivo                                                                                    | Cobre                                                             |
| ----------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Unit        | [money.test.ts](src/lib/money.test.ts)                                                     | Formatação, conversão, brand                                      |
| Unit        | [transactions/schemas.test.ts](src/features/transactions/schemas.test.ts)                  | Contrato, filtro inválido, backoff                                |
| Unit        | [payouts/schemas.test.ts](src/features/payouts/schemas.test.ts)                            | Valores de borda: 0, 499, 500, 2 000 000, 2 000 001               |
| Integration | [TransactionsPage.test.tsx](src/features/transactions/TransactionsPage.test.tsx)           | Lista, erro e retry, filtros e ordenação na URL, vazio, cursor    |
| Integration | [TransactionDetailPage.test.tsx](src/features/transactions/TransactionDetailPage.test.tsx) | Falha com motivo, 404, polling com fake timers                    |
| Integration | [PayoutsPage.test.tsx](src/features/payouts/PayoutsPage.test.tsx)                          | Uma tela por role, aprovar, rejeitar, 409, 403, cursor, filtro    |
| Integration | [NewPayout.test.tsx](src/features/payouts/new/NewPayout.test.tsx)                          | Valor zero, payload, 422 no campo, mesma chave no retry, rascunho |
| Integration | [auth.test.tsx](src/features/auth/auth.test.tsx)                                           | Redirect e volta, credencial errada, logout, 401 global           |

**Atenção**

- Mock só nas fronteiras: rede (MSW) e tempo. Nunca nos meus hooks ou componentes.
- `QueryClient` novo por teste, com retry desligado. Estado compartilhado é a causa nº 1 de teste instável.
- `getBy` existe agora, `queryBy` prova ausência, `findBy` espera o assíncrono.
- Formulário: teste a mensagem na tela e também o payload que chegou na API (valor inteiro, header).
- As fixtures usam `z.input` dos schemas: são o JSON do fio, antes do brand.
- POST não tem handler padrão. Um teste que dispara um POST sem declarar a resposta falha.
- Fake timers só no teste de polling, com `shouldAdvanceTime` para o `findBy` continuar funcionando.
- Sem `globals`, o Testing Library não registra o `cleanup` sozinho. Está no `setup.ts`.
- O MSW ficou na 2.15: o Vitest 5 ainda declara peer `msw@^2` e a v3 saiu há poucos dias.
- Conferi que os testes pegam regressão: quebrei 5 comportamentos, um por vez (idempotência, maker-checker, 401, filtros, polling), e cada um derrubou o teste certo.

**Na entrevista** (Doc 2 · I1 a I9, F1 a F4)

- **"How do you test a component that fetches data?"**
  I mock the network with MSW, not `fetch` or my hooks. I render the real route tree with a fresh QueryClient, retries off, and use `findBy` queries. Any unhandled request fails the test.
- **"How do you test a form?"**
  I type with `userEvent`, submit, and assert two things: the message the user sees and the payload that reached the API. And the server path: a 422 must show on the right field.
- **"How do you test permissions?"**
  The same screen rendered with a fixture per role: the approver sees Approve, the viewer doesn't, and the creator sees it disabled with the reason.
- **"What do you mock?"**
  Only the boundaries: network and time. Mocking my own code tests the mocks.
- **"Unit, integration, functional, end-to-end?"**
  Unit: one piece alone. Integration: pieces together with a mocked network. Functional: a feature against its requirement, at either level. End-to-end: the whole system in a real browser.

## Passo 16 · E2E com Playwright

**Objetivo:** poucas jornadas críticas, no navegador real, contra a API Go real.

**Arquivos:** [playwright.config.ts](playwright.config.ts) · [auth.setup.ts](e2e/auth.setup.ts) · [fixtures.ts](e2e/fixtures.ts) · [PayoutsPage.ts](e2e/pages/PayoutsPage.ts) · [payouts.spec.ts](e2e/payouts.spec.ts) · [transactions.spec.ts](e2e/transactions.spec.ts) · [permissions.spec.ts](e2e/permissions.spec.ts)

**Como fazer**

1. `npm i -D @playwright/test` e `npx playwright install chromium`.
2. `webServer` na config sobe o Go e o Vite e espera as duas URLs.
3. Projeto `setup` faz login uma vez por role e salva o cookie com `storageState`.
4. Fixture `pageAs("approver")`: página já logada. Cada chamada é um contexto, ou seja, uma pessoa.
5. Fixture `apiAs("maker")`: cria dados pela API, sem clicar na UI.
6. Page object com ações e locators. As asserções ficam no teste.

**Comandos para praticar**

```bash
npm run e2e                      # roda tudo
npm run e2e:ui                   # modo UI, com linha do tempo
npx playwright test --debug      # passo a passo com o inspector
npx playwright codegen localhost:5173   # grava um fluxo (app rodando)
npx playwright test --trace on --reporter=html   # depois: npx playwright show-report
```

**Atenção**

- Locators de usuário: `getByRole`, `getByLabel`. Nunca seletor CSS.
- Asserções web-first (`await expect(locator).toContainText(...)`) repetem até passar. Nunca `waitForTimeout`.
- Cada teste cria seus dados, com referência única. Roda em paralelo e em qualquer ordem.
- Estado difícil de produzir (500) é mockado com `page.route`. Jornada crítica usa o backend real.
- Polling: `page.clock.install()` e `fastForward` em vez de esperar o intervalo.
- A operadora nunca é real: as rotas de teste do Go fazem o papel dela.
- No CI o teste roda contra o build de produção. Local, contra o dev server.
- O app faz dois retries em 5xx. Por isso o alerta de erro demora uns 3 s e aquela asserção tem timeout maior.
- Um teste dirige dois usuários (maker e approver) em contextos separados. No Cypress isso não é nativo.

**Na entrevista** (Doc 2 · P1 a P9)

- **"How do you handle authentication in Playwright?"**
  A setup project signs in once per role and saves the session with `storageState`. Tests start already signed in, and one test can use two roles in two browser contexts.
- **"Real backend or mocks?"**
  Both. Critical journeys run against the real API to catch contract problems; states that are hard to reproduce, like a 500, are mocked with `page.route`. The mobile money operator is always simulated.
- **"How do you test a status that changes asynchronously?"**
  No sleeps. A test route plays the operator's callback, then I fast-forward the page clock to the next poll and use an assertion that retries.
- **"How do you keep E2E tests stable?"**
  User-facing locators, web-first assertions, and each test owning its data with unique ids. A flaky test gets fixed or quarantined; retries only hide it.
- **"Page objects or fixtures?"**
  Both: page objects for how a screen is used, fixtures for setup like a signed-in approver. Assertions stay in the tests.

## Passo 17 · Qualidade, CI e Git

**Objetivo:** o que roda em todo pull request.

**Arquivos:** [ci.yml](.github/workflows/ci.yml) · [.oxlintrc.json](.oxlintrc.json) · [package.json](package.json)

**Como fazer**

1. `npm run check`: `tsc -b`, oxlint, `prettier --check` e Vitest.
2. CI com dois jobs: `checks` (rápido) e `e2e` (build de produção + Go + Playwright).
3. O relatório e os traces do Playwright sobem como artefato, mesmo quando falha.
4. Git: `git init`, um commit por passo deste guia, mensagens no padrão `feat:`, `test:`, `chore:`.

**Atenção**

- O workflow do GitHub Actions **não foi executado**: a pasta ainda não é um repositório. O resto foi.
- O template atual do Vite usa oxlint (regras compatíveis com ESLint). Na empresa pode ser ESLint: a ideia é a mesma.
- `trace: "on-first-retry"`: o trace só é gravado quando um teste falha e repete.
- PR pequeno, com os testes no mesmo PR. O revisor lê os testes também.

**Na entrevista** (Doc 2 · F3, F4, P7)

- **"What would your test strategy be for this platform?"**
  Static checks first, unit tests for pure logic like money and permissions, most tests at the integration level with MSW, and a few Playwright journeys: login per role, creating a payout, the approval flow.
- **"How do you run E2E in CI and debug a failure?"**
  On every pull request, with `webServer` starting the app. On failure the trace is saved as an artifact, so I can see each action with its DOM and network without reproducing it locally.

---

## Armadilhas reais deste projeto

Todas apareceram durante a construção. Servem de exemplo concreto.

- `findByRole("status")` achou o spinner de carregamento, não o texto. Espere pelo conteúdo.
- A descrição acessível de um campo inválido junta o texto de ajuda e o erro. Use regex na asserção.
- `transactions[0]` virou `T | undefined` com `noUncheckedIndexedAccess`. As fixtures ganharam nomes.
- O lint confundiu o `use` das fixtures do Playwright com o hook `use` do React. Regra desligada só em `e2e/`.
- O Chromium desenhou `↩` como emoji. Troquei o ícone por um caractere de texto.
- `module: nodenext` exigia extensão nos imports do `e2e/`. Ele ganhou um tsconfig próprio.
- `.extend()` do Zod recusa schema com `superRefine`. Solução: `.and()`.

## Faça você mesmo

Ler não basta para a entrevista 2. Estes exercícios seguem o plano de 3 dias do Doc 2.

**Dia 1 · TypeScript**

1. Adicione o status `refunded` em `TransactionStatusSchema`. Rode `npm run typecheck` e conserte cada erro. Explique em voz alta por que cada um apareceu.
2. Escreva `formatMoney(1500, "XOF")` em qualquer componente e leia o erro do brand.
3. Troque a `key` de uma coluna da tabela por um nome que não existe. Leia o erro.
4. Resolva os exercícios 1 e 2 do Doc 2 (`groupBy` e `ApiResult`) em `src/lib/`, com teste.

**Dia 2 · Integration**

1. Apague três testes de [PayoutsPage.test.tsx](src/features/payouts/PayoutsPage.test.tsx) e reescreva sem olhar.
2. Em [ReviewStep.tsx](src/features/payouts/new/ReviewStep.tsx), troque `idempotencyKey` por `crypto.randomUUID()`. Veja qual teste falha e por quê.
3. Escreva um teste novo: "o dashboard mostra erro e recupera no retry".

**Dia 3 · Playwright**

1. `npx playwright codegen localhost:5173`: grave o login e a criação de um payout. Reescreva os locators com `getByRole`.
2. Quebre uma asserção de propósito, rode com `--trace on` e abra o trace.
3. Escreva um teste novo: "o maker não vê botão de aprovar em nenhum payout".

## Como falar deste projeto

- Só diga "I built" sobre o que você refez com as próprias mãos. Os exercícios acima servem para isso.
- Frase honesta: "To prepare, I built a small practice app with your stack: Go API, React Router, TanStack Query, HeroUI, and tests with Vitest, MSW and Playwright."
- Se perguntarem do Playwright em produção: "I haven't used it in production yet. In this project I set up auth per role, a page object, route mocking and clock control."
- Leve duas decisões prontas para explicar: a chave de idempotência nascendo com o rascunho, e a union discriminada validada na fronteira.
