# Session: PayMeTrust Frontend Interview Prep

**Updated:** 2026-10-02
**Candidate:** Henrique Faria (rickmff). Senior Frontend Developer, 8+ years, full-stack, runs his own SaaS products on a self-hosted VPS.
**Status:** First interview done. Second interview scheduled, focused on TypeScript proficiency, React integration testing, functional testing and E2E testing (Playwright).

## Target company and role

- **PayMeTrust:** fintech aggregator for digital payments in West Africa. HQ in Abidjan (Côte d'Ivoire). Connects merchants to mobile money operators. Says it operates in 8 countries and aims for 10. French-speaking market.
- **Platform:** being rebuilt with Go microservices and React/TypeScript.
- **Role:** Frontend Developer for merchant and internal-operator apps. The work covers dashboards, data tables, detail pages, multi-step forms, approval flows, RBAC, shared components, component and E2E tests, and API contracts with the Go team.
- **Stack in the job post:** React, TypeScript, REST, React Router, Vite, Tailwind CSS, HeroUI, Git, data fetching and caching, forms and validation, Playwright, Go.
- **Research:** no public interview reviews found (Glassdoor, Indeed, forums). The recruiter's topic list is the best signal.

## Coaching rules agreed

- Critical, short, decisive feedback.
- One question at a time, topic by topic.
- Mock questions in English. Explanations and feedback in Portuguese.
- Feedback format: **Score** /10 · **Length** (short / ok / long, with word count) · **Strong** (1 point) · **Fix** (max 2) · **Line to use**.
- Length targets:
  - Pitch: 150–220 words (75–90 s).
  - Interview 1 technical answers: 45–60 s.
  - Interview 2 answers: 30–45 s.
- Never invent experience. Anything in [brackets] in the docs must be confirmed or replaced with real facts.

## Profile analysis

**Strengths to push (under-used on the CV)**

- **Keycloak + RBAC at TLScontact:** maps directly to the "Permissions" topic.
- **Government visa services at TLScontact:** likely long, multi-step forms (to confirm).
- **Finneaty:** personal finance dashboard (work in progress), the closest project to the product.
- **Full-stack with own SaaS on own VPS:** credible on API contracts with the Go team.
- **Track record:**
  - Vue → Next.js migration at TLScontact.
  - Next.js project lead at Try.
  - 95% Jest coverage, WCAG work, Lighthouse 100.
- **Basic French.**

**Risks the interviewer may probe**

- **React depth:** 8 years of Vue vs 5 of React, and the last job was mostly Vue 3 / PrimeVue.
- **Warren:** the only fintech job lasted 4 months, and the "compliant with financial regulations" bullet is vague.
- **Left TLScontact in June 2026:** expect "why, and what have you done since?".
- **Title:** "Front-end Developer & UX/UI Designer" dilutes the profile. Present as a Frontend Engineer.
- **Stack gaps on the CV:** Playwright/E2E, React Router, Vite, Tailwind, TanStack Query, React Hook Form/Zod, TanStack Table.
- **95% coverage claim:** can backfire. Say "coverage was a side effect; critical flows are what matter".

**Three stories to tell**

1. TLScontact: Keycloak RBAC and application forms.
2. TLScontact: Vue → Next.js migration (why, how risk was reduced, what was measured).
3. Finneaty, with Warren as context: money display, dashboards, budgets, locale formatting.

## Artifacts

| Artifact | Contents |
|---|---|
| [Doc 1 · Roteiro de Entrevista (Frontend)](https://claude.ai/artifact/Y643AmdtWCqhGDDScD8Pvw) | How to use, Q1–Q10 model answers in English with anchors, risk questions, questions to ask |
| [Doc 2 · Entrevista 2: TypeScript e Testes](https://claude.ai/artifact/LmaUCh5D9oQF4rnCP5ds66) | 3-day plan, TypeScript T1–T11, integration I1–I9, functional F1–F4, Playwright P1–P9, 5 live-coding exercises, questions to ask |

## Topics explained in chat (not all are in the docs)

**Discriminated unions**
- Model transaction status as a union with a `never` exhaustive check, so a new status breaks the build until every screen handles it.
- Simpler fallback line: "On TypeScript, I use strict mode and type every API response, so most mistakes are caught at compile time, not in production."

**React Hook Form + Zod**
- Core pieces:
  - `zodResolver` and `z.infer`.
  - `Controller` for HeroUI controlled inputs.
  - `mode: 'onTouched'`.
  - `trigger()` per step.
  - `refine` / `superRefine` for cross-field rules.
  - `useFieldArray`.
  - `setError` for 422 and `root` errors.
  - `safeParse` on API responses.
- Pitfalls:
  - Number inputs return strings (use `valueAsNumber` or `z.coerce`).
  - The backend must validate again.
  - `z.input` vs `z.output`.

**Multi-step flow across pages**
- A layout route owns the draft: Zustand `persist` in `sessionStorage`, or server drafts for long or shared flows.
- Each step page has its own `useForm`, with `defaultValues` from the draft.
- Route guards send the user back if a previous step is missing.
- The final step runs `fullSchema.safeParse` and submits with an idempotency key.
- A 422 sends the user back to the step that owns the field.
- Clear the draft on success, cancel and logout. Use `useBlocker` to warn on leaving mid-flow.
- Never store PIN, OTP or tokens.

**Cursor vs offset pagination**
- Offset duplicates or skips rows when transactions arrive or change status.
- A cursor encodes the `(created_at, id)` of the last item seen.
- Trade-off: no jumping to page N, and totals need a separate count.

**TanStack Query cache**
- In-memory `QueryCache` inside the `QueryClient`, keyed by a hash of the query key.
- Lifecycle: fresh → stale (stale-while-revalidate) → inactive → garbage-collected.
- v5 defaults: `staleTime` 0, `gcTime` 5 min, queries retry 3×, mutations 0×.
- Also covered: deduplication, structural sharing, hierarchical keys with `invalidateQueries`, `setQueryData`, `prefetchQuery`.
- Avoid persisting transactions.

**Simpler Q5 answer (caching)**
"I use TanStack Query to fetch data and cache it. How long I cache depends on how often the data changes. A list of operators rarely changes, so I keep it for a long time. A payment status can change any second, so I keep it only for a few seconds. When the user changes something, like approving a refund, I refresh the related data. And if a payment request fails, I never retry it automatically, because that could charge someone twice."

**Tool briefs**
- Pros and cons of React Hook Form, Zod, TanStack Query, TanStack Table, MSW and Playwright.

**Payments domain**
- Amounts as integer minor units, never floats. XOF has 0 decimals. Format with `Intl.NumberFormat`.
- Mobile money status is asynchronous: poll with backoff.
- Idempotency keys, and no optimistic updates on money.
- Show amount / fee / net.
- Operators: Orange Money, MTN MoMo, Wave, Moov.

**Pronunciation**
- "cache" sounds like *cash*; "queries" like *kwee-reez*.

## Open items

- [ ] Confirm or replace every [bracket] in Doc 1:
  - TLScontact visa-flow details and user roles.
  - Playwright usage.
  - Real reasons for leaving TLScontact and Warren.
- [ ] Decide whether to swap the Q2 TypeScript line for the simpler version.
- [ ] Rehearse the Q1 pitch aloud (it was never answered in a mock).
- [ ] Interview 2 plan:
  - Day 1: TypeScript, exercises 1–2.
  - Day 2: Vitest + Testing Library + MSW, 3 tests.
  - Day 3: Playwright (`init`, `codegen`, `getByRole`, `show-trace`).
- [ ] Portfolio rickmff.com: About and Work render empty without JS, and the meta description is the placeholder "This is Rickmff Portfolio.". Fix with SSR/SSG and a real description. hudrest.com has the same issue.
- [ ] GitHub: only 3 of ~30 visible repos have descriptions. Pin 3 relevant repos with READMEs (screenshot, stack, 3 decisions).
- [ ] CV fixes:
  - "Created responsive and cross-browser compatible" is incomplete.
  - "ScrumTry" is merged.
  - "multiples sectors ecommerces" is ungrammatical.
  - "Graphic Test" is ambiguous.
- [ ] Optional: paste the LinkedIn headline and About for review (LinkedIn blocks automated access).

## Next session

Run a mock of interview 2 from Doc 2, one question at a time: TypeScript → integration → functional → Playwright. Use the feedback format above. Include one code-reading question (exercise 5) and one live-coding prompt.
