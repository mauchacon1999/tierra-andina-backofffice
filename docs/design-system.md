# Design system — Tierra Andina

How every screen looks and behaves, so the app feels like one product. Follow it for every new
screen and component; if something is missing here, add it here first.

- Tokens: `apps/web/src/app/globals.css`
- Primitives: `apps/web/src/components/ui/` — `Button`, `ButtonLink` (a link that looks like a
  button), `TextField`, `SelectField`, `SelectMenu` (styled dropdown), `ComboboxField` (search a long list by name), `SegmentedControl` (few exclusive options, real radios),
  `Checkbox`, `Alert`, `Card` (tones), `Badge`, `Spinner`, `ConfirmButton` (two-step action),
  `Dialog` (native modal / drawer), `IconButton` (icon only, label required), `Tooltip`
- Icons: `lucide-react`, `size-5` (`size-6` in the top bar), always `aria-hidden`
- Guard: `apps/web/src/design-system.test.ts` fails if a component uses a raw palette color
- Texts: every label, hint, button and message comes from `apps/web/src/i18n/messages/es-VE.json`
  (next-intl, CLAUDE.md §10 "Text and i18n"); `src/i18n/no-hardcoded-text.test.ts` fails on
  text written in a component. The wording rules below apply to the messages file.

---

## 1. Principles

1. **Phone first, one hand.** The owner buys at the market and the manager closes the day on a
   phone. Design at 375 px wide first; larger screens only get more room.
2. **Fast over fancy.** Few taps, big targets (≥ 44 px), the main action always visible.
3. **Say what happened and what to do.** Every error explains how to fix it, in plain Spanish.
4. **Same thing, same look.** A primary action, an error or a status always looks the same.
5. **Accessible by default.** WCAG AA contrast, visible focus, labels on every field.

---

## 2. Colors

Only **standard Tailwind palette colors** are used. Primary is green (**emerald**), neutrals are
**zinc**, red / amber / sky are reserved for feedback, and violet marks a selected period filter.

### 2.1 Palettes

| Role          | Tailwind palette | Main shades used                                                         |
| ------------- | ---------------- | ------------------------------------------------------------------------ |
| Primary/brand | `emerald`        | 50 `#ecfdf5`, 500 `#10b981`, 700 `#047857`, 800 `#065f46`, 900 `#064e3b` |
| Neutral       | `zinc`           | 50 `#fafafa` … 950 `#09090b`                                             |
| Danger        | `red`            | 50 `#fef2f2`, 500 `#ef4444`, 700 `#b91c1c`, 800 `#991b1b`                |
| Warning       | `amber`          | 50 `#fffbeb`, 500 `#f59e0b`, 800 `#92400e`                               |
| Info          | `sky`            | 50 `#f0f9ff`, 500 `#0ea5e9`, 800 `#075985`                               |
| Filter        | `violet`         | 50 `#f5f3ff`, 300 `#c4b5fd`, 500 `#8b5cf6`, 800 `#5b21b6`, 950 `#2e1065` |

Success uses the brand green: in this app "done/ok" and "brand" are the same color.

### 2.2 Semantic tokens (use these, never the palette directly)

| Utility                                                           | Light                 | Dark                   | Use for                              |
| ----------------------------------------------------------------- | --------------------- | ---------------------- | ------------------------------------ |
| `bg-background` / `text-foreground`                               | zinc-50 / zinc-900    | zinc-950 / zinc-100    | Page                                 |
| `bg-surface`                                                      | white                 | zinc-900               | Cards, inputs                        |
| `bg-surface-muted`                                                | zinc-100              | zinc-800               | Hover of neutral elements, disabled  |
| `text-muted`                                                      | zinc-600              | zinc-400               | Secondary text, hints, timestamps    |
| `border-border`                                                   | zinc-200              | zinc-700               | Card borders, dividers               |
| `border-border-strong`                                            | zinc-300              | zinc-600               | Input and secondary-button borders   |
| `bg-primary` / `text-primary-foreground`                          | emerald-700 / white   | emerald-700 / white    | Primary buttons                      |
| `hover:bg-primary-hover` / `active:bg-primary-active`             | emerald-800 / 900     | same                   | Primary button states                |
| `text-primary-text`                                               | emerald-800           | emerald-400            | Titles, links, success text          |
| `bg-primary-soft`                                                 | emerald-50            | emerald-950            | Success backgrounds, ghost hover     |
| `ring-focus`                                                      | emerald-500           | emerald-500            | Focus ring                           |
| `bg-danger` / `hover:bg-danger-hover`                             | red-700 / red-800     | same                   | Destructive buttons                  |
| `text-danger-text`                                                | red-700               | red-400                | Error messages                       |
| `bg-danger-soft` / `border-danger-border`                         | red-50 / red-500      | red-950 / red-500      | Error boxes, invalid inputs          |
| `bg-warning-soft` / `text-warning-text` / `border-warning-border` | amber-50 / 800 / 500  | amber-950 / 400 / 500  | Warnings                             |
| `bg-info-soft` / `text-info-text` / `border-info-border`          | sky-50 / 800 / 500    | sky-950 / 400 / 500    | Information                          |
| `border-success-border`                                           | emerald-500           | emerald-500            | Success boxes, "ok" dots             |
| `bg-chip-soft` / `text-chip-text` / `border-chip-border`          | violet-50 / 800 / 500 | violet-950 / 300 / 500 | Period filter chips and their totals |

### 2.3 Rules

- **Never write palette classes** (`bg-emerald-700`, `text-zinc-600`, `dark:…`) in components.
  Use tokens; dark mode is handled by the tokens (`prefers-color-scheme`). The design-system
  test enforces this.
- **Never use color alone** to carry meaning: always pair it with text ("Operativo",
  "Sin respuesta") or an icon with a label.
- New color need? Add a token to `globals.css` and to the table above, mapped to a standard
  Tailwind shade, and check its contrast.
- The primary button stays `emerald-700` in dark mode too: white on `emerald-600` is 3.77:1 and
  fails WCAG AA.

### 2.4 Contrast (verified, WCAG AA needs ≥ 4.5:1)

| Pair                         | Light | Dark  |
| ---------------------------- | ----- | ----- |
| Text on background           | 16.97 | 18.10 |
| Muted text on surface        | 7.73  | 6.91  |
| White on primary button      | 5.48  | 5.48  |
| White on danger button       | 6.47  | 6.47  |
| Primary text on surface      | 7.68  | 9.22  |
| Danger text on danger-soft   | 5.91  | 5.84  |
| Warning text on warning-soft | 6.84  | 8.97  |
| Info text on info-soft       | 7.09  | 6.48  |
| Chip text on chip-soft       | 8.19  | 8.25  |

---

## 3. Layout, type and shape

### 3.1 Backoffice shell

Every signed-in screen is rendered inside `AppShell` (`features/navigation`):

- **Desktop (`md` and up):** sidebar on the left — the isotype with the app name, menu, and at
  the bottom the user, store, role and "Salir". It collapses to a 64 px column of icons (button
  at the top, choice remembered per device); collapsed, the brand is only the isotype and every
  entry keeps its name as accessible name and tooltip. The current section is
  `bg-primary-soft text-primary-text` with `aria-current="page"`.
- **Loading:** while the session or a role check is still resolving, `LoadingOverlay` covers the
  page (`fixed inset-0`) with the isotype and "Cargando…". A list waiting for its own data keeps
  a line of status text; it does not cover the shell. The mark is `public/brand/isotype.png`
  (the same picture is `app/icon.png` for the browser tab).
- **Phones:** sticky top bar with ☰, the isotype and the app name; ☰ opens the same menu as a drawer
  (`Dialog variant="drawer"`), which closes on Esc, on the backdrop and on navigation.
- **Content:** `main` is `max-w-6xl` centered, `px-4 py-6` (`md:px-8 md:py-8`). Pages do not add
  their own container: they start with the page title (`h1`) and blocks.
- The menu shows only the sections the active role can open (the API enforces it anyway).
- An entry can carry a live counter (`counter` in `nav-items.ts`, e.g. closes to review): a
  warning-tone pill with the number when expanded, a dot on the icon when collapsed; the
  accessible name says it in words ("Cierres, 2 por revisar").

### 3.2 Type and shape

| Element         | Rule                                                                               |
| --------------- | ---------------------------------------------------------------------------------- |
| Page content    | Inside the shell's `main`; narrow forms may cap themselves (`max-w-2xl`)           |
| Vertical rhythm | `space-y-4` inside a block, `space-y-6` between blocks                             |
| Page title      | `h1`: `text-3xl font-bold tracking-tight text-primary-text`, subtitle `text-muted` |
| Section title   | `h2`: `text-lg font-semibold`                                                      |
| Body / small    | `text-base` (inputs always ≥ 16 px: iOS zooms smaller inputs) / `text-sm`          |
| Font            | System font stack (`--font-sans`); no web fonts, nothing to download at the market |
| Radius          | Buttons and inputs `rounded-lg`; cards `rounded-2xl`; badges/dots `rounded-full`   |
| Elevation       | Cards `shadow-sm` + `border-border`; nothing heavier                               |
| Touch targets   | ≥ 44 px tall (`min-h-11`) for anything tappable                                    |
| Grids           | One column on phones; `sm:grid-cols-2` for side-by-side cards                      |

Use `<Card>` for any boxed content: `tone` = `default` | `muted` | `success` | `warning` | `info` |
`danger` picks its colors. Use `cn()` (`utils/cn.ts`) for conditional classes.

**Never override a primitive's colors through `className`** (e.g. `<Card className="bg-danger-soft">`).
`cn()` only joins strings, so two `bg-*` or `border-*` colors would compete and the winner depends
on CSS order (this already broke the status cards once). Use the primitive's `tone`/`variant`
prop, or add a new one. `className` is for layout only (width, margin, flex, grid).

### 3.3 Lists of records (DataTable)

Every list of records (products, trips, purchases, rates…) uses `DataTable`
(`components/shared/data-table/`, TanStack Table v9). Do not hand-write `<table>`s or card lists.

- **Desktop:** a real `<table>` with sortable headers (arrow icon, `aria-sort`), numbers
  right-aligned (`tabular-nums`), and a "⋯" button per row with its actions.
- **Phones:** one `Card` per row — the `isPrimary` column as title, the rest as label/value
  pairs (`hideInCard` drops one), same "⋯" menu.
- **Sorting:** `mode: "client"` when every row is loaded (a trip's purchases, rate history);
  `mode: "server"` for paginated lists (the API sorts: `?sort=-name`) — never sort only the
  visible page. Decimal columns use `sortAs: "decimal"` (exact, no floats).
- **Row actions** (`RowAction`): "Editar" (`href` or a dialog), activate/deactivate, delete.
  Destructive ones have `tone: "danger"` and `confirm` → `ConfirmDialog` ("¿Eliminar Tomate?").
  Rows that cannot be changed simply have no actions.
- **States:** loading (`Cargando…`), empty (`empty`: message + the action that fills it) and
  error (Alert with "Reintentar") are built in; pagination below the list.
- Editing a row opens its form in a `Dialog`; the list stays where it was.

---

## 4. Buttons and actions

`<Button variant size isLoading loadingText>` from `components/ui/button.tsx`.

| Variant     | Looks like                | Use for                                                           |
| ----------- | ------------------------- | ----------------------------------------------------------------- |
| `primary`   | Solid green, white text   | The **one** main action of a screen or form ("Guardar", "Entrar") |
| `secondary` | White with border         | Other actions ("Cancelar", "Salir", "Reintentar")                 |
| `danger`    | Solid red                 | Destructive or irreversible actions ("Eliminar", "Anular cierre") |
| `ghost`     | Green text, no background | Low-emphasis actions inside content ("Ver detalle", "Editar")     |

Sizes: `md` (default, 44 px) everywhere; `sm` (36 px) only for secondary actions inside cards
or toolbars; `lg` (48 px) for one-tap actions used standing up with one hand (truck receipt:
"Recibido / Incompleto / No llegó", the chosen one `primary` with `aria-pressed`).

Rules:

- **One `primary` per screen or form.** If two actions compete, one of them is `secondary`.
- **Labels are verbs in Spanish**, specific when possible: "Guardar compra", "Publicar lista",
  not "OK" / "Aceptar" / "Enviar".
- **Loading:** pass `isLoading` and a gerund `loadingText` ("Guardando…", "Publicando…"). The
  button disables itself and is announced as busy; never let users submit twice. A form's
  `isSubmitting` is `mutation.isRunning || form.formState.isSubmitting`: the SWR mutation alone
  turns false as soon as the API answers, while the form still refreshes data or navigates.
  `ConfirmButton` stays busy on its own until its `onConfirm` promise settles.
- **Do not disable a submit button because the form is invalid**: let them press it and show
  the errors (users must learn what is missing).
- **Destructive actions** use `danger` and ask for confirmation with what will happen
  ("¿Anular el cierre del 12/10? Esta acción no se puede deshacer"). Use `ConfirmButton`: the
  first tap shows the question with "Cancelar" and the confirm button in place (no modal).
  Irreversible but not destructive actions ("Cerrar jornada") use it with `variant="primary"`.
- **Placement:** on phones the main form button is full width (`w-full`) at the end of the
  form. On wider screens, actions are right-aligned, primary last; "Cancelar" before it.
- Icon-only buttons need `aria-label` (Spanish) and still a 44 px target.

---

## 5. Forms, inputs and validation

`<TextField label hint error suffix required>` from `components/ui/text-field.tsx`, wired with
React Hook Form: `<TextField label="Nombre" error={errors.name?.message} {...register("name")} />`.
A field inside a table row (the price on "Precio manual") keeps its label for screen readers
only with `hideLabel`; the label still names the row ("Precio de Tomate en bolívares").

Structure:

- **Every field has a visible label** above it. Placeholders are only examples, never labels.
- **Required fields** pass `required` (shows `*`). If most fields are optional, mark the
  optional ones in the label instead ("Teléfono (opcional)").
- **Hints** explain format or unit ("En la unidad de venta"); the error replaces the hint.
- **Units go in `suffix`** ("kg", "und", "$", "Bs"), not inside the label.
- Order fields as the user thinks about them (at the market: product → stall → quantity → price).
- One column on phones; never put two text inputs side by side under `sm`.
- Forms use `noValidate` (no browser bubbles) and `<form onSubmit>` so Enter submits.

Input types:

| Data                | Props                                                                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email               | `type="email" inputMode="email" autoComplete="email"`                                                                                                                         |
| Password            | `type="password" autoComplete="current-password"`                                                                                                                             |
| Money, kg, rates, % | `type="text" inputMode="decimal"` — **never `type="number"`** (it uses floats and the device locale); values stay strings and are validated with `amountSchema`-style schemas |
| Phone               | `type="tel" inputMode="tel" autoComplete="tel"`                                                                                                                               |
| Search              | `type="search"`, large, at the top of the screen                                                                                                                              |
| Long catalog        | `ComboboxField`: type the name (accents ignored) and tap the row. Native `SelectField` stays for short fixed lists (currency, unit)                                           |
| Styled choice       | `SelectMenu`: a button that opens a list (Downshift, already in the app). `appearance="avatar"` shows only the person's initial in a circle until it is pressed               |

Validation:

- **Schemas come from `@ta/validators`** with `zodResolver`; the same schema validates in the
  API. Never duplicate rules in the component.
- **Timing:** validate on submit, then re-validate each field as the user corrects it (React
  Hook Form defaults: `mode: "onSubmit"`, `reValidateMode: "onChange"`). Do not show errors
  while the user is still typing for the first time.
- On submit with errors, focus goes to the first invalid field (React Hook Form does this).
- **Field error messages:** short, Spanish, say how to fix it, no blame and no codes:
  "Escribe tu correo", "La merma debe ser menor que el peso bruto", "Máximo 4 decimales".
- Server errors that belong to a field (e.g. `PRODUCT_NAME_TAKEN`) are set on that field with
  `form.setError("name", …)`; the rest go to the form-level `Alert` (§6).

---

## 6. Feedback: errors, warnings, success, loading

| Situation                                     | Pattern                                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| A field is invalid                            | Inline error under the field (`TextField error`), red border                                     |
| The server rejected the form / network error  | `<Alert tone="error">` at the **top** of the form, API message                                   |
| A screen could not load its data              | `<Alert tone="error">` + `Button variant="secondary"` "Reintentar"                               |
| Something needs attention but is not an error | `<Alert tone="warning">` ("La tasa BCV cambió. Revisa los precios")                              |
| Neutral information                           | `<Alert tone="info">`                                                                            |
| An action succeeded                           | Navigate to the result, or `<Alert tone="success">` near the action                              |
| Waiting for data                              | "Cargando…" text with `role="status"` (spinner optional)                                         |
| Waiting for an action                         | `Button isLoading loadingText="…"`                                                               |
| Nothing to show                               | Empty state: one sentence + the action that fills it ("Aún no hay productos" + "Crear producto") |

Error messages:

- Show the API `message` (already in Spanish). Never show `code`, stack traces or HTTP status
  to users; the technical status panel is the only exception.
- If a request id is available, it may be shown small and muted for support.
- `Alert tone="error"` uses `role="alert"` (read immediately); other tones use `role="status"`.

**Why no tooltips for errors:** phones have no hover, so a tooltip error is invisible where the
app is used most, and it disappears when the user needs it. Errors are always visible inline
text. Tooltips may only add optional information on desktop, never be the only place where
something is said.

**Toasts:** not available yet. When a transient confirmation is needed ("Lista publicada"), add
a `components/ui/toast.tsx` with `role="status"`, auto-dismiss after 5 s, and never use it for
errors that need an action.

---

## 7. Status badges

A status is a dot + a label (never color alone). Mapping for the app's states:

| Meaning           | Tokens                                       | Examples                               |
| ----------------- | -------------------------------------------- | -------------------------------------- |
| Pending / neutral | `bg-muted` dot, `text-muted`                 | `pending` receipt, draft price list    |
| Done / ok         | `bg-success-border` dot, `text-primary-text` | `received`, published, API operativo   |
| Needs attention   | `warning` tokens                             | `partial` receipt, open supplier claim |
| Failed / missing  | `danger` tokens                              | `missing` receipt, API sin respuesta   |

---

## 8. Money, numbers and dates on screen

- Amounts travel as strings and are formatted for display only (never `parseFloat`):
  `Intl.NumberFormat("es-VE", …).format(stringValue)` accepts the decimal string directly.
- USD with 2 decimals, Bs with 2 decimals, quantities up to 3 (`22 kg`, `0,909 kg` only when
  meaningful). Always show the currency/unit: "1,40 $", "294,00 Bs", "22 kg".
- When both currencies matter, USD first and Bs below in `text-muted`.
- Percents: `formatPercentFromFraction("0.5")` → "50 %". Never Intl `style: "percent"`: engines
  differ on the space before the sign.
- Helpers: `utils/format-number.ts` (`formatUsd`, `formatBs`, `formatQuantity`, `formatDecimal`,
  `formatPercentFromFraction`).
- Rates show their kind: "Tasa BCV 200,00", "Tasa de venta 210,00".
- Dates: `dd/mm/aaaa` (`es-VE`); business days are dates without time; times as "7:49 a. m.".
- Date helpers go in `apps/web/src/utils/format-date.ts` when the first screen needs them.

---

## 9. Copy (Spanish, Venezuela)

- Address the user as **tú**: "Inicia sesión", "Escribe tu correo".
- Use the business words of the glossary (CLAUDE.md §5): cesta, cuenta, rollito, merma, fiado,
  abono, cierre, tasa BCV.
- Sentence case, no ALL CAPS, no exclamation marks in errors.
- Buttons are verbs; titles are nouns ("Productos", "Cierre del día").

---

## 10. Accessibility checklist

- [ ] Contrast from the token table (do not invent colors).
- [ ] Every input has a `<label>`; errors linked with `aria-describedby` and `aria-invalid`
      (`TextField` does it).
- [ ] Focus is visible (`ring-focus`) and follows a logical order; nothing traps focus.
- [ ] Targets ≥ 44 px; inputs ≥ 16 px text.
- [ ] Status and errors are text, not only color; live regions (`role="alert"/"status"`) for
      async messages.
- [ ] `lang="es"` on the document (already set in the layout).

---

## 11. Building a new screen — checklist

1. Page under `app/(app)/` (shell from §3.1), title from §3.2; content in `Card`s. New
   section? Add its menu entry in `features/navigation/helpers/nav-items.ts`.
2. One primary action; the rest secondary/ghost (§4).
3. Form fields with `TextField`, schema from `@ta/validators`, timing from §5.
4. Server errors in an `Alert` at the top; loading and empty states (§6).
5. Statuses as badges (§7); amounts formatted per §8; copy per §9.
6. Only token classes (the design-system test must pass); check it at 375 px and in dark mode.
7. Missing primitive? Create it in `components/ui/` with tests, document it here.
