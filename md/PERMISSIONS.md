# Permissões por perfil: o que é, como usar, e as perguntas de entrevista

Guia de estudo para a entrevista da PayMeTrust. A vaga pede "role-based permissions to ensure users can only access and perform the appropriate actions". As explicações estão em português. As perguntas e as respostas da parte 5 estão em inglês, prontas para dizer em voz alta.

- **Parte 1:** o que são permissões por perfil.
- **Parte 2:** o vocabulário, em 12 palavras.
- **Parte 3:** como se usa.
- **Parte 4:** como foi usado neste repositório.
- **Parte 5:** as 12 perguntas mais comuns, com a resposta pronta.

Pronúncia: "role" soa _rôul_. "Authorization" soa _ó-tho-rai-ZEI-shon_. RBAC diz-se por extenso: "role-based access control".

---

## 1 · O que é

Permissões por perfil (RBAC, de "role-based access control") é uma forma de decidir quem pode fazer o quê. Cada usuário tem um perfil. Cada perfil dá uma lista de permissões. Cada ação exige uma permissão.

**Duas perguntas diferentes**

|                              | Autenticação       | Autorização                  |
| ---------------------------- | ------------------ | ---------------------------- |
| A pergunta                   | quem é você?       | o que você pode fazer?       |
| Quando falha, a API responde | 401                | 403                          |
| O que a tela faz             | manda para o login | esconde, desativa ou explica |

**A ideia mais importante**

O frontend não protege nada. Ele só decide o que mostrar. Quem protege é o servidor.

| O que se faz              | Para que serve         |
| ------------------------- | ---------------------- |
| Esconder um botão         | experiência do usuário |
| Bloquear uma rota na tela | experiência do usuário |
| Recusar o pedido na API   | segurança              |

Qualquer pessoa pode chamar a API sem passar pela tela. Por isso a verificação do servidor é a que conta.

**Perfil ou permissão**

A tela pergunta pela permissão, nunca pelo nome do perfil. Os perfis mudam de nome, juntam-se e dividem-se. A pergunta "pode aprovar um payout?" continua igual.

**A regra das duas pessoas**

Em pagamentos é comum que quem cria uma operação não a possa aprovar. Em inglês chama-se "maker-checker". Não é uma permissão: é uma regra sobre aquele payout em particular.

---

## 2 · O vocabulário

| Termo           | O que é                                         | Como dizer sem código                     |
| --------------- | ----------------------------------------------- | ----------------------------------------- |
| Authentication  | provar quem você é                              | "who you are"                             |
| Authorization   | o que você pode fazer                           | "what you are allowed to do"              |
| Role            | um perfil: viewer, maker, approver              | "a role"                                  |
| Permission      | uma ação sobre um recurso: aprovar um payout    | "a permission: a resource plus an action" |
| RBAC            | permissões dadas pelo perfil                    | "role-based permissions"                  |
| Session         | o login ativo                                   | "the session"                             |
| 401             | não há sessão                                   | "four-oh-one: not signed in"              |
| 403             | há sessão, mas não há permissão                 | "four-oh-three: not allowed"              |
| Route guard     | uma rota que confere antes de mostrar as filhas | "a route guard"                           |
| Maker-checker   | quem cria não aprova                            | "a second person must approve"            |
| Source of truth | onde a regra vale de verdade: o servidor        | "the backend is the source of truth"      |
| HttpOnly cookie | um cookie que o JavaScript não consegue ler     | "a cookie that scripts can't read"        |

---

## 3 · Como se usa

Não há nada para instalar. É um padrão, não uma biblioteca. Tem quatro peças:

1. O servidor envia as permissões junto com o usuário.
2. Uma só função responde "este usuário pode fazer isto?".
3. Três lugares usam essa função: as rotas, o menu e os botões.
4. O 401 e o 403 da API são sempre tratados.

**A anatomia**

```tsx
// 1. Uma permissão é um recurso e uma ação
type Permission = "payout:read" | "payout:create" | "payout:approve";

// 2. Uma só função responde "pode?"
function useCan() {
  const { permissions } = useSession(); // vieram do servidor, com o usuário
  return (permission: Permission) => permissions.includes(permission);
}

// 3. Esconder o que a pessoa nunca pode usar
function Can(props: { permission: Permission; children: ReactNode }) {
  const can = useCan();
  return can(props.permission) ? props.children : null;
}

<Can permission="payout:create">
  <Link to="/payouts/new">New payout</Link>
</Can>;
```

```tsx
// 4. Bloquear um ramo inteiro de rotas
const routes = [
  {
    path: "payouts/new",
    element: <RequirePermission permission="payout:create" />,
    children: [{ index: true, element: <NewPayoutPage /> }],
  },
];
```

**Esconder, desativar ou explicar**

| A situação                        | O que a tela faz                        | Exemplo                                     |
| --------------------------------- | --------------------------------------- | ------------------------------------------- |
| Nunca pode                        | esconde                                 | o viewer não vê o botão "New payout"        |
| Pode em geral, mas não neste caso | desativa, e diz o motivo em texto       | o approver, no payout que ele próprio criou |
| Chegou à URL sem permissão        | mostra uma recusa clara                 | o viewer digita o endereço do formulário    |
| A API respondeu 403               | mostra a mensagem, sem botão de repetir | a permissão mudou depois do login           |
| A API respondeu 401               | termina a sessão e manda para o login   | a sessão expirou                            |

**As cinco regras**

1. O servidor decide. A tela só mostra.
2. Pergunte pela permissão, nunca pelo nome do perfil.
3. Uma só função "pode?", usada em todo o lado.
4. Nunca pode: esconder. Pode, mas não agora: desativar e explicar.
5. Trate sempre o 401 e o 403, porque a tela pode estar desatualizada.

---

## 4 · Como foi usado neste repositório

### 4.1 Os ficheiros

| Ficheiro                                                                        | Papel                                                 |
| ------------------------------------------------------------------------------- | ----------------------------------------------------- |
| [api/store.go](../api/store.go)                                                 | o mapa de perfil para permissões                      |
| [api/http.go](../api/http.go)                                                   | `auth` (401) e `can` (403): a proteção de verdade     |
| [api/main.go](../api/main.go)                                                   | cada rota da API com a permissão que exige            |
| [api/handlers.go](../api/handlers.go)                                           | o cookie da sessão, e a regra "quem criou não decide" |
| [src/features/auth/schemas.ts](../src/features/auth/schemas.ts)                 | o tipo `Permission`, e o schema do usuário            |
| [src/features/auth/api.ts](../src/features/auth/api.ts)                         | a sessão, o login, o logout e `endSession`            |
| [src/features/auth/session.ts](../src/features/auth/session.ts)                 | `useSession` e `useCan`                               |
| [src/features/auth/guards.tsx](../src/features/auth/guards.tsx)                 | `RequireAuth`, `RequirePermission` e `Can`            |
| [src/app/router.tsx](../src/app/router.tsx)                                     | onde os guards entram na árvore de rotas              |
| [src/app/query-client.ts](../src/app/query-client.ts)                           | o 401 tratado num lugar só                            |
| [src/features/payouts/PayoutsPage.tsx](../src/features/payouts/PayoutsPage.tsx) | esconder a coluna de ações, desativar o botão         |
| [e2e/permissions.spec.ts](../e2e/permissions.spec.ts)                           | os testes end-to-end                                  |

### 4.2 Os três perfis

Em [api/store.go](../api/store.go), `rolePermissions`:

| Perfil   | `transaction:read` | `payout:read` | `payout:create` | `payout:approve` |
| -------- | ------------------ | ------------- | --------------- | ---------------- |
| viewer   | sim                | sim           |                 |                  |
| maker    | sim                | sim           | sim             |                  |
| approver | sim                | sim           | sim             | sim              |

O approver também pode criar payouts. Só não pode decidir os que ele próprio criou.

### 4.3 No servidor: a proteção de verdade

- **`auth`**, em [api/http.go](../api/http.go): lê o cookie da sessão e encontra o usuário. Sem sessão, responde 401.
- **`can`**, no mesmo ficheiro: confere se o usuário tem a permissão pedida. Sem ela, responde 403.
- **As rotas**, em [api/main.go](../api/main.go): cada uma declara a sua permissão. Aprovar e rejeitar pedem `payout:approve`.
- **Quem criou não decide**, em [api/handlers.go](../api/handlers.go): o servidor responde 403, com o código `self_approval`.
- **O cookie da sessão** é `HttpOnly`, por isso o JavaScript não o lê, e `SameSite=Lax`, por isso outro site não o consegue enviar num POST.

### 4.4 A sessão no frontend

- **O usuário chega com as suas permissões.** O pedido `/api/me` devolve nome, perfil e a lista de permissões.
- **A sessão vive no cache das queries:** o usuário quando há sessão, `null` quando não há ([auth/api.ts](../src/features/auth/api.ts)).
- **`RequireAuth`**, em [guards.tsx](../src/features/auth/guards.tsx), é uma rota que envolve o app todo:

| O estado da sessão | O que aparece                                                               |
| ------------------ | --------------------------------------------------------------------------- |
| a carregar         | um spinner                                                                  |
| o pedido falhou    | o erro, com botão de repetir                                                |
| não há sessão      | redireciona para o login, e lembra o endereço inteiro para onde a pessoa ia |
| há sessão          | o app, com o usuário disponível para todas as telas                         |

- **`useSession`**, em [session.ts](../src/features/auth/session.ts), devolve o usuário e nunca `undefined`: usado fora do `RequireAuth`, lança um erro.
- **Depois do login,** a pessoa volta ao endereço que queria, com os filtros. Esse endereço só é seguido se for um caminho de dentro do app: um valor que aponte para outro site é ignorado ([LoginPage.tsx](../src/features/auth/LoginPage.tsx)).

### 4.5 Uma só pergunta

Em [session.ts](../src/features/auth/session.ts), `useCan` é o único lugar onde a tela pergunta "este usuário pode fazer isto?".

- **O tipo `Permission`** é um recurso mais uma ação. Um erro de digitação numa permissão não compila ([auth/schemas.ts](../src/features/auth/schemas.ts)).
- **As permissões do usuário chegam como texto livre**, de propósito. Se o backend lançar uma permissão nova, o login continua a funcionar. O rigor está na função "pode?", não no schema.

### 4.6 Os três níveis

| Nível            | Peça                    | Onde é usada                                                                                              |
| ---------------- | ----------------------- | --------------------------------------------------------------------------------------------------------- |
| Rota             | `RequirePermission`     | [router.tsx](../src/app/router.tsx): `/payouts` pede `payout:read`, `/payouts/new` pede `payout:create`   |
| Menu e botões    | `Can`                   | o link "Payouts" no menu, o botão "New payout", o número de payouts pendentes no dashboard                |
| Ações numa linha | `can("payout:approve")` | [PayoutsPage.tsx](../src/features/payouts/PayoutsPage.tsx): sem a permissão, a coluna de ações nem existe |

### 4.7 Esconder ou desativar

Em [PayoutsPage.tsx](../src/features/payouts/PayoutsPage.tsx), `DecisionButtons`:

- **O viewer e o maker** não veem a coluna de ações. Nunca podem aprovar, por isso não há nada para mostrar.
- **O approver, num payout de outra pessoa,** vê "Approve" e "Reject".
- **O approver, num payout que ele criou,** vê os botões desativados e a frase "You created this payout. Another approver must decide."

O motivo está em texto visível, não num tooltip: um botão desativado não recebe foco nem hover.

### 4.8 Quando a API diz não

| Resposta | O que o app faz                                                 | Onde                                                        |
| -------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| 401      | termina a sessão, limpa os dados em cache e manda para o login  | [query-client.ts](../src/app/query-client.ts), `endSession` |
| 403      | mostra a mensagem do servidor, sem botão "Retry"                | [ErrorState.tsx](../src/components/ErrorState.tsx)          |
| 409      | "outra pessoa já decidiu": mostra a mensagem e atualiza a lista | [payouts/api.ts](../src/features/payouts/api.ts)            |

No 401, limpar o cache importa: a próxima pessoa naquele navegador não pode ver os dados da anterior.

### 4.9 Os testes

**Integração** (tela real, rede fingida):

| Ficheiro                                                             | Teste                                                                     |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [auth.test.tsx](../src/features/auth/auth.test.tsx)                  | "the menu only offers what the user may open"                             |
|                                                                      | "a 401 from any request ends the session and asks to sign in again"       |
|                                                                      | "an address that points outside the app is not followed after signing in" |
| [PayoutsPage.test.tsx](../src/features/payouts/PayoutsPage.test.tsx) | "given an approver, a payout created by someone else can be decided"      |
|                                                                      | "given a viewer, no decision or creation action is shown"                 |
|                                                                      | "given a maker, a payout can be created but not decided"                  |
|                                                                      | "the creator of a payout can't decide it, and is told why"                |
|                                                                      | "when the API answers 403, says so instead of breaking"                   |
| [NewPayout.test.tsx](../src/features/payouts/new/NewPayout.test.tsx) | "a viewer who types the URL gets a clear refusal, not the form"           |

**End-to-end**, em [e2e/permissions.spec.ts](../e2e/permissions.spec.ts), com uma sessão guardada por perfil:

| Teste                                                                      | O que prova                      |
| -------------------------------------------------------------------------- | -------------------------------- |
| "a viewer sees payouts but no way to create or decide them"                | a tela esconde as ações          |
| "a viewer who types the wizard's URL is refused by the route guard"        | a rota está protegida            |
| "the API refuses a viewer, whatever the UI shows"                          | a proteção real está no servidor |
| "an approver can't decide a payout they created"                           | a regra das duas pessoas         |
| "an anonymous visitor is sent to login, then back to the page they wanted" | o redirecionamento               |

O terceiro é o mais importante: chama a API diretamente, sem tela, e espera um 403.

---

## 5 · As 12 perguntas mais comuns

A entrevista é só de voz, por isso nenhuma resposta tem código nem cita este repositório. Os exemplos são de qualquer sistema de pagamentos.

Frases entre [colchetes] falam da sua experiência. Só use se forem verdade.

### 1 · A sua experiência

**"Tell me about your experience with role-based permissions."**

Este é um ponto forte seu: Keycloak e RBAC na TLScontact. Preencha os colchetes com os factos verdadeiros.

> "[At TLScontact, authentication and roles came from Keycloak. We had roles like … . In the frontend, I used them to … .] The way I build it: the permissions come from the backend with the user. One function answers 'can this user do this?', and I use it in the routes, the menu and the buttons. And the backend checks every request again."

Âncora: **my real case → permissions come from the backend → one function → routes, menu, buttons → the backend checks again.**

### 2 · Como implementa

**"How do you implement role-based permissions in the frontend?"**

> "The permissions come from the backend, with the user's session. In the frontend, one function answers one question: can this user do this action? I use it in three places: route guards, the menu, and the buttons. If a user can never do something, I hide it. If it is only blocked in this case, I disable it and say why. And the backend is the source of truth, so I always handle a 'forbidden' response."

Âncora: **from the backend → one function → guards, menu, buttons → hide or disable → always handle 'forbidden'.**

### 3 · Esconder um botão basta?

**"Is hiding a button enough to protect an action?"**

> "No. Hiding a button is user experience, not security. Anyone can call the API directly, without the screen. So the backend must check the permission on every request, and answer four-oh-three when the user is not allowed. The frontend check only avoids showing actions that would fail. I also like to have one test that calls the API directly, as a user without the permission, and expects the refusal."

Âncora: **user experience, not security → anyone can call the API → the backend checks every request → one test calls the API directly.**

### 4 · Permissões ou perfis

**"Why check permissions and not roles?"**

> "Because roles change, and the question doesn't. If the code asks 'is this user an admin?', every new role means changing many screens. If it asks 'can this user approve a payout?', a new role is only a new list of permissions on the backend, and the frontend doesn't change. It also reads better: the code says what the action needs, not who the person is."

Âncora: **roles change → 'is admin?' touches many screens → 'can approve?' stays the same → the code says what the action needs.**

### 5 · Esconder ou desativar

**"When do you hide an action, and when do you disable it?"**

> "If the user can never do it, I hide it: a viewer doesn't need to see an 'approve' button. If the user can do it in general, but not in this case, I disable it and say why, in visible text. For example, an approver can't approve a payout they created, so the button is disabled and the row says that another approver must decide. I don't use a tooltip for that, because a disabled button doesn't get focus."

Âncora: **never allowed → hide → allowed but not here → disable and say why → visible text, not a tooltip.**

### 6 · Proteger rotas

**"How do you protect routes?"**

> "With guards around the routes. One guard checks the session: if there is none, it sends the user to login and remembers the page they wanted. Another guard checks one permission, and protects a whole group of pages. If a user types the address without the permission, they see a clear message, not a broken page. But the guard is only user experience: the API checks again."

Âncora: **a guard for the session → remembers the page → a guard for one permission → a clear message → the API checks again.**

### 7 · Onde fica a sessão

**"Where do you keep the session in the browser?"**

> "I prefer a cookie set by the server, with the HttpOnly flag, so scripts can't read it. That protects the session if a bad script gets into the page. The frontend doesn't store a token: it only keeps the user, with the name and the permissions, in memory. On logout, I clear all the cached data, so the next person on that browser doesn't see it."

Âncora: **HttpOnly cookie → scripts can't read it → only the user in memory → clear the cache on logout.**

Se perguntarem "What if the app uses tokens, like with Keycloak?": "[At TLScontact, Keycloak's library handled the tokens: … .] In general, I keep the access token in memory, not in local storage, and I let the library refresh it."

### 8 · A sessão expira

**"What happens when the session expires in the middle of the work?"**

> "Any request can come back with a four-oh-one. I handle that in one place, not on every screen. The app marks the user as signed out, clears the cached data, and sends them to the login page. After they sign in, they go back to the page they were on. Clearing the cache matters: the next person on that browser must not see the previous user's data."

Âncora: **any request → one place → signed out, cache cleared, login → back to the same page.**

### 9 · A API diz "forbidden"

**"What do you do when the API answers 'forbidden'?"**

> "I show it as what it is: the user is not allowed. I show the server's message, and I don't offer a retry button, because the same request gives the same answer. It can happen even when the screen showed the button: the permissions were read at login, and they may have changed since then. So the screen must never break on a four-oh-three."

Âncora: **not allowed → the server's message → no retry → permissions may have changed → never break.**

### 10 · Um fluxo de aprovação

**"How would you build an approval flow, where one person creates a payout and another approves it?"**

> "The rule is that the person who creates a payout can't be the one who approves it, and the backend enforces it. In the frontend, the creator sees the payout as pending, with no way to approve it. The approver gets a confirmation step, with the amount, the fee and the recipient, and a rejection needs a reason. The status changes on screen only after the server confirms. And if two approvers decide at the same time, the second one sees a conflict message and the list refreshes."

Âncora: **creator can't approve → confirmation with amount, fee, recipient → rejection needs a reason → only after the server confirms → conflict refreshes the list.**

### 11 · Os testes

**"How do you test permissions?"**

> "At three levels. In integration tests, I render the same screen as each role and check what is shown: a viewer sees no 'approve' button, and an approver does. In end-to-end tests, I save one signed-in session for each role, and I check the critical cases, like typing a protected address directly. And one test calls the API directly, as a user without the permission, and expects a four-oh-three. That last one tests the real protection."

Âncora: **integration: same screen, each role → end-to-end: one session per role → one test calls the API directly.**

### 12 · Os tipos

**"How would you type role-based permissions in the frontend?"**

> "I type each permission as a resource plus an action, for example 'payout, approve'. With a template literal type, TypeScript builds every valid combination, so a typo in a permission name fails at compile time. The screens ask one function: can this user do this? It checks permissions, not role names, because roles change. And hiding a button is only user experience: the API must check the same permission again."

Âncora: **resource + action → template literal type → typo fails at compile time → one function checks permissions, not roles → the API checks again.**

É a mesma resposta da pergunta 18 de [TYPESCRIPT.md](TYPESCRIPT.md).

Se perguntarem "Where do the permissions come from?": "From the backend, with the user's session. The frontend doesn't decide them; it only reads them."

---

## Como dizer os termos em voz alta

- RBAC: "role-based permissions"
- 401 = "four-oh-one" · 403 = "four-oh-three" · 409 = "four-oh-nine"
- Maker-checker: "one person creates, and a second person approves"
- Route guard: "a guard around the routes"
- `HttpOnly`: "a cookie that scripts can't read"
- `can("payout:approve")`: "one function answers: can this user approve a payout?"
- Source of truth: "the backend is the source of truth"
