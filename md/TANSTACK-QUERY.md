# TanStack Query: o que é, como usar, e as perguntas de entrevista

Guia de estudo para a entrevista da PayMeTrust. A vaga chama este tema "Data Fetching & Caching". As explicações estão em português. As perguntas e as respostas da parte 5 estão em inglês, prontas para dizer em voz alta.

- **Parte 1:** o que é o TanStack Query.
- **Parte 2:** o vocabulário, em 14 palavras.
- **Parte 3:** como se usa.
- **Parte 4:** como foi usado neste repositório.
- **Parte 5:** as 13 perguntas mais comuns, com a resposta pronta.

Pronúncia: "cache" soa _késh_, como "cash". "Query" soa _KUI-ri_ e "queries" soa _KUI-riz_. "Stale" soa _stêil_.

---

## 1 · O que é

O TanStack Query (antes chamado React Query) é uma biblioteca para os dados que vêm do servidor. Esses dados vivem no backend, e o frontend só tem uma cópia. A biblioteca busca essa cópia, guarda-a em cache, sabe quando ela ficou velha e atualiza-a.

**A diferença para buscar dados à mão**

|                            | `useEffect` + `useState`        | TanStack Query                              |
| -------------------------- | ------------------------------- | ------------------------------------------- |
| Loading e erro             | escritos à mão em cada tela     | vêm prontos em cada query                   |
| Cache                      | não há: cada tela busca de novo | uma cópia por chave, partilhada entre telas |
| Duas telas, o mesmo dado   | dois pedidos                    | um pedido só                                |
| Dado velho                 | fica velho sem ninguém saber    | é marcado como velho e atualizado por trás  |
| Depois de uma escrita      | atualizar a lista à mão         | invalidar a chave, e a lista busca de novo  |
| Pedido cancelado, corridas | você trata                      | a biblioteca trata                          |

**O que ele tem de especial**

- **Cache por chave:** cada dado tem um nome, e todas as telas que usam esse nome partilham a mesma cópia.
- **Mostra e atualiza:** um dado velho continua na tela enquanto o novo é buscado por trás.
- **Retry automático** nas leituras, com intervalo crescente.
- **Atualiza sozinho** quando o usuário volta à janela ou a rede regressa.
- **Listas em páginas**, com "carregar mais".
- **Polling:** repetir um pedido de tempos em tempos.
- **Escritas (mutations)** com estado de envio, e invalidação do que ficou desatualizado.

**O que ele não é**

- Não é um cliente HTTP. Quem faz o pedido é o seu `fetch`.
- Não guarda estado de interface. Um diálogo aberto continua em `useState`.

---

## 2 · O vocabulário

| Termo                      | O que é                                                      | Como dizer sem código                                    |
| -------------------------- | ------------------------------------------------------------ | -------------------------------------------------------- |
| Query                      | uma leitura guardada em cache                                | "a query: a cached read"                                 |
| Query key                  | o nome do dado no cache                                      | "the cache key"                                          |
| Query function             | a função que faz o pedido                                    | "the function that fetches the data"                     |
| Mutation                   | uma escrita: criar, aprovar, rejeitar                        | "a mutation: a write"                                    |
| Query client               | o objeto que guarda o cache e as regras                      | "the client that holds the cache"                        |
| `staleTime`                | por quanto tempo o dado conta como fresco                    | "how long the data counts as fresh"                      |
| `gcTime`                   | por quanto tempo um dado sem uso fica na memória             | "how long unused data stays in memory"                   |
| Stale                      | o dado pode estar velho; ainda é mostrado enquanto atualiza  | "the data may be old, so it refreshes in the background" |
| Invalidate                 | marcar um dado como velho, para ser buscado de novo          | "I refresh the related data"                             |
| `isPending` / `isFetching` | a primeira carga, sem dado nenhum / qualquer pedido em curso | "the first load" / "a background refresh"                |
| Infinite query             | uma lista que chega página a página                          | "a list that loads page by page"                         |
| Polling                    | repetir o pedido de tempos em tempos                         | "the page asks the server again every few seconds"       |
| Optimistic update          | mostrar o resultado antes de o servidor confirmar            | "showing the result before the server confirms"          |
| Deduplication              | dois pedidos iguais ao mesmo tempo viram um                  | "two screens, one request"                               |

---

## 3 · Como se usa

**Instalar e ligar**

```bash
npm install @tanstack/react-query
```

```tsx
const queryClient = new QueryClient();

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>;
```

**A anatomia de uma query (leitura)**

```tsx
function TransactionPage({ id }: { id: string }) {
  const query = useQuery({
    queryKey: ["transactions", "detail", id], // 1. o nome do dado no cache
    queryFn: () => fetchTransaction(id), // 2. como buscar
    staleTime: 5_000, // 3. por quanto tempo conta como fresco
  });

  if (query.isPending) return <Skeleton />; // primeira carga
  if (query.isError) return <ErrorMessage error={query.error} />;

  return <Details transaction={query.data} />; // aqui o dado existe
}
```

**A anatomia de uma mutation (escrita)**

```tsx
const queryClient = useQueryClient();

const approve = useMutation({
  mutationFn: (id: string) => approvePayout(id),
  // Depois da escrita, tudo o que mostra payouts está velho.
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payouts"] }),
});

<Button isPending={approve.isPending} onPress={() => approve.mutate(id)}>
  Approve
</Button>;
```

**As opções do dia a dia**

| Opção                               | Para que serve                                            |
| ----------------------------------- | --------------------------------------------------------- |
| `staleTime`                         | por quanto tempo não se busca de novo                     |
| `retry`                             | quantas vezes repetir um pedido que falhou                |
| `enabled`                           | só buscar quando uma condição for verdadeira              |
| `select`                            | transformar o dado antes de o entregar ao componente      |
| `refetchInterval`                   | polling                                                   |
| `placeholderData: keepPreviousData` | manter o resultado anterior na tela enquanto o novo chega |
| `invalidateQueries`                 | marcar como velho e buscar de novo                        |
| `setQueryData`                      | escrever direto no cache                                  |

**Os padrões da versão 5**

- `staleTime` 0: todo dado é velho assim que chega.
- `gcTime` 5 minutos.
- 3 retries nas queries, 0 nas mutations.
- Busca de novo quando o usuário volta à janela.

**As cinco regras**

1. Dado do servidor vai para o cache da query, não para `useState`.
2. A chave tem tudo o que muda o resultado: o id, os filtros, a ordenação.
3. O `staleTime` decide-se pela velocidade com que o dado muda.
4. Depois de uma escrita, invalide o que ela afeta.
5. Em dinheiro: sem retry automático e sem optimistic update.

---

## 4 · Como foi usado neste repositório

### 4.1 Os ficheiros

| Ficheiro                                                                | Papel                                                         |
| ----------------------------------------------------------------------- | ------------------------------------------------------------- |
| [src/app/query-client.ts](../src/app/query-client.ts)                   | a fábrica do query client, com as regras globais              |
| [src/main.tsx](../src/main.tsx)                                         | o `QueryClientProvider` em volta do router                    |
| [src/lib/api.ts](../src/lib/api.ts)                                     | o cliente HTTP que todas as query functions chamam            |
| [src/features/auth/api.ts](../src/features/auth/api.ts)                 | a sessão como query; login e logout como mutations            |
| [src/features/dashboard/api.ts](../src/features/dashboard/api.ts)       | a query do resumo                                             |
| [src/features/transactions/api.ts](../src/features/transactions/api.ts) | a lista em páginas com cursor, e o detalhe com polling        |
| [src/features/payouts/api.ts](../src/features/payouts/api.ts)           | a lista, a cotação da taxa, e as mutations de criar e decidir |
| [src/test/render.tsx](../src/test/render.tsx)                           | um query client novo para cada teste                          |

### 4.2 As regras globais

Em [query-client.ts](../src/app/query-client.ts), a função `createQueryClient`:

- **É uma fábrica, não um objeto único.** O app cria um query client, e cada teste cria o seu. Assim nenhum dado em cache passa de um teste para o outro.
- **`staleTime` de 30 segundos** por omissão. Cada query muda este valor conforme a velocidade do seu dado.
- **Retry só para o que se pode curar:** falha de rede ou erro 5xx, até duas vezes. Um 4xx daria a mesma resposta outra vez.
- **Mutations nunca repetem sozinhas.** Um pedido de pagamento repetido pode pagar duas vezes.
- **Um 401 em qualquer pedido termina a sessão.** Está num lugar só: o `onError` do `QueryCache` e do `MutationCache`.

### 4.3 As chaves e as opções num só lugar

Cada feature exporta um objeto com as suas queries, feito com `queryOptions`: a chave, a função e as opções ficam juntas. Os componentes, os testes e a invalidação usam o mesmo objeto, por isso uma chave nunca é escrita duas vezes.

As chaves são hierárquicas:

| Chave                                          | O que guarda                     |
| ---------------------------------------------- | -------------------------------- |
| `["me"]`                                       | a sessão                         |
| `["summary"]`                                  | o resumo do dashboard            |
| `["transactions", "list", filtros, ordenação]` | uma vista da lista de transações |
| `["transactions", "detail", id]`               | uma transação                    |
| `["payouts", "list"]`                          | a lista de payouts               |
| `["payouts", "quote", valor]`                  | a taxa para um valor             |

Invalidar `["payouts"]` apanha a lista e as cotações de uma vez. E como os filtros fazem parte da chave, um filtro novo é uma entrada nova no cache.

### 4.4 O `staleTime` por tipo de dado

| Dado                 | `staleTime`     | Porquê                                                     |
| -------------------- | --------------- | ---------------------------------------------------------- |
| Sessão               | infinito        | só muda em login, logout ou 401, e cada um escreve o cache |
| Resumo do dashboard  | 30 s (o padrão) | é um agregado, tolera atraso                               |
| Lista de transações  | 5 s             | um status muda em segundos                                 |
| Detalhe da transação | 0, com polling  | o usuário está à espera da resposta                        |
| Cotação da taxa      | 60 s            | é uma regra do servidor, muda pouco                        |

### 4.5 A lista de transações: páginas com cursor

Em [transactions/api.ts](../src/features/transactions/api.ts), `transactionQueries.list`:

- **`infiniteQueryOptions`:** a lista chega página a página.
- **O cursor é do servidor.** `getNextPageParam` lê o `next_cursor` da última página. Quando vem `null`, a lista acabou.
- **`placeholderData: keepPreviousData`:** ao mudar um filtro, as linhas antigas ficam na tela, mais apagadas, até as novas chegarem.

Em [TransactionsPage.tsx](../src/features/transactions/TransactionsPage.tsx):

- As páginas são juntas numa lista só, e o botão "Load more" chama `fetchNextPage`.
- O botão "Retry" sabe o que falhou: se foi a página seguinte, pede só essa; se foi a lista, pede a lista.
- Depois de uma atualização falhada, as últimas linhas boas continuam na tela, por baixo do erro.

A lista de payouts é o caso contrário. Em [payouts/api.ts](../src/features/payouts/api.ts), `payoutQueries.list` segue o cursor até ao fim e devolve todos os payouts de uma vez. A página ordena no navegador, e um approver não pode deixar de ver um payout por ele estar numa segunda página.

### 4.6 O detalhe: polling com intervalo crescente

Em `transactionQueries.detail`, o `refetchInterval` é uma função:

- Enquanto o status é `pending`, a página pergunta de novo: aos 2, 4, 8 e 16 segundos, e depois de 30 em 30 (`pollDelay`).
- Quando o status é final, o polling para.

A tela mostra a hora da última consulta, para o usuário saber que o app está a acompanhar.

### 4.7 A sessão dentro do cache

Em [auth/api.ts](../src/features/auth/api.ts):

- **`meQuery`** guarda o usuário quando há sessão, e `null` quando não há. "Sem sessão" é um estado normal, por isso o 401 deste pedido vira `null`, não um erro.
- **O login** escreve o usuário no cache com `setQueryData`. O guard das rotas lê a mesma query e reage sozinho.
- **`endSession`** é chamado no logout e em qualquer 401. Põe a sessão em `null` e remove todos os outros dados do cache, para a próxima pessoa naquele navegador não ver os dados da anterior.

### 4.8 As escritas

Em [payouts/api.ts](../src/features/payouts/api.ts):

- **`useCreatePayout`** envia o cabeçalho `Idempotency-Key`. O `onSuccess` devolve a promise da invalidação, por isso o botão fica em "a enviar" até a lista estar atualizada.
- **`useDecidePayout`** não faz optimistic update: a linha só muda quando o servidor confirma. Usa `onSettled` em vez de `onSuccess`, porque um 409 ("outra pessoa já decidiu") também quer dizer que a lista está velha.
- **`refreshPayouts`** invalida os payouts e o resumo do dashboard, que conta os payouts pendentes.

Nas telas:

- O botão de confirmar usa `isPending`, por isso um duplo clique envia um pedido só ([DecisionDialog.tsx](../src/features/payouts/DecisionDialog.tsx)).
- Se a decisão falhar com um erro que repetir não resolve, como "outra pessoa já decidiu", o botão de confirmar fica desativado e o "Cancel" passa a "Close".
- Na revisão do payout, a taxa é uma query, e o botão de criar fica desativado até ela chegar ([ReviewStep.tsx](../src/features/payouts/new/ReviewStep.tsx)).

### 4.9 Os estados de cada tela

A vaga pede "loading, empty and error states". Aqui cada um tem uma forma só:

| Estado     | O que aparece                                                        | Onde                                                                 |
| ---------- | -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Loading    | um esqueleto com a forma final, para a página não saltar             | [DataTable.tsx](../src/components/DataTable.tsx), dashboard, detalhe |
| Empty      | uma frase que a página escolhe; com filtros, um botão para os limpar | a prop `empty` da tabela                                             |
| Error      | o que falhou, e "Retry" só quando repetir pode ajudar (rede ou 5xx)  | [ErrorState.tsx](../src/components/ErrorState.tsx)                   |
| Dado velho | a tabela fica mais apagada enquanto a vista nova carrega             | a prop `isStale` da tabela                                           |

### 4.10 Nos testes

Em [render.tsx](../src/test/render.tsx), cada teste cria o seu query client, com o retry desligado: um pedido que falha, falha logo, sem esperar pelas repetições.

| Teste                                                                                 | O que prova                                   |
| ------------------------------------------------------------------------------------- | --------------------------------------------- |
| "a 401 from any request ends the session and asks to sign in again"                   | o 401 tratado num lugar só                    |
| "keeps asking the API while the payment is pending, and shows the result"             | o polling                                     |
| "loads the next page with the cursor the server gave"                                 | a paginação por cursor                        |
| "shows every payout even when the API sends them in pages"                            | a lista de payouts segue o cursor até ao fim  |
| "approving asks for confirmation and shows the result only after the server confirms" | sem optimistic update                         |
| "when someone else decided first, shows the conflict and refreshes the list"          | a invalidação depois de um 409                |
| "a retry after a network failure reuses the same idempotency key"                     | a repetição manual não cria um segundo payout |

No end-to-end, o teste do erro 500 dá 15 segundos à conferência. O motivo é o retry do app: ele tenta duas vezes, com intervalo, antes de mostrar o erro.

---

## 5 · As 13 perguntas mais comuns

A entrevista é só de voz, por isso nenhuma resposta tem código nem cita este repositório. Os exemplos são de qualquer sistema de pagamentos.

Frases entre [colchetes] falam da sua experiência. Só use se forem verdade.

### 1 · A sua experiência

**"What's your experience with data fetching and caching?"**

Escolha a variante verdadeira.

Se já usou o TanStack Query no trabalho:

> "[I've used TanStack Query at … for … . I used it for lists with filters, and to refresh the data after the user changed something.]"

Se ainda não usou em produção:

> "[In production I've fetched data with … in Next.js and in Vue.] I haven't used TanStack Query in production yet. I've been practicing with it: cache times chosen by how fast the data changes, lists with cursor pagination, polling for a pending payment, and refreshing the related data after a write. So I know how I would set it up in a real project."

A vaga não diz qual biblioteca usam. As ideias das respostas seguintes valem para qualquer uma.

### 2 · Porquê uma biblioteca

**"Why use a library like TanStack Query instead of fetching in a `useEffect`?"**

> "Because data from the server is not normal state: my copy can get old. With an effect, I write loading, error, caching and cancelling by hand, on every screen. A query library gives me that. It keeps one copy for each key, so two screens that need the same transaction make one request. And it knows when the copy is old, and refreshes it in the background."

Âncora: **server data gets old → by hand on every screen → one copy per key → refreshes in the background.**

### 3 · Quanto tempo guardar

**"How do you decide how long to cache data?"**

> "It depends on how often the data changes. A list of operators rarely changes, so I keep it for a long time. A payment status can change any second, so I keep it only for a few seconds. When the user changes something, like approving a refund, I refresh the related data. And if a payment request fails, I never retry it automatically, because that could charge someone twice."

Âncora: **how often it changes → operators: long → payment status: seconds → refresh after a change → never retry a payment.**

Esta é a resposta combinada na preparação da primeira entrevista.

### 4 · Fresco e velho

**"What's the difference between stale time and garbage collection time?"**

> "Stale time is how long the data counts as fresh. During that time, there is no new request. After that, the data is stale: it is still shown, and it is refreshed in the background. Garbage collection time is something else: it is how long data that no screen is using stays in memory. So one is about freshness, and the other is about memory."

Âncora: **stale time = fresh, no request → stale = shown and refreshed → garbage collection = unused data in memory.**

### 5 · As chaves

**"What is a query key, and how do you organize them?"**

> "The key is the name of the data in the cache. I put in it everything that changes the result: the id, the filters, the sort. So a new filter is a new entry in the cache. I build the keys in levels: first the resource, like 'transactions', then 'list' or 'detail'. So after a change, I can refresh every transaction query with one call. And I keep the keys in one place for each feature."

Âncora: **the name in the cache → everything that changes the result → levels → refresh a whole group → one place per feature.**

### 6 · Depois de uma escrita

**"After a user approves a payout, how do you update the screen?"**

> "I wait for the server's answer, and then I invalidate the queries that show payouts: the list, and the totals on the dashboard. They fetch again, so the screen shows what the server really has. The button stays in a loading state until the list is fresh. I don't write the new status into the list myself, because for money I only show what the server confirmed."

Âncora: **wait for the server → invalidate the list and the totals → button loading until fresh → only what the server confirmed.**

### 7 · Optimistic update

**"When would you use an optimistic update, and when not?"**

> "An optimistic update shows the result before the server confirms, and goes back if the request fails. It is good for small things that almost never fail, like marking a notification as read. I don't use it on money. If the screen says 'approved' and then the server says no, the user saw something that was never true. So for a payment or an approval, the screen changes only after the server confirms."

Âncora: **result before the server confirms → good for small things → not on money → the user saw something untrue.**

### 8 · Retries

**"How do you handle retries?"**

> "For reads, I retry only what can get better: a network failure or a server error. A 'not found' or a 'forbidden' gives the same answer again, so I show it at once. For writes, I never retry automatically, because a repeated payment request could pay twice. If the user retries by hand, the request carries an idempotency key, so the server creates the payment only once."

Âncora: **reads: retry network and server errors → not a 'not found' → writes: never automatic → idempotency key.**

Pronúncia: "idempotency" soa _ai-dem-PÔU-ten-si_.

### 9 · Loading, empty e error

**"How do you handle loading, empty and error states?"**

> "Every screen with server data has these states, so I treat them the same way everywhere. Loading shows a skeleton with the final shape, so the page doesn't jump. Empty says why: 'no transactions yet', or 'no transactions match these filters', with a button to clear them. An error says what failed and offers a retry, only when a retry can help. And if a refresh fails, the last good data stays on the screen."

Âncora: **same way everywhere → skeleton with the final shape → empty says why → retry only when it helps → keep the last good data.**

### 10 · Uma tabela grande

**"How do you fetch a large table of transactions?"**

> "The server does the heavy work: it filters, sorts, and returns one page at a time. I use cursor pagination, not page numbers: each response gives me a cursor for the next page. New payments arrive all the time, and with page numbers the rows would move, and I would see duplicates. The filters are part of the cache key. And when a filter changes, the old rows stay on screen until the new ones arrive."

Âncora: **the server filters, sorts and pages → cursor, not page numbers → no duplicates → filters in the key → keep the old rows.**

### 11 · Um status que muda

**"A payment status can change after the page loads. How do you keep it up to date?"**

> "With polling. While the status is pending, the page asks the server again. I increase the time between requests: two seconds, four, eight, up to thirty, so I don't overload the API. When the status is final, like paid or failed, the polling stops. I also show when it was last checked. And if the backend offers a push channel, I would use that instead of polling."

Âncora: **polling while pending → two, four, eight, up to thirty → stops when final → 'last checked' → push if there is one.**

### 12 · Sem store global

**"Do you still need a global store, like Redux?"**

> "Much less. Most of what used to go in a global store was server data, and the query cache holds that now. What is left is small. An open dialog stays in its component. Filters and sorting go in the URL. And a few things that are really global, like the signed-in user, go in a context. If the app had complex client state, I would add a small store, but I wouldn't start with one."

Âncora: **server data → the query cache → dialog in the component → filters in the URL → the user in a context.**

### 13 · Os testes

**"How do you test a screen that fetches data?"**

> "I render the real screen and mock only the network, so the test goes through the real fetching and caching code. Each test gets its own cache, so data doesn't leak from one test to the next. I turn retries off in tests, so a failing request fails at once. Then I test the states: loading, an error that recovers on retry, the data, and the empty list."

Âncora: **real screen, mocked network → its own cache → retries off → loading, error, data, empty.**

---

## Como dizer os termos em voz alta

- `staleTime`: "how long the data counts as fresh"
- `gcTime`: "how long unused data stays in memory"
- `invalidateQueries`: "I refresh the related data"
- `queryKey`: "the cache key"
- `useMutation`: "a mutation: a write"
- `refetchInterval`: "polling"
- `keepPreviousData`: "the old rows stay on screen until the new ones arrive"
- 401 = "four-oh-one" · 403 = "four-oh-three" · 409 = "four-oh-nine" · 500 = "five hundred"
