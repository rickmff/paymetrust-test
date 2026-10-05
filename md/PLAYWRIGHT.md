# Playwright: o que é, como usar, e as perguntas de entrevista

Guia de estudo para a entrevista 2 da PayMeTrust. As explicações estão em português. As perguntas e as respostas da parte 5 estão em inglês, prontas para dizer em voz alta.

- **Parte 1:** o que é o Playwright.
- **Parte 2:** o vocabulário, em 12 palavras.
- **Parte 3:** como se usa.
- **Parte 4:** como foi usado neste repositório.
- **Parte 5:** as 13 perguntas mais comuns, com a resposta pronta.

Pronúncia: "Playwright" soa _PLEI-rait_.

---

## 1 · O que é

O Playwright é uma ferramenta da Microsoft para testes end-to-end. É um programa que abre um navegador de verdade e usa o seu app como um usuário: clica, digita, navega e confere o que aparece na tela.

**A diferença para os testes de integração**

|                  | Integração (Vitest + Testing Library) | End-to-end (Playwright)             |
| ---------------- | ------------------------------------- | ----------------------------------- |
| Onde roda        | navegador simulado, em memória        | navegador de verdade                |
| Backend          | fingido                               | de verdade                          |
| O que testa      | uma tela                              | o sistema inteiro, de ponta a ponta |
| Velocidade       | milissegundos                         | segundos                            |
| Quantos escrever | muitos                                | poucos, só os fluxos críticos       |

**O que ele tem de especial**

- **Três motores de navegador:** Chromium (Chrome e Edge), Firefox e WebKit (Safari).
- **Espera sozinho:** antes de clicar, espera o elemento estar visível e ativo. Não se escreve "espera 2 segundos".
- **Várias pessoas no mesmo teste:** cada "contexto" é uma sessão isolada, como uma janela anónima. Um teste pode ter um usuário que cria e outro que aprova.
- **Paralelo de fábrica:** roda vários testes ao mesmo tempo.
- **Trace:** grava cada passo do teste, com a tela, a rede e o console, para ver depois por que falhou.
- **Também chama a API direto**, sem tela, para preparar dados.
- **Codegen:** grava os seus cliques e escreve o teste inicial.

---

## 2 · O vocabulário

| Termo                  | O que é                                                            | Como dizer sem código                     |
| ---------------------- | ------------------------------------------------------------------ | ----------------------------------------- |
| Browser, context, page | o navegador, uma sessão isolada dentro dele, e uma aba             | "a separate browser session"              |
| Locator                | a forma de encontrar um elemento na tela                           | "I find it by role and name"              |
| Action                 | o que o teste faz: `click`, `fill`                                 | "the test clicks and types"               |
| Assertion              | a conferência: `expect(...)`                                       | "the test checks that…"                   |
| Web-first assertion    | conferência que repete até passar ou o tempo acabar                | "an assertion that retries"               |
| Auto-waiting           | a espera automática antes de cada ação                             | "Playwright waits by itself"              |
| Fixture                | uma preparação pronta entregue ao teste, como uma página já logada | "a ready setup for the test"              |
| Project                | uma configuração de execução: um navegador, ou o passo de login    | "one run configuration"                   |
| `storageState`         | a sessão (cookies) guardada num ficheiro                           | "a saved session"                         |
| `page.route`           | interceptar um pedido de rede e responder no lugar do servidor     | "I mock the request at the network level" |
| `page.clock`           | controlar o relógio da página                                      | "I move the page's clock forward"         |
| Trace                  | a gravação de um teste                                             | "a recording of every step"               |

---

## 3 · Como se usa

**Instalar**

```bash
npm init playwright@latest        # cria a configuração e um teste de exemplo
npx playwright install chromium   # baixa o navegador
```

**A anatomia de um teste**

```ts
import { expect, test } from "@playwright/test";

test("a user signs in and sees the dashboard", async ({ page }) => {
  // 1. Ir até a página
  await page.goto("/login");

  // 2. Agir como usuário
  await page.getByLabel("Email").fill("ana@example.com");
  await page.getByLabel("Password").fill("secret");
  await page.getByRole("button", { name: "Sign in" }).click();

  // 3. Conferir o que aparece. Esta linha repete até passar ou o tempo acabar.
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});
```

Todo teste tem estas três partes: preparar, agir, conferir.

**Os comandos do dia a dia**

| Comando                                 | Para que serve                                           |
| --------------------------------------- | -------------------------------------------------------- |
| `npx playwright test`                   | roda todos os testes                                     |
| `npx playwright test --ui`              | abre a interface com linha do tempo, para ver cada passo |
| `npx playwright test --debug`           | roda passo a passo, com o inspector                      |
| `npx playwright codegen localhost:5173` | grava os seus cliques e escreve o teste                  |
| `npx playwright show-report`            | abre o relatório do último run                           |
| `npx playwright show-trace <ficheiro>`  | abre a gravação de um teste que falhou                   |

**As cinco regras**

1. Encontre os elementos pelo papel e pelo nome visível (`getByRole`, `getByLabel`). Seletor de CSS, nunca.
2. Nunca espere um tempo fixo. As conferências já repetem sozinhas.
3. Cada teste cria os seus dados e não depende de outro.
4. Poucos testes, só os fluxos que não podem quebrar.
5. O que é difícil de produzir com o backend real (um erro 500) finge-se na rede, só naquele teste.

---

## 4 · Como foi usado neste repositório

Aqui o Playwright aparece em dois lugares: os testes end-to-end do app, e os testes de componentes no Storybook.

### 4.1 Os ficheiros

| Ficheiro                                                   | Papel                                                               |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| [playwright.config.ts](playwright.config.ts)               | a configuração dos testes end-to-end                                |
| [e2e/auth.setup.ts](e2e/auth.setup.ts)                     | faz o login uma vez por perfil e guarda a sessão                    |
| [e2e/fixtures.ts](e2e/fixtures.ts)                         | as preparações prontas: página logada, API logada, referência única |
| [e2e/pages/PayoutsPage.ts](e2e/pages/PayoutsPage.ts)       | o page object das telas de payout                                   |
| [e2e/payouts.spec.ts](e2e/payouts.spec.ts)                 | o fluxo de criar e aprovar payouts                                  |
| [e2e/permissions.spec.ts](e2e/permissions.spec.ts)         | o que cada perfil pode ver e fazer                                  |
| [e2e/transactions.spec.ts](e2e/transactions.spec.ts)       | filtros, paginação, erro e status assíncrono                        |
| [playwright.visual.config.ts](playwright.visual.config.ts) | a segunda configuração, para componentes no Storybook               |
| [.github/workflows/ci.yml](.github/workflows/ci.yml)       | o pipeline que roda tudo em cada pull request                       |

### 4.2 A configuração

Em [playwright.config.ts](playwright.config.ts):

- **`webServer`** (linhas 36–51): o Playwright sobe o sistema inteiro antes de testar, a API em Go e o frontend, e espera as duas URLs responderem. No CI testa o build de produção; na sua máquina, o servidor de desenvolvimento.
- **`projects`** (linhas 23–33): primeiro roda o projeto `setup`, que faz o login. Depois roda o `chromium`, que depende dele.
- **`fullyParallel`** (linha 8): os testes rodam em paralelo, porque cada um cria os seus dados.
- **`retries`** (linha 12): uma repetição, só no CI.
- **`trace: "on-first-retry"`** (linha 19): grava o trace quando um teste é repetido. É barato e chega para investigar.
- **`forbidOnly`** (linha 10): se alguém esquecer um `test.only`, o pipeline falha em vez de pular os outros testes.

### 4.3 O login, uma vez por perfil

Em [e2e/auth.setup.ts](e2e/auth.setup.ts), para cada perfil (viewer, maker, approver):

1. Abre a tela de login e entra pela interface.
2. Confere que o menu principal apareceu.
3. Guarda a sessão num ficheiro, com `storageState`.

Os testes começam já logados e nunca repetem o login. E como o setup entra pela tela, ele também prova que o login funciona.

### 4.4 As fixtures

Em [e2e/fixtures.ts](e2e/fixtures.ts):

- **`pageAs("approver")`**: devolve uma página já logada como esse perfil. Cada chamada cria um contexto novo, ou seja, uma pessoa diferente. É isto que permite ter o maker e o approver no mesmo teste.
- **`apiAs("maker")`**: devolve a API já logada, para criar dados sem passar pelas telas.
- **`uniqueReference()`**: gera uma referência única por teste, para os testes não colidirem e rodarem em qualquer ordem.

No fim de cada teste, a fixture fecha os contextos que abriu, passe ou falhe.

### 4.5 O page object

[e2e/pages/PayoutsPage.ts](e2e/pages/PayoutsPage.ts) guarda como se usa a tela de payouts: `goto`, `create`, `approve`, `reject` e `row`. Se um rótulo mudar, muda-se este ficheiro e os testes ficam iguais.

Ele só tem ações e locators. As conferências ficam nos testes, para cada teste continuar a ler-se como o requisito.

### 4.6 Os testes

**[e2e/payouts.spec.ts](e2e/payouts.spec.ts)**: navegador real, API real, nada fingido.

| Teste                                                   | O que prova                                                        | Técnica                                                             |
| ------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Um payout criado pelo maker é aprovado por outra pessoa | o fluxo de aprovação de ponta a ponta                              | dois usuários em duas sessões no mesmo teste                        |
| O approver rejeita e o motivo fica registado            | a rejeição e o motivo na lista                                     | o payout é criado pela API, porque o teste não é sobre o formulário |
| A validação do servidor chega ao campo certo            | um erro que só o servidor conhece volta ao passo e ao campo certos | formulário real contra o servidor real                              |

**[e2e/permissions.spec.ts](e2e/permissions.spec.ts)**

| Teste                                                            | O que prova                      | Técnica                                    |
| ---------------------------------------------------------------- | -------------------------------- | ------------------------------------------ |
| O viewer vê os payouts, sem botões de criar ou decidir           | a tela esconde as ações          | conferir que o botão não existe            |
| O viewer que digita a URL do formulário é recusado               | a rota está protegida            | ir direto à URL                            |
| A API recusa o viewer, mostre a tela o que mostrar               | a proteção real está no servidor | teste só de API, sem tela, à espera de 403 |
| O approver não pode decidir um payout que ele criou              | a regra das duas pessoas         | botão desativado e o motivo na tela        |
| Um visitante sem sessão vai ao login e volta à página que queria | o redirecionamento               | página sem sessão guardada                 |

**[e2e/transactions.spec.ts](e2e/transactions.spec.ts)**

| Teste                                                       | O que prova            | Técnica                                                                     |
| ----------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------- |
| Os filtros ficam na URL e sobrevivem a um reload            | a URL é o estado       | conferências que repetem, sem esperas fixas                                 |
| "Load more" traz mais linhas, sem duplicados                | a paginação por cursor | contar os ids e conferir que são únicos                                     |
| Erro da API aparece, e recupera no retry                    | o estado de erro       | `page.route` finge um 500 na rede                                           |
| Um pagamento pendente vira pago quando a operadora confirma | o status assíncrono    | uma rota de teste faz o papel da operadora, e `page.clock` avança o relógio |

O último é o mais importante para pagamentos: o teste não espera 30 segundos de verdade. Ele avança o relógio da página até à próxima consulta.

### 4.7 A segunda configuração: componentes no Storybook

[playwright.visual.config.ts](playwright.visual.config.ts) roda o Playwright contra o Storybook: um componente sozinho, num navegador real, sem API e sem login. Os testes estão em [visual-tests/](visual-tests/).

- **Dois tipos de teste:** screenshots (como o componente aparece) e interação (foco, cursor, posição), que são coisas que um navegador simulado não consegue conferir.
- **Três navegadores:** Chromium, WebKit e Firefox.
- **As imagens de referência** ficam em `visual-tests/__screenshots__`, com o navegador e o sistema no nome, porque o texto não é desenhado igual em todo o lado.
- **No CI** uma imagem de referência em falta é uma falha, nunca um ficheiro novo criado em silêncio.

### 4.8 O CI

[.github/workflows/ci.yml](.github/workflows/ci.yml) tem três jobs em cada pull request:

1. **`checks`:** tipos, lint, formatação, e os testes unitários e de integração. É o retorno rápido.
2. **`components`:** os testes de componentes no Storybook, em três navegadores. Só os de comportamento, porque as imagens de referência foram tiradas em macOS e o CI roda em Linux.
3. **`e2e`:** o navegador real contra o build de produção e a API em Go.

Os jobs do Playwright guardam o relatório e os traces como artefactos, mesmo quando os testes falham, porque é aí que eles servem.

### 4.9 Os comandos deste repositório

```bash
npm run e2e          # roda os end-to-end (sobe a API e o frontend sozinho)
npm run e2e:ui       # o mesmo, na interface com linha do tempo
npm run visual       # os testes de componentes no Storybook
npm run visual:update   # atualiza as imagens de referência
```

O `npm run e2e` precisa do Go instalado, porque sobe a API. Nesta máquina estão instalados o Go 1.27 e o Playwright 1.63.

---

## 5 · As 13 perguntas mais comuns

A entrevista é só de voz, por isso nenhuma resposta tem código nem cita este repositório. Os exemplos são de qualquer sistema de pagamentos.

Frases entre [colchetes] falam da sua experiência. Só use se forem verdade.

### 1 · A sua experiência

**"What's your experience with Playwright or end-to-end tests?"**

Escolha a variante verdadeira.

Se já usou no trabalho:

> "[I've used Playwright at … to test …. I wrote tests for the critical flows, like … .]"

Se ainda não usou em produção:

> "I haven't used Playwright in production yet. [In production I've written unit and integration tests with Jest.] I've been practicing with Playwright: signing in once per role, creating test data through the API, mocking the network for error states, and controlling the clock for polling. So I know how I would set it up in a real project."

Um "ainda não" honesto, seguido do que você sabe fazer, vale mais do que um "sim" vago que cai na pergunta seguinte.

### 2 · Porquê Playwright

**"Why Playwright and not Cypress?"**

> "Three reasons. It runs the three browser engines, including Safari's, so I can test what the users really have. It runs tests in parallel out of the box, which keeps the suite fast. And it can drive more than one user in the same test, each in a separate browser session: for example, one person creates a payout and another one approves it. I also like the trace viewer for debugging failures in CI."

Âncora: **three engines → parallel → several users in one test → trace viewer.**

Se perguntarem "Is Cypress bad?": "No. It has a very good developer experience. For an app with roles and approval flows, Playwright fits better."

### 3 · Testes estáveis

**"How do you keep end-to-end tests stable?"**

> "Three things. First, I find elements the way a user does: by role and by visible name, not by CSS selectors, so a style change doesn't break the test. Second, I never wait a fixed time: the assertions retry until the screen is right or the time runs out. Third, each test creates its own data, with a unique reference, so tests don't depend on each other and can run in any order."

Âncora: **find by role and name → no fixed waits, assertions retry → each test owns its data.**

### 4 · A espera

**"How does Playwright deal with waiting?"**

> "It waits by itself. Before a click, it waits until the element is visible and enabled. And the assertions retry: if I expect a row to say 'Approved', Playwright keeps checking until it is true or the timeout ends. So I don't write sleeps. A fixed wait is either too short, and the test fails sometimes, or too long, and the suite gets slow."

Âncora: **waits before each action → assertions retry → no sleeps → too short fails, too long is slow.**

### 5 · O login

**"How do you handle login in end-to-end tests?"**

> "I sign in once, in a setup step that runs before the tests, and I save the session to a file. The tests start already signed in, so they don't repeat the login screen every time. For permissions, I save one session for each role, like viewer and approver. And one test can open two sessions, as two different people. I keep one test that goes through the real login screen, so that flow is still covered."

Âncora: **sign in once → saved session → one session per role → two people in one test → one real login test.**

### 6 · Backend real ou fingido

**"Do your end-to-end tests use the real backend or mocks?"**

> "Both, for different goals. The critical journeys run against the real backend, because that is the only way to catch a contract problem between the frontend and the API. States that are hard to produce, like a server error, I mock at the network level, only in that test. And the payment operator is always simulated: a test must never move real money."

Âncora: **critical journeys = real backend → hard states = mocked at the network → the operator is always simulated.**

### 7 · Os dados de teste

**"Where does the test data come from?"**

> "Each test creates what it needs. When the creation is not what I'm testing, I create the data through the API, not through the screens, because it is faster. And I use a unique reference in each test, so tests can run in parallel and in any order. A test never depends on data left by another test."

Âncora: **each test creates its data → through the API → unique reference → no dependence between tests.**

### 8 · O pagamento pendente

**"A mobile money payment can stay pending for a while. How would you test that?"**

> "I don't wait in real time. First, the test creates a pending payment and opens its page. Then it plays the operator: it calls a test endpoint that confirms the payment, the way the operator's callback would. The page checks the status every few seconds, so the test moves the page's clock forward instead of waiting. And then it checks that the status changed to paid."

Âncora: **no real waiting → create a pending payment → play the operator → move the clock forward → status is paid.**

### 9 · CI e falhas

**"How do the tests run in CI, and what do you do when one fails there?"**

> "They run on every pull request, in parallel. The pipeline starts the API and the built app, and then runs the tests against them. When a test fails, CI keeps a trace: a recording of every step, with the screen, the network calls and the console. I open it and see what happened, without reproducing it on my machine. I allow one retry in CI, but a test that needs it goes on the fix list."

Âncora: **every pull request, in parallel → starts API and app → trace on failure → one retry, then fix.**

### 10 · A organização

**"How do you organize end-to-end tests so they don't repeat the same steps?"**

> "Two tools. A page object holds how to use a screen: the steps to create a payout, for example. If a label changes, I fix it in one place. And fixtures hold the setup, like a page that is already signed in as an approver. I keep the checks in the tests, not inside the page objects, so each test still reads like the requirement."

Âncora: **page object = how to use a screen → fixtures = the setup → checks stay in the tests.**

### 11 · O que cobrir

**"What do you cover with end-to-end tests, and what do you leave out?"**

> "Only the journeys that must never break: sign in, create a payout, approve it, and see the right status. End-to-end tests are slow and expensive to maintain, so I keep them few. Validation rules, error states and edge cases go to integration tests, which are faster. If I can prove something at a lower level, I do it there."

Âncora: **journeys that must never break → few, because slow and expensive → rules and edge cases go lower.**

### 12 · A velocidade

**"How do you keep the suite fast?"**

> "I run the tests in parallel, and that only works because each test owns its data. I sign in once and reuse the session. I prepare data through the API instead of clicking through the screens. I never use fixed waits. And when the suite grows, I split it across several machines in CI."

Âncora: **parallel → sign in once → data through the API → no fixed waits → split across machines.**

### 13 · O visual

**"Do you test how the screens look?"**

> "A little, and only where it pays off: shared components and a few key screens. The test takes a screenshot and compares it with a saved one. The difficulty is that fonts are drawn differently on each system, so the screenshots must be taken in the same environment as CI, and dynamic content like dates has to be hidden. Otherwise the tests fail for no real reason."

Âncora: **only where it pays off → compare with a saved screenshot → same environment as CI → hide dynamic content.**

---

## Como dizer os termos em voz alta

- `getByRole`: "I find it by role and name"
- `storageState`: "a saved session"
- `page.route`: "I mock the request at the network level"
- `page.clock`: "I move the page's clock forward"
- Web-first assertion: "an assertion that retries"
- Sharding: "splitting the suite across several machines"
- Trace: "a recording of every step"
