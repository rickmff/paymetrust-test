# React e React Router: o que são, como usar, e as perguntas de entrevista

Guia de estudo para a entrevista da PayMeTrust. Na vaga, "React" e "React Router" vêm primeiro na lista de tecnologias. As explicações estão em português. As perguntas e as respostas da parte 5 estão em inglês, prontas para dizer em voz alta.

- **Parte 1:** o que são o React e o React Router.
- **Parte 2:** o vocabulário, em 17 palavras.
- **Parte 3:** como se usa.
- **Parte 4:** como foram usados neste repositório.
- **Parte 5:** as 15 perguntas mais comuns, com a resposta pronta.

Pronúncia: "route" soa _rut_ e "router" soa _RU-ter_ (os americanos dizem _raut_ e _RAU-ter_; as duas formas servem). "Render" soa _REN-der_. "Nested" soa _NÉS-tid_. "Vite" soa _vit_.

---

## 1 · O que são

**O React** é uma biblioteca para construir interfaces a partir de componentes. Um componente é uma função: recebe dados e devolve o que deve estar na tela. Quando um dado muda, o React chama a função de novo e altera na página só o que ficou diferente.

**O React Router** decide que componente aparece para cada endereço. Lê a URL, escolhe as rotas que correspondem e mostra-as, umas dentro das outras.

|                    | React                                   | React Router                                     |
| ------------------ | --------------------------------------- | ------------------------------------------------ |
| A pergunta         | o que aparece na tela para estes dados? | o que aparece na tela para este endereço?        |
| A peça básica      | o componente                            | a rota                                           |
| Como se compõe     | componentes dentro de componentes       | rotas dentro de rotas                            |
| Onde está o estado | no componente, ou num contexto          | na URL: o caminho, os parâmetros, a query string |

**O que o React tem de especial**

- **É declarativo:** descreve-se o resultado para cada estado, não os passos para lá chegar.
- **Componentes:** peças pequenas, reutilizáveis, que se combinam.
- **Hooks:** funções que dão a um componente memória, efeitos e acesso a contextos.
- **Os dados descem, os eventos sobem:** o pai passa dados ao filho, e o filho avisa o pai com uma função.

**O que o React Router tem de especial**

- **Rotas aninhadas:** um layout partilhado, com um lugar onde a página aparece.
- **Navegação sem recarregar a página.**
- **A URL como estado:** o id de um detalhe, os filtros, a ordenação.
- **Redirecionamentos e guards.**
- **Uma tela de erro** quando uma página quebra.

---

## 2 · O vocabulário

**Do React**

| Termo            | O que é                                                       | Como dizer sem código                             |
| ---------------- | ------------------------------------------------------------- | ------------------------------------------------- |
| Component        | uma função que devolve interface                              | "a component"                                     |
| Props            | os dados que o pai passa ao filho                             | "props: the inputs of a component"                |
| State            | o que o componente lembra entre uma renderização e a seguinte | "state"                                           |
| Render           | o React chamar a função do componente                         | "React renders the component again"               |
| Hook             | uma função que liga o componente ao React                     | "a hook"                                          |
| Effect           | código que sincroniza o componente com algo de fora do React  | "an effect: syncing with something outside React" |
| Context          | um valor disponível a toda uma parte do app, sem passar props | "context"                                         |
| Controlled input | um input cujo valor vem do state                              | "a controlled input"                              |
| Key              | a identidade de um item numa lista                            | "a stable key"                                    |

**Do React Router**

| Termo         | O que é                                                 | Como dizer sem código                        |
| ------------- | ------------------------------------------------------- | -------------------------------------------- |
| Route         | uma regra: este endereço mostra este componente         | "a route"                                    |
| Nested route  | uma rota dentro de outra                                | "nested routes"                              |
| Layout route  | uma rota sem endereço próprio, que só envolve as filhas | "a layout route"                             |
| Outlet        | o lugar onde a rota-filha aparece                       | "the place where the child page renders"     |
| Index route   | a filha que aparece por omissão                         | "the default child"                          |
| Route param   | uma parte variável do caminho, como o id                | "a route parameter, like the transaction id" |
| Search params | o que vem depois do ponto de interrogação               | "the query string"                           |
| Guard         | uma rota que confere antes de mostrar as filhas         | "a route guard"                              |

---

## 3 · Como se usa

**Instalar**

```bash
npm create vite@latest my-app -- --template react-ts
npm install react-router
```

Nas versões recentes instala-se só o pacote `react-router`. O `react-router-dom` já não é preciso.

**A anatomia de um componente**

```tsx
type StatusFilterProps = {
  value: string | null; // 1. props: o que vem do pai
  onChange: (status: string | null) => void; // os eventos sobem por uma função
};

function StatusFilter({ value, onChange }: StatusFilterProps) {
  const [isOpen, setIsOpen] = useState(false); // 2. state: o que só este componente lembra

  // 3. Devolve o que deve estar na tela para estes dados
  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>
        {value ?? "All statuses"}
      </button>
      {isOpen && <StatusList onPick={onChange} />}
    </div>
  );
}
```

**A anatomia das rotas**

```tsx
const routes = [
  {
    element: <AppLayout />, // layout route: sem endereço, só envolve
    children: [
      { index: true, element: <Dashboard /> }, // "/"
      { path: "transactions", element: <Transactions /> }, // "/transactions"
      { path: "transactions/:id", element: <TransactionDetail /> }, // ":id" é um parâmetro
    ],
  },
];

const router = createBrowserRouter(routes);

<RouterProvider router={router} />;

function AppLayout() {
  return (
    <>
      <Header />
      <Outlet /> {/* aqui aparece a página da rota-filha */}
    </>
  );
}
```

**As peças do dia a dia**

| Peça                             | Para que serve                                               |
| -------------------------------- | ------------------------------------------------------------ |
| `useState`                       | o state de um componente                                     |
| `useEffect`                      | sincronizar com algo de fora do React                        |
| `useRef`                         | guardar um valor ou um elemento, sem renderizar de novo      |
| `useMemo` e `useCallback`        | guardar um cálculo ou uma função entre renderizações         |
| `createContext` e `use`          | criar e ler um contexto                                      |
| `Link` e `NavLink`               | navegar sem recarregar; o `NavLink` sabe se é a página atual |
| `Navigate`                       | redirecionar                                                 |
| `Outlet`                         | o lugar da rota-filha                                        |
| `useNavigate`                    | navegar por código, por exemplo depois de um envio           |
| `useParams`                      | ler o id do caminho                                          |
| `useSearchParams`                | ler e escrever a query string                                |
| `useLocation`                    | o endereço atual, e o estado que veio com a navegação        |
| `errorElement` e `useRouteError` | a tela de erro                                               |

**As cinco regras**

1. O state fica o mais perto possível de quem o usa. Só sobe quando dois componentes precisam dele.
2. Não guarde em state o que se pode calcular do que já existe.
3. Dado do servidor fica no cache das queries. O que o usuário pode partilhar, como filtros e ordenação, fica na URL.
4. Um effect é para sincronizar com algo de fora: um temporizador, um evento do navegador. Não é para buscar dados nem para calcular state.
5. O que se repete em várias páginas, como o cabeçalho, a sessão e a permissão, vai para uma rota-pai, não para cada página.

---

## 4 · Como foram usados neste repositório

### 4.1 Os ficheiros

| Ficheiro                                                                                                      | Papel                                          |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| [src/main.tsx](../src/main.tsx)                                                                               | o ponto de entrada: os providers e o router    |
| [src/app/router.tsx](../src/app/router.tsx)                                                                   | a árvore de rotas                              |
| [src/app/RootLayout.tsx](../src/app/RootLayout.tsx)                                                           | liga os links do HeroUI ao router              |
| [src/app/AppLayout.tsx](../src/app/AppLayout.tsx)                                                             | o cabeçalho, o menu, e o lugar da página       |
| [src/app/RouteError.tsx](../src/app/RouteError.tsx)                                                           | a tela de erro, e a de "página não encontrada" |
| [src/features/auth/guards.tsx](../src/features/auth/guards.tsx)                                               | os guards, como layout routes                  |
| [src/features/auth/session.ts](../src/features/auth/session.ts)                                               | o contexto da sessão                           |
| [src/features/auth/LoginPage.tsx](../src/features/auth/LoginPage.tsx)                                         | o redirecionamento depois do login             |
| [src/features/transactions/TransactionsPage.tsx](../src/features/transactions/TransactionsPage.tsx)           | os filtros e a ordenação na URL                |
| [src/features/transactions/TransactionDetailPage.tsx](../src/features/transactions/TransactionDetailPage.tsx) | o id lido do caminho                           |
| [src/features/payouts/new/NewPayoutLayout.tsx](../src/features/payouts/new/NewPayoutLayout.tsx)               | uma rota-pai que partilha dados com as filhas  |
| [src/components/](../src/components/)                                                                         | os componentes partilhados                     |
| [src/test/render.tsx](../src/test/render.tsx)                                                                 | a mesma árvore de rotas, nos testes            |

### 4.2 O arranque

Em [main.tsx](../src/main.tsx) há três camadas, de fora para dentro:

1. `StrictMode`: em desenvolvimento, o React avisa de erros comuns.
2. `QueryClientProvider`: o cache dos dados do servidor.
3. `RouterProvider`: o router, criado com `createBrowserRouter`.

### 4.3 A árvore de rotas

Em [router.tsx](../src/app/router.tsx), as rotas são dados: um array de objetos, exportado.

```
RootLayout              liga os links do HeroUI ao router
├─ /login
└─ RequireAuth          exige sessão
   └─ AppLayout         cabeçalho, menu, e o lugar da página
      ├─ /              Dashboard
      ├─ /transactions  a lista
      ├─ /transactions/:id   o detalhe
      ├─ /payouts       exige a permissão "payout:read"
      │  └─ /new        exige a permissão "payout:create"
      │     └─ NewPayoutLayout
      │        └─ recipient · amount · review
      └─ *              página não encontrada
```

Como a árvore é exportada, os testes usam exatamente a mesma, e exercitam os guards e os layouts de verdade.

**Cada página é carregada a pedido.** Todas as páginas são rotas `lazy`: o código de uma página só é descarregado quando ela é aberta pela primeira vez. A tela de login não traz consigo as tabelas nem o formulário.

- Os guards, os layouts e a tela de erro vêm no primeiro download, porque são precisos logo.
- Enquanto o código da primeira página chega, aparece um spinner (`hydrateFallbackElement`).
- Enquanto o código de uma página seguinte chega, a página atual fica mais apagada. O `AppLayout` sabe disso pelo `useNavigation`.

### 4.4 As layout routes

Uma rota sem `path` não acrescenta nada ao endereço. Só envolve as filhas e mostra-as no `<Outlet />`.

| Layout route        | O que faz                                                       |
| ------------------- | --------------------------------------------------------------- |
| `RootLayout`        | ensina o HeroUI a navegar com o router, sem recarregar a página |
| `RequireAuth`       | resolve a sessão; sem sessão, redireciona para o login          |
| `AppLayout`         | o cabeçalho e o menu, iguais em todas as páginas                |
| `RequirePermission` | bloqueia um ramo inteiro por uma permissão                      |
| `NewPayoutLayout`   | guarda o rascunho do formulário, e entrega-o às etapas          |

Cada regra é escrita uma vez, na rota-pai, e todas as páginas debaixo dela a recebem.

### 4.5 Onde vive cada estado

| O estado                                     | Onde vive                                    | Porquê                                                            |
| -------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------- |
| Transações, payouts, resumo, sessão          | o cache do TanStack Query                    | é uma cópia do servidor, com regras de frescura                   |
| Filtros, ordenação, etapa do formulário      | a URL                                        | sobrevive a um recarregar, ao botão voltar e a um link partilhado |
| O usuário, para o app inteiro                | um contexto                                  | é lido em muitos lugares e muda raramente                         |
| O rascunho do formulário                     | o state da rota-pai, mais o `sessionStorage` | tem de viver mais do que uma etapa                                |
| Um diálogo aberto, o que está a ser digitado | o state do componente, ou o React Hook Form  | só interessa àquela tela                                          |

### 4.6 A URL como estado

- **Os filtros e a ordenação da lista de transações** são lidos com `useSearchParams` e validados com o Zod. Mudar um filtro muda a URL, e a tela reage à URL ([TransactionsPage.tsx](../src/features/transactions/TransactionsPage.tsx)).
- **A ordenação da lista de payouts** também fica na URL ([PayoutsPage.tsx](../src/features/payouts/PayoutsPage.tsx)).
- **O id do detalhe** vem de `useParams`. Pode faltar, por isso tem um valor por omissão ([TransactionDetailPage.tsx](../src/features/transactions/TransactionDetailPage.tsx)).
- **A etapa atual do formulário** é o próprio endereço.

### 4.7 Navegar

| Peça          | Onde                                                 | Para quê                                                   |
| ------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| `NavLink`     | o menu, em [AppLayout.tsx](../src/app/AppLayout.tsx) | destaca a página atual, e marca-a para os leitores de tela |
| `Link`        | "New payout", "Cancel", "Back"                       | um link com aparência de botão                             |
| `useNavigate` | as etapas do formulário                              | ir para a etapa seguinte depois de um envio válido         |
| `Navigate`    | os guards, e a página de login                       | redirecionar ao renderizar                                 |

Dois pormenores:

- **O login não chama `navigate`.** O login só grava o usuário no cache. A página de login vê que há sessão e redireciona sozinha, para o endereço que a pessoa queria ([LoginPage.tsx](../src/features/auth/LoginPage.tsx)).
- **O estado que viaja com a navegação não tem tipo.** O "de onde vim" do login e o aviso "payout criado" passam por um schema do Zod antes de serem usados. O "de onde vim" guarda o endereço inteiro, com os filtros, e só é seguido se for um caminho de dentro do app.

O que acontece depois de cada navegação, para quem usa teclado ou leitor de tela:

- **O título do separador muda.** [PageTitle.tsx](../src/components/PageTitle.tsx) devolve um `<title>`, e o React 19 leva-o para o `<head>`.
- **O foco vai para o conteúdo da página nova.** Uma navegação sem recarregar não avisa ninguém, por isso o hook `useFocusOnNavigation`, em [RootLayout.tsx](../src/app/RootLayout.tsx), põe o foco no `<main>`.
- **O primeiro Tab de cada página é o link "Skip to content",** que salta o menu.

### 4.8 Os erros e a página não encontrada

Em [RouteError.tsx](../src/app/RouteError.tsx):

- **`RouteError`** está na raiz da árvore, em `errorElement`. Um erro ao renderizar qualquer página mostra esta tela, em vez de uma página em branco. O mesmo vale para uma página cujo código não chegou a ser descarregado. Nos dois casos a saída é recarregar o app, por isso a tela tem um botão "Reload".
- **`NotFound`** responde a qualquer endereço desconhecido. Está dentro do `AppLayout`, por isso o menu continua a funcionar.

Um pedido que falha não é um erro deste tipo. Cada tela mostra-o com o `ErrorState` e um botão de repetir.

### 4.9 O contexto da sessão

Em [session.ts](../src/features/auth/session.ts):

- O valor por omissão do contexto é `undefined`, de propósito: não existe um "usuário vazio" com sentido.
- `useSession` lança um erro se for usado fora do `RequireAuth`. Quem o usa recebe sempre um usuário, nunca `undefined`.
- O contexto é lido com `use`, e fornecido com `<SessionContext value={...}>`, a forma do React 19.

### 4.10 Os componentes partilhados

| Componente                                               | O que garante em todo o app                                          |
| -------------------------------------------------------- | -------------------------------------------------------------------- |
| [DataTable.tsx](../src/components/DataTable.tsx)         | a tabela acessível, com os estados de loading, vazio e "a atualizar" |
| [FormTextField.tsx](../src/components/FormTextField.tsx) | rótulo, ajuda e erro ligados ao campo                                |
| [ErrorState.tsx](../src/components/ErrorState.tsx)       | uma só forma de mostrar um pedido que falhou                         |
| [StatusChip.tsx](../src/components/StatusChip.tsx)       | um status tem sempre ícone e texto, nunca só cor                     |
| [Money.tsx](../src/components/Money.tsx)                 | o dinheiro formatado da mesma maneira em todas as telas              |
| [PageTitle.tsx](../src/components/PageTitle.tsx)         | cada página dá o seu nome ao separador do navegador                  |

Os padrões por trás deles:

- **O componente mostra, a página decide.** A tabela mostra a ordenação e avisa de um clique num cabeçalho. Quem ordena é a página, ou o servidor.
- **A página passa os textos.** O que dizer quando a lista está vazia é uma prop, não uma frase fixa na tabela.
- **Montar só quando é preciso.** O diálogo de decisão só existe enquanto está aberto, por isso cada decisão começa com um formulário limpo ([PayoutsPage.tsx](../src/features/payouts/PayoutsPage.tsx)).

### 4.11 Os hooks e os effects

- **Não há nenhum `useEffect` para buscar dados.** Todas as leituras são queries.
- **Os effects que existem sincronizam com o navegador.** É para isto que um effect serve:

| Onde                                                       | O que o effect faz                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| [Numpad.tsx](../src/components/numpad/Numpad.tsx)          | o teclado numérico: o foco, os cliques fora, a posição na página          |
| [RootLayout.tsx](../src/app/RootLayout.tsx)                | põe o foco no conteúdo depois de uma navegação                            |
| [PayoutsPage.tsx](../src/features/payouts/PayoutsPage.tsx) | tira o aviso "sent for approval" do histórico, para não voltar num reload |

- **O `useState` das páginas é pouco e local:** que decisão está pendente, o rascunho, os erros do servidor.

### 4.12 O que não foi usado

- **Loaders e actions do router.** Os dados são buscados nos componentes, com o TanStack Query, para os estados de loading e de erro ficarem visíveis em cada tela. O `lazy` das rotas carrega só o código da página, não os dados.
- **Aviso ao sair de um formulário a meio** (`useBlocker`).

### 4.13 Os testes

Em [render.tsx](../src/test/render.tsx), `renderApp` recebe um endereço e um perfil, e monta o app verdadeiro num router de memória: as mesmas rotas, guards e layouts. Só a rede é fingida.

| Teste                                                                              | O que prova                         |
| ---------------------------------------------------------------------------------- | ----------------------------------- |
| "an anonymous visitor signs in and lands on the page they asked for"               | o redirecionamento do login         |
| "signing in returns to the filtered list the visitor asked for, not just its path" | o endereço inteiro é lembrado       |
| "an address that points outside the app is not followed after signing in"          | o redirecionamento é validado       |
| "going to another page names it in the tab and moves the focus to its content"     | o título e o foco depois de navegar |
| "the menu only offers what the user may open"                                      | o menu por permissão                |
| "restores the filters from the URL, so a shared link shows the same view"          | a URL como estado                   |
| "ignores a filter value the URL should never have had"                             | a URL é validada                    |
| "opening the review URL directly sends the user to the first unfinished step"      | o guard das etapas                  |
| "a viewer who types the URL gets a clear refusal, not the form"                    | o guard de permissão                |

No end-to-end: "filters live in the URL and survive a reload", e "an anonymous visitor is sent to login, then back to the page they wanted".

---

## 5 · As 15 perguntas mais comuns

A entrevista é só de voz, por isso nenhuma resposta tem código nem cita este repositório. Os exemplos são de qualquer sistema de pagamentos.

Frases entre [colchetes] falam da sua experiência. Só use se forem verdade.

### 1 · A sua experiência

**"What's your experience with React and React Router?"**

Preencha os colchetes com os factos verdadeiros.

> "[I've worked with React for about five years, mostly with Next.js: I led a Next.js project at Try, and at TLScontact I worked on the migration from Vue to Next.js.] [In those projects the routing was the Next.js router, not React Router.] The ideas are the same: nested layouts, route parameters and guards. I've been practicing with React Router: the routes as a tree, layout routes for the session and the permissions, and filters in the URL."

Âncora: **my React years and projects → Next.js routing → same ideas → what I practiced with React Router.**

Um "ainda não em produção" honesto, seguido do que você sabe fazer, vale mais do que um "sim" vago.

### 2 · O que acontece quando o state muda

**"What happens when state changes in React?"**

> "React calls the component function again with the new state, and gets a new description of the screen. It compares it with the previous one, and changes only what is different in the page. The children render again too, by default. Usually that is fast. When it is not, I first look for the cause: state that lives too high, or a heavy calculation. Then I move the state down, or I memoize that part."

Âncora: **calls the function again → compares → changes only the difference → children render too → find the cause first.**

### 3 · Onde vive o state

**"How do you decide where state lives?"**

> "I ask what kind of state it is. Data from the server goes in the query cache, not in component state. Things the user may share or come back to, like filters, sorting and the current step, go in the URL. State that only one screen needs, like an open dialog, stays in that component. And a few global things, like the signed-in user, go in a context. I start local, and I lift state up only when two components need it."

Âncora: **server data → query cache → filters → the URL → a dialog → the component → the user → a context → start local.**

### 4 · Effects

**"When do you use `useEffect`, and when not?"**

> "An effect is for syncing with something outside React: a timer, a browser event, a subscription. I don't use it to fetch data: a query library handles loading, errors, caching and cancelling. And I don't use it to calculate one state from another: I calculate the value during render. A sign of a wrong effect is one that only sets state. When I do need one, I always return the cleanup."

Âncora: **syncing with something outside React → not for fetching → not for calculating state → always a cleanup.**

### 5 · Memoização

**"When do you use `useMemo` and `useCallback`?"**

> "Not by default. They make the code harder to read, and most renders are cheap. I add them when I measure a real problem: a heavy calculation, like sorting a big list, or a function that an effect depends on. And the React Compiler can do most of this automatically, so in a project that uses it, I write even fewer of them."

Âncora: **not by default → most renders are cheap → when I measure a problem → the compiler does most of it.**

### 6 · As keys

**"What are keys in a list, and why not use the index?"**

> "A key tells React which item is which between renders. With a stable id, like the transaction id, React keeps each row's state with the right row. With the index, when a new payment arrives at the top, or the list is sorted, every row shifts. React reuses the wrong row, and things like an open menu or a typed value end up on another transaction."

Âncora: **which item is which → a stable id → with the index, rows shift → state ends up on the wrong row.**

### 7 · Inputs controlados

**"What is the difference between a controlled and an uncontrolled input?"**

> "In a controlled input, React state holds the value: every key press updates the state and renders again. In an uncontrolled input, the browser holds the value, and I read it when I need it. Controlled is simple for one or two fields, or when the value is formatted while the user types. For big forms, I use React Hook Form, which is uncontrolled by default, so typing doesn't render the whole form again."

Âncora: **controlled: state holds the value → uncontrolled: the browser holds it → big forms: React Hook Form.**

### 8 · Partilhar state

**"How do you share state without passing props through many levels?"**

> "First I check if I really need to: often I can pass a component as children, and the levels in the middle don't need the data. For values that many parts read and that rarely change, like the signed-in user, I use context, with a hook that throws an error outside the provider, so the value is never undefined. I don't put fast-changing data in context, because every reader renders again."

Âncora: **composition first → context for values that rarely change → a hook that throws outside the provider → no fast-changing data.**

### 9 · Um componente reutilizável

**"How do you build a reusable component?"**

> "I start from a real need in two places, not from a guess. The component owns what must be the same everywhere: the markup, the accessibility, the loading and empty states. The page keeps the decisions: which columns, which words, what happens on a click. For example, a data table shows the rows and reports a click on a header, but the page decides how to sort. And I keep the props small and typed, so a wrong use doesn't compile."

Âncora: **a real need in two places → the component owns what is the same → the page keeps the decisions → small, typed props.**

### 10 · Organizar as rotas

**"How do you organize the routes of an app like this?"**

> "As a tree. At the top, a layout that checks the session. Inside it, the app shell, with the header and the menu. Inside that, the pages. A group of pages that needs a permission goes under a guard for that permission. So a rule is written once, on the parent, and every page under it gets it. A list and its detail are two routes, and the detail has the id in the address."

Âncora: **a tree → session at the top → the shell → the pages → a guard per group → a rule written once.**

### 11 · Proteger rotas

**"How do you protect routes?"**

> "With guards around the routes. One guard checks the session: if there is none, it sends the user to login and remembers the page they wanted. Another guard checks one permission, and protects a whole group of pages. If a user types the address without the permission, they see a clear message, not a broken page. But the guard is only user experience: the API checks again."

Âncora: **a guard for the session → remembers the page → a guard for one permission → a clear message → the API checks again.**

É a mesma resposta da pergunta 6 de [PERMISSIONS.md](PERMISSIONS.md).

### 12 · Filtros na URL

**"Why keep filters in the URL?"**

> "Because the URL is state that the user can keep and share. Filters in the URL survive a refresh and the back button, and an operator can send a link to a colleague, who sees the same view. In the code, the URL is the only source: the screen reads the filters from it, and changing a filter changes the URL. And I validate what I read, because anyone can edit a URL: an invalid value is dropped."

Âncora: **refresh, back button, shared link → the URL is the only source → validate what I read.**

### 13 · Onde buscar os dados

**"Do you fetch data in the router or in the components?"**

> "They solve different problems. A route loader decides when to fetch: before the page shows. A query library decides how to cache. I usually fetch in the components, with the query library, so each screen has clear loading and error states. If I wanted the data to start loading earlier, I would use the loader only to warm the cache, and still read the data through the query."

Âncora: **a loader decides when → a query library decides how to cache → fetch in components → the loader only warms the cache.**

### 14 · Uma página quebra

**"What happens when a page crashes, or the address doesn't exist?"**

> "Both need a real screen, not a blank page. For a crash, the router has an error boundary: an error while rendering shows a page that says something broke, with a link back. For an unknown address, a catch-all route shows 'page not found' inside the normal layout, so the menu still works. A failed request is different: it is not a crash. The screen shows the error, with a retry."

Âncora: **never a blank page → error boundary for a crash → catch-all for an unknown address → a failed request is not a crash.**

### 15 · O primeiro carregamento

**"How do you keep the first load fast in a large app?"**

> "I split the code by route. Each page is downloaded when the user first opens it, so the login screen doesn't carry the tables and the forms with it. The shell and the guards come in the first download, because they are needed at once. While the code of a page is on its way, the layout stays on screen with a light loading state. And if that download fails, the user sees an error page with a reload button, not a blank screen."

Âncora: **split by route → a page downloads when first opened → shell and guards first → light loading state → reload if the download fails.**

---

## Como dizer os termos em voz alta

- `useState`: "state"
- `useEffect`: "an effect"
- `<Outlet />`: "the place where the child page renders"
- Layout route: "a parent route that wraps the pages"
- `useSearchParams`: "I read the filters from the query string"
- `useParams`: "the id comes from the address"
- `errorElement`: "an error boundary on the route"
- `:id`: "a route parameter"
- `*`: "a catch-all route"
- `lazy`: "the page's code is downloaded when the page is first opened"
