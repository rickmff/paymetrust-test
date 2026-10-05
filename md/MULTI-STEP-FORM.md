# Formulário multi-etapas: o que é, como usar, e as perguntas de entrevista

Guia de estudo para a entrevista da PayMeTrust. A vaga fala em "multi-step forms and approval flows" e em "Forms & Validation". Este tema junta três peças: o React Hook Form, o Zod e as rotas. As explicações estão em português. As perguntas e as respostas da parte 5 estão em inglês, prontas para dizer em voz alta.

- **Parte 1:** o que é um formulário multi-etapas.
- **Parte 2:** o vocabulário, em 13 palavras.
- **Parte 3:** como se usa.
- **Parte 4:** como foi usado neste repositório.
- **Parte 5:** as 13 perguntas mais comuns, com a resposta pronta.

Pronúncia: "draft" soa _dréft_. "Idempotency" soa _ai-dem-PÔU-ten-si_. "Recipient" soa _ri-SI-pi-ent_ e é quem recebe; "receipt" soa _ri-SIIT_ e é o recibo.

---

## 1 · O que é

Um formulário multi-etapas divide um formulário longo em telas pequenas. Cada tela pede um grupo de campos, e no fim há uma revisão antes de enviar.

**Porque se usa**

- Menos campos por tela, por isso menos erros.
- O usuário corrige um problema na etapa em que ele aparece, não no fim.
- Há uma revisão antes de uma ação que não se desfaz, como enviar dinheiro.

**Os cinco problemas que ele tem de resolver**

| O problema                                          | A solução                                                     |
| --------------------------------------------------- | ------------------------------------------------------------- |
| Onde ficam os dados entre uma etapa e a outra?      | num rascunho que vive acima das etapas                        |
| O usuário recarrega a página a meio                 | o rascunho é guardado no navegador, ou no servidor            |
| O usuário abre a última etapa pelo endereço         | um guard manda-o para a primeira etapa por fazer              |
| O servidor rejeita um campo no envio final          | volta-se à etapa dona do campo, com a mensagem no campo       |
| Duplo clique, ou nova tentativa depois de uma falha | botão desativado durante o envio, e uma chave de idempotência |

**Duas formas de o construir**

|                             | Um formulário só, com etapas        | Um formulário por etapa, cada uma numa rota |
| --------------------------- | ----------------------------------- | ------------------------------------------- |
| Onde vivem os dados         | num formulário único                | num rascunho acima das etapas               |
| Validar uma etapa           | validar à mão só os campos dela     | o envio da etapa valida o schema dela       |
| Endereço                    | o mesmo em todas as etapas          | um por etapa                                |
| Botão "voltar" do navegador | sai do formulário                   | volta à etapa anterior                      |
| Recarregar a página         | perde tudo, a não ser que se guarde | o rascunho continua lá                      |
| Bom para                    | fluxos curtos, dentro de um diálogo | fluxos longos, com revisão no fim           |

Este repositório usa a segunda forma.

**O React Hook Form**

É a biblioteca que guarda os valores, os erros e o estado de cada campo. Não re-renderiza o formulário inteiro a cada tecla, e liga-se ao Zod com um "resolver": o schema dá as regras, e ela mostra os erros.

---

## 2 · O vocabulário

| Termo               | O que é                                                     | Como dizer sem código                              |
| ------------------- | ----------------------------------------------------------- | -------------------------------------------------- |
| Step                | uma tela do formulário                                      | "a step"                                           |
| Multi-step form     | o formulário inteiro, etapa a etapa                         | "a multi-step form"                                |
| Draft               | o que já foi preenchido, guardado entre as etapas           | "the draft"                                        |
| Schema por etapa    | as regras só dos campos daquela tela                        | "each step has its own schema"                     |
| Resolver            | a ponte entre o Zod e o React Hook Form                     | "the Zod resolver"                                 |
| Controller          | a ponte para um componente que não é um input simples       | "a wrapper for a custom input"                     |
| `mode: "onTouched"` | validar quando o usuário sai do campo                       | "I validate when the user leaves the field"        |
| Layout route        | a rota-pai, que guarda o que é comum às etapas              | "a parent route that owns the draft"               |
| Guard               | o redirecionamento quando falta uma etapa anterior          | "the step sends the user back"                     |
| Review step         | a última tela, com tudo o que vai ser enviado               | "a review step"                                    |
| 422                 | o servidor rejeitou um ou mais campos                       | "four-two-two: a validation error from the server" |
| Idempotency key     | um identificador da tentativa, repetido em cada reenvio     | "an idempotency key"                               |
| Input e output      | o que o campo guarda (texto), e o que sai validado (número) | "what the user types, and what comes out"          |

---

## 3 · Como se usa

**Instalar**

```bash
npm install react-hook-form zod @hookform/resolvers
```

**A anatomia de uma etapa**

```tsx
const AmountStepSchema = z.object({
  amount: z.coerce.number().int().min(500, "The minimum is 500"),
});

function AmountStep() {
  const { draft, saveStep } = useWizard(); // 1. o rascunho vem de cima
  const navigate = useNavigate();

  const form = useForm({
    resolver: zodResolver(AmountStepSchema), // 2. as regras desta etapa
    mode: "onTouched", // 3. valida ao sair do campo
    defaultValues: { amount: String(draft.amount ?? "") }, // 4. voltar não perde nada
  });

  return (
    <form
      onSubmit={form.handleSubmit((values) => {
        saveStep(values); // 5. só chega aqui se a etapa for válida
        navigate("/payouts/new/review");
      })}
    >
      <input {...form.register("amount")} />
      <p role="alert">{form.formState.errors.amount?.message}</p>
      <button type="submit">Continue</button>
    </form>
  );
}
```

Atenção: `z.coerce.number` é a forma curta, boa para aprender. Ela converte com `Number()`, que também lê `1e3` como mil. Num campo de dinheiro, confira primeiro o texto: ver 4.3.

**O fluxo inteiro, em seis passos**

1. Um schema por etapa. O formulário completo é a junção deles.
2. Uma rota-pai guarda o rascunho.
3. Cada etapa tem o seu formulário, com os valores iniciais vindos do rascunho. O envio guarda a etapa e navega.
4. Cada etapa confere se as anteriores estão feitas. Se não, redireciona.
5. A revisão valida tudo de novo, mostra o valor, a taxa e o total, e envia com a chave de idempotência.
6. Se o servidor rejeitar um campo, o usuário volta à etapa dona desse campo.

**As peças do React Hook Form**

| Peça                   | Para que serve                                               |
| ---------------------- | ------------------------------------------------------------ |
| `useForm`              | cria o formulário: valores, erros, estado                    |
| `resolver`             | quem valida: o schema do Zod                                 |
| `defaultValues`        | os valores iniciais                                          |
| `mode`                 | quando validar: no envio, ao sair do campo, ou a cada tecla  |
| `handleSubmit`         | valida, e só chama a sua função com dados válidos            |
| `register`             | liga um input nativo                                         |
| `Controller`           | liga um componente controlado, como um select à medida       |
| `formState`            | os erros, e se está a enviar                                 |
| `setError` ou `errors` | pôr num campo um erro que veio do servidor                   |
| `trigger`              | validar alguns campos à mão, num formulário único com etapas |

**As cinco regras**

1. Um schema por etapa, e o formulário inteiro validado de novo no fim.
2. O rascunho vive acima das etapas e sobrevive a um recarregar da página.
3. Cada etapa confere se as anteriores estão feitas.
4. Um erro do servidor volta ao campo certo, na etapa certa.
5. Em dinheiro: revisão antes de enviar, botão desativado durante o envio, e chave de idempotência. Nunca guarde PIN, código de uso único ou token no rascunho.

---

## 4 · Como foi usado neste repositório

O formulário é o "New payout": três etapas para criar um pagamento a um destinatário.

### 4.1 Os ficheiros

| Ficheiro                                                                                        | Papel                                                   |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| [src/features/payouts/schemas.ts](../src/features/payouts/schemas.ts)                           | um schema por etapa, e o formulário completo            |
| [src/features/payouts/new/wizard.ts](../src/features/payouts/new/wizard.ts)                     | o rascunho, os guards e os erros do servidor            |
| [src/features/payouts/new/NewPayoutLayout.tsx](../src/features/payouts/new/NewPayoutLayout.tsx) | a rota-pai: dona do rascunho, com o indicador de etapas |
| [src/features/payouts/new/RecipientStep.tsx](../src/features/payouts/new/RecipientStep.tsx)     | etapa 1: operadora, nome e número                       |
| [src/features/payouts/new/AmountStep.tsx](../src/features/payouts/new/AmountStep.tsx)           | etapa 2: valor e referência                             |
| [src/features/payouts/new/ReviewStep.tsx](../src/features/payouts/new/ReviewStep.tsx)           | etapa 3: revisão e envio                                |
| [src/components/FormTextField.tsx](../src/components/FormTextField.tsx)                         | a ponte entre o React Hook Form e o HeroUI              |
| [src/features/payouts/api.ts](../src/features/payouts/api.ts)                                   | a cotação da taxa, e a mutation que cria o payout       |
| [src/app/router.tsx](../src/app/router.tsx)                                                     | as três rotas                                           |
| [api/handlers.go](../api/handlers.go)                                                           | a validação e a idempotência no servidor                |

### 4.2 As rotas

Em [router.tsx](../src/app/router.tsx), cada etapa tem o seu endereço:

| Endereço                 | Tela                              |
| ------------------------ | --------------------------------- |
| `/payouts/new`           | redireciona para a primeira etapa |
| `/payouts/new/recipient` | etapa 1                           |
| `/payouts/new/amount`    | etapa 2                           |
| `/payouts/new/review`    | etapa 3                           |

As três ficam dentro de `NewPayoutLayout`, e esta dentro de um guard que exige a permissão `payout:create`.

### 4.3 Os schemas

Em [payouts/schemas.ts](../src/features/payouts/schemas.ts):

- **`RecipientStepSchema`:** a operadora, o nome e o telefone. Inclui a regra entre dois campos: o número tem de ser da operadora escolhida.
- **`AmountStepSchema`:** o valor e a referência. O valor chega como texto e sai como número inteiro, entre o mínimo e o máximo. O texto é conferido antes de virar número: só dígitos, com ou sem espaços entre os milhares.
- **`PayoutFormSchema`:** a junção das duas, usada na revisão.
- **Os nomes dos campos são os do corpo do pedido à API.** Assim um erro do servidor volta ao campo certo sem tradução.

### 4.4 O rascunho

Em [wizard.ts](../src/features/payouts/new/wizard.ts):

- **`useDraft`** guarda o rascunho no state e no `sessionStorage`. Um recarregar da página não perde nada, e o rascunho desaparece quando o separador fecha.
- **O que é guardado é o resultado validado** de cada etapa: o valor já como número, o telefone já limpo.
- **O rascunho lido é validado com o Zod** (`DraftSchema`). Se estiver corrompido ou num formato antigo, começa-se um rascunho novo.
- **A chave de idempotência nasce com o rascunho**, não com o clique em "Create". É trocada por uma nova quando os valores do rascunho mudam: ver 4.10.

### 4.5 A rota-pai

Em [NewPayoutLayout.tsx](../src/features/payouts/new/NewPayoutLayout.tsx):

- Guarda o que tem de viver mais do que uma etapa: o rascunho e os erros do servidor.
- Entrega-os às etapas pelo contexto do `<Outlet>`. As etapas leem-nos com o hook `usePayoutWizard`.
- Mostra o indicador de etapas. A etapa atual tem `aria-current="step"`, para um leitor de tela a anunciar.
- O link "Cancel" apaga o rascunho.

### 4.6 Cada etapa

Em [RecipientStep.tsx](../src/features/payouts/new/RecipientStep.tsx) e [AmountStep.tsx](../src/features/payouts/new/AmountStep.tsx):

- **Um `useForm` próprio**, com o schema da etapa no resolver.
- **`mode: "onTouched"`:** valida quando o usuário sai do campo, não a cada tecla.
- **Os valores iniciais vêm do rascunho.** Voltar a uma etapa mostra o que já foi preenchido.
- **O envio guarda a etapa e navega** para a seguinte. Só acontece se a etapa for válida.
- **O select da operadora usa `Controller`,** porque não é um input de texto.
- **O telefone mostra o indicativo fixo** e os dígitos em pares. O formulário guarda o número completo.

### 4.7 Os guards

- **Etapa 2:** se a etapa 1 não estiver completa, redireciona para ela.
- **Etapa 3:** valida o rascunho inteiro com `PayoutFormSchema`. Se falhar, redireciona para a primeira etapa por fazer (`firstIncompleteStep`).

A revisão nunca mostra meio pagamento.

### 4.8 A revisão e o envio

Em [ReviewStep.tsx](../src/features/payouts/new/ReviewStep.tsx):

- **O valor digitado vira dinheiro num lugar só,** com `toMinorUnits`.
- **A taxa vem do servidor.** É uma regra de negócio, por isso a tela só a mostra.
- **O botão "Create payout" fica desativado até a taxa aparecer.** Ninguém confirma um total que não vê.
- **Durante o envio o botão fica em espera,** por isso um duplo clique envia um pedido só.
- **Depois de criado,** o rascunho é apagado e o usuário vai para a lista, com o aviso "was sent for approval".

### 4.9 O erro do servidor

O frontend aceita um número com o formato certo. Só o servidor sabe se a carteira de mobile money existe. Quando ele rejeita um campo, responde 422 com a lista dos campos e das mensagens.

1. `fromServer`, em [wizard.ts](../src/features/payouts/new/wizard.ts), transforma essa lista em erros do React Hook Form.
2. `STEP_OF_FIELD` diz qual etapa é dona de cada campo. O compilador obriga a que cada campo do formulário tenha uma etapa.
3. A revisão guarda os erros na rota-pai e navega para essa etapa.
4. O `useForm` da etapa recebe-os na opção `errors`, e a mensagem aparece no campo.
5. Tudo o que o usuário escreveu continua lá. Quando ele envia a etapa de novo, os erros do servidor são limpos.

### 4.10 A chave de idempotência

| Onde                                               | O que faz                                                                                    |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [wizard.ts](../src/features/payouts/new/wizard.ts) | cria a chave quando o rascunho nasce, e troca-a quando os valores mudam                      |
| [payouts/api.ts](../src/features/payouts/api.ts)   | envia-a no cabeçalho `Idempotency-Key`                                                       |
| [api/handlers.go](../api/handlers.go)              | a mesma chave com o mesmo pedido devolve o mesmo payout; com um pedido diferente, é recusada |
| [query-client.ts](../src/app/query-client.ts)      | uma mutation nunca é repetida sozinha                                                        |

A chave representa um payout tal como o usuário o reviu:

- **Os valores não mudaram:** um duplo clique, um recarregar da página e uma nova tentativa depois de uma falha de rede enviam todos a mesma chave. O servidor cria o payout uma vez só.
- **Os valores mudaram:** outro valor ou outro destinatário é outro payout, e recebe uma chave nova. Com a chave antiga, o servidor podia responder com o primeiro payout, e o usuário veria "criado" para valores que já tinha alterado.
- **Ir e voltar entre as etapas sem alterar nada** mantém a chave.

### 4.11 A ponte com o HeroUI

[FormTextField.tsx](../src/components/FormTextField.tsx) é escrito uma vez e usado em todos os formulários:

- O React Hook Form é dono do valor e dos erros.
- O HeroUI é dono da marcação: liga o rótulo, a ajuda e o erro ao input, para os leitores de tela.
- O `name` só aceita campos de texto daquele formulário. Um erro de digitação não compila.
- Depois de um envio falhado, o foco vai para o primeiro campo inválido.

### 4.12 Quando o rascunho é apagado

| Momento             | Onde                                                                   |
| ------------------- | ---------------------------------------------------------------------- |
| O payout foi criado | [ReviewStep.tsx](../src/features/payouts/new/ReviewStep.tsx)           |
| O usuário cancelou  | [NewPayoutLayout.tsx](../src/features/payouts/new/NewPayoutLayout.tsx) |
| A sessão terminou   | `endSession`, em [auth/api.ts](../src/features/auth/api.ts)            |

### 4.13 O que ficou de fora

- **Não há aviso ao sair a meio.** O passo seguinte natural é o `useBlocker` do React Router.
- **O link "Back" não guarda o que está a ser escrito** na etapa atual. Só o "Continue" guarda.
- **O rascunho vive só naquele navegador.** Para continuar noutro dia ou noutro aparelho, seria guardado no servidor.

### 4.14 Os testes

Em [NewPayout.test.tsx](../src/features/payouts/new/NewPayout.test.tsx), com a tela real e a rede fingida:

| Teste                                                                                           | O que prova                                   |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------- |
| "rejects a zero amount without calling the API"                                                 | a validação da etapa                          |
| "creates a payout: review shows the fee, the API gets an integer amount and an idempotency key" | o caminho feliz, e o que a API recebeu        |
| "puts a 422 from the server on the field that caused it, on the step that owns it"              | o erro do servidor no campo e na etapa certos |
| "a retry after a network failure reuses the same idempotency key"                               | uma nova tentativa não cria um segundo payout |
| "a payout changed after a failed attempt is sent under a new idempotency key"                   | valores diferentes, chave nova                |
| "going back and forth without changing anything keeps the idempotency key"                      | navegar entre as etapas não troca a chave     |
| "opening the review URL directly sends the user to the first unfinished step"                   | o guard                                       |
| "keeps a finished step when the page is reloaded"                                               | o rascunho guardado                           |
| "a viewer who types the URL gets a clear refusal, not the form"                                 | a permissão                                   |

No end-to-end, [e2e/payouts.spec.ts](../e2e/payouts.spec.ts) tem dois testes deste tema, contra o servidor real:

- "the server's own validation reaches the right field of the form".
- "an idempotency key answers a retry with the same payout, and refuses another one".

---

## 5 · As 13 perguntas mais comuns

A entrevista é só de voz, por isso nenhuma resposta tem código nem cita este repositório. Os exemplos são de qualquer sistema de pagamentos.

Frases entre [colchetes] falam da sua experiência. Só use se forem verdade.

### 1 · A sua experiência

**"Tell me about a multi-step form you built."**

Preencha os colchetes com os factos verdadeiros da TLScontact.

> "[At TLScontact I worked on the visa application forms: long forms, split into steps, with … .] The way I build it: each step has its own validation rules, so the user fixes problems early. The data is kept in a draft above the steps, so going back or refreshing loses nothing. At the end there is a review step, and the whole form is validated again before it is sent."

Âncora: **my real case → rules per step → a draft above the steps → review → validate everything again.**

### 2 · A estrutura

**"How do you structure a multi-step form?"**

> "I give each step its own page and its own small form. A parent route keeps the draft: the answers from the steps that are done. Each step has its own validation rules, and at the end I validate the whole form again. Because each step has its own address, the browser's back button works, and a refresh keeps the data."

Âncora: **a page and a form per step → a parent keeps the draft → rules per step → validate all at the end → back button and refresh work.**

### 3 · Os dados entre etapas

**"Where do you keep the data between steps?"**

> "In a draft that lives above the steps, so it survives when a step leaves the screen. I also save it in session storage, so a refresh doesn't lose it, and it disappears when the tab closes. For a long form, or one that the user finishes on another day or another device, I would save the draft on the server. And I never put secrets in a draft: no PIN, no one-time code."

Âncora: **a draft above the steps → session storage for a refresh → the server for long forms → no secrets.**

### 4 · Validar cada etapa

**"How do you validate each step?"**

> "Each step has its own schema and validates only its fields. I validate a field when the user leaves it, not on every key, so they don't see an error while they are still typing. The 'continue' button validates the whole step. And at the end, I validate the whole form again before I send it, because the draft may be incomplete."

Âncora: **a schema per step → when the user leaves the field → 'continue' validates the step → the whole form again at the end.**

### 5 · Abrir a última etapa diretamente

**"What happens if the user opens the last step directly, or refreshes the page?"**

> "A refresh is fine, because the draft is saved. For a direct link, each step checks that the steps before it are complete. If something is missing, it sends the user to the first step that is not done. So the review step can never show half of a payment."

Âncora: **refresh: the draft is saved → each step checks the ones before → back to the first step not done → never half a payment.**

### 6 · O servidor rejeita um campo

**"The server rejects a field at the final submit. What does the user see?"**

> "The server answers with a validation error and says which fields are wrong. The field names in my form are the same as in the API, so I can match each error to a field. Each field belongs to a step, so I take the user back to that step and show the server's message on the field. Everything else they typed is still there. A typical case: only the server knows that a mobile money wallet doesn't exist."

Âncora: **the server names the fields → same names as the API → back to the step that owns the field → the rest is still there.**

### 7 · Não pagar duas vezes

**"How do you prevent a double payment when the user double-clicks, or the network fails?"**

> "Three layers. The button is disabled while the request is running. The app never retries a payment request by itself. And the request carries an idempotency key: an id that is created with the draft, not with the click. So a double click, a refresh or a manual retry all send the same key, and the server creates the payment only once."

Âncora: **button disabled → no automatic retry → idempotency key created with the draft → the server creates it once.**

Se perguntarem "What if the user changes the amount after a failed attempt?": "Then it is a different payment, so it gets a new key. The key stands for one payment, as the user reviewed it. And the server refuses the same key with different data."

### 8 · Um campo que não é um input

**"How do you handle a field that is not a simple input, like a custom select?"**

> "React Hook Form works best with native inputs, which it reads directly. A select from a component library is a controlled component: it needs a value and a change handler. So I wrap it with the library's controller, which connects the two. I do that once, in a shared form field component, so every form gets the label, the help text and the error message wired the same way, also for screen readers."

Âncora: **native inputs are read directly → a custom select is controlled → the controller connects them → once, in a shared component.**

### 9 · Porquê React Hook Form

**"Why use React Hook Form instead of keeping the form in state?"**

> "With plain state, every key press renders the whole form again, and I write the errors, the touched state and the submit logic by hand. React Hook Form keeps the values outside React state, so typing stays fast in a big form. It gives me the errors and the submitting state. And with the Zod resolver, one schema gives me the validation and the types."

Âncora: **plain state renders everything → values outside React state → errors and submitting state → one schema: validation + types.**

### 10 · Acessibilidade

**"How do you make a form like this accessible?"**

> "Every field has a visible label, and the error message is linked to the field, so a screen reader reads it. After a failed submit, the focus goes to the first invalid field. The step list marks the current step, so the user knows where they are. An error is text, not only a red border. And the buttons say what they do: 'Create payout', not 'OK'."

Âncora: **labels and linked errors → focus on the first invalid field → current step marked → text, not only color → clear button names.**

### 11 · A revisão

**"What does the review step show before a payment is sent?"**

> "Everything the user needs to confirm before money moves: the recipient, the operator, the number, the amount, the fee and the total. The fee comes from the server, because it is a business rule. And the 'create' button stays disabled until the fee is on screen: nobody should confirm a total they can't see."

Âncora: **recipient, operator, number → amount, fee, total → the fee comes from the server → disabled until the fee is visible.**

### 12 · Sair a meio

**"What do you do when the user leaves in the middle of the form?"**

> "It depends on the flow. For a short one, I keep the draft for the session, so coming back continues where they stopped. I clear it on success, on cancel and on logout. If losing the data would hurt, I warn before they leave the page. And for a long flow, I save the draft on the server."

Âncora: **keep the draft for the session → clear on success, cancel, logout → warn before leaving → long flows: on the server.**

### 13 · Os testes

**"How do you test a multi-step form?"**

> "Mostly with integration tests: I render the real form, mock only the network, and go through it like a user. I test the happy path, and I check what the API received: a whole number for the amount, and the idempotency key. Then the cases around it: an invalid value doesn't call the API, a server error lands on the right field and step, and a refresh keeps the draft. And one end-to-end test covers the full journey against the real backend."

Âncora: **integration: real form, mocked network → what the API received → invalid value, server error, refresh → one end-to-end journey.**

---

## Como dizer os termos em voz alta

- `zodResolver`: "the Zod resolver"
- `mode: "onTouched"`: "I validate when the user leaves the field"
- `Controller`: "the library's controller, for a custom input"
- `defaultValues`: "the starting values come from the draft"
- `sessionStorage`: "session storage"
- 422 = "four-two-two"
- Idempotency key: "an id for the attempt, sent again on every retry"
- Multi-step form: diga "multi-step forms", não "form steps"
