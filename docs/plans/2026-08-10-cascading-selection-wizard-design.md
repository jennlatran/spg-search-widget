# Cascading Selection Wizard — Design

## Problem

The widget currently treats "select a Service Operation" as the only technician
input (plus Labor Type/Labor Hours). In reality, a chosen Operation resolves
through up to three more MOTOR-driven levels before it's a complete line item:

```
Operation  (e.g. Door Handle R&R)          — already selectable today
  → Application (Exterior Door Handle, Door Handle Gasket)
    → Position (Front Right Door, Front Left Door, Rear Right Door, Rear Left Door)
      → Qualifier (Black paint (US), Black paint (Japan), Red paint (US), …)
```

Each level's options depend on the prior selection and, in the real integration,
can't be fetched until that prior selection is made (MOTOR serves them on
demand, not as a preloadable tree). Depth varies per operation — some have all
three sub-levels, some fewer, some none (straight to Labor).

## Scope decisions (from brainstorming)

- Single-select at every level (Operation, Application, Position, Qualifier) —
  no fan-out/cartesian product of multiple picks.
- One resolved operation per widget session — no multi-op cart. Finishing the
  wizard's Labor step both resolves the item and commits (`onConfirm`), same
  as today's single confirm action.
- UI shape: a step wizard, not inline expand-in-place.
  - Popover/Inline: the wizard replaces the tree view entirely while a
    session is active; Cancel/back-from-first-step returns to the tree.
  - Modal: the wizard replaces the existing right panel; the left tree stays
    mounted and interactive.
- A level with 0 options is skipped (straight to the next level, or straight
  to Labor if it's the last one). A level with exactly 1 option auto-selects
  and advances.
- Back navigation is allowed: re-visits a prior step without refetching
  (options already in wizard state); picking a different option there clears
  every field after it and re-triggers the fetch for the next level.
- Data fetch is simulated as a real async boundary (`setTimeout` + Promise,
  with a loading state and a Retry-able error path) rather than instant mock
  data, so swapping in the real MOTOR call later is a small change.

## Technical approach

Explicit sequential wizard state (`_s.wizard`), one render method per step
type — matches the existing code's style of named state + dedicated render
methods (`_rightPanelHTML`, `_compactPricingHTML`), rather than a generic
N-level cascade engine (unnecessary — the four step *types* are fixed) or a
separate wizard sub-class (bigger structural change than needed in this
single-file widget).

## Data model

`CATEGORIES[].operations[]` gains an optional `applications` array. Absent/
empty means the operation goes straight to the Labor step.

```js
{
  id: 'op-drhandle', name: 'Door Handle R&R', group: 'Body Panels', opcode: 'BODY-DRHANDLE',
  applications: [
    {
      id: 'app-ext', name: 'Exterior Door Handle',
      positions: [
        {
          id: 'pos-fr', name: 'Front Right Door',
          qualifiers: [
            { id: 'q-blk-us', name: 'Black paint (US)' },
            { id: 'q-blk-jp', name: 'Black paint (Japan)' },
            { id: 'q-red-us', name: 'Red paint (US)' },
            // ...
          ],
        },
        { id: 'pos-fl', name: 'Front Left Door', qualifiers: [/* ... */] },
        { id: 'pos-rr', name: 'Rear Right Door', qualifiers: [/* ... */] },
        { id: 'pos-rl', name: 'Rear Left Door', qualifiers: [/* ... */] },
      ],
    },
    { id: 'app-gasket', name: 'Door Handle Gasket', positions: [/* ... */] },
  ],
  laborHours: 0.5, laborTypeId: 'standard', parts: [{ id:'p4', name:'Door Handle', price:34.99, qty:1 }],
}
```

Wizard state, alive only while resolving the currently-selected operation:

```js
this._s.wizard = {
  opId: null,
  step: null,          // 'application' | 'position' | 'qualifier' | 'labor'
  loading: false,
  error: null,
  applications: [], application: null,
  positions: [],     position:    null,
  qualifiers: [],    qualifier:   null,
  laborTypeId: null, laborHours: null,
};
```

`calcPricing` and the existing `overrides` mechanism are unchanged — they
still operate on the resolved `op` once the wizard finishes. The wizard is
purely the resolution UI in front of that.

## Flow & rendering

Selecting an Operation radio calls `_startWizard(op)`:

1. Set `wizard.opId`, `wizard.step = 'application'`, `wizard.loading = true`.
2. Fetch `op.applications` via the simulated async helper (see below).
   - Empty/undefined → skip straight to `step = 'labor'`.
   - Exactly one → auto-select it, advance immediately to `'position'`.
   - Multiple → render the choice list.
3. Same skip/auto-advance/render pattern repeats for Position and Qualifier.
4. Labor step reuses the existing Labor Type/Labor Hours fields verbatim,
   plus a running total and the "Apply" button.

Render methods: `_wizardApplicationHTML`, `_wizardPositionHTML`,
`_wizardQualifierHTML`, `_wizardLaborHTML`, sharing a common shell:
breadcrumb of prior choices, a Back button, the option list (or
loading/error state), and Cancel (clears the wizard, returns to the tree).

Per mode:
- **Popover/Inline**: `_buildCompact()`'s body swaps from the tree to the
  wizard shell while `wizard.opId` is set (tree unmounted, not just hidden).
- **Modal**: `_rightPanelHTML` is replaced by the wizard shell for the
  focused op; the left tree stays visible.

## Async simulation & error handling

```js
function fetchLevel(data, delay = 400) {
  return new Promise((resolve, reject) => {
    setTimeout(() => data ? resolve(data) : reject(new Error('No data returned')), delay);
  });
}
```

Every step transition sets `wizard.loading = true`, awaits `fetchLevel(...)`,
then stores the result and flips `loading = false`. The active step's render
method shows a spinner row while loading. `.catch` sets `wizard.error`,
rendered as an inline message with a Retry button that re-runs the same
fetch — a real (if simple) failure path at the one genuine async boundary in
this feature, not fabricated random failures.

## Completion

The Labor step's Apply button both resolves the full chain and immediately
fires `onConfirm`/closes the widget — one action, since there's nothing else
to add in a one-operation-per-session model. The confirmed payload gains the
resolved chain:

```js
{
  operationId, operationName, opcode,
  applicationId, applicationName,
  positionId, positionName,
  qualifierId, qualifierName,
  laborTypeId, laborHours, laborRate, laborCost,
  parts, partsCost, totalPrice,
}
```

Any field without a resolved value (skipped level) is simply absent/null.

## Mock data plan

- **Door Handle R&R**: full 4-level cascade, matching the example exactly —
  2 Applications × 4 Positions × ~6 Qualifiers.
- 2–3 other operations get partial depth (e.g. Applications + Positions but
  no Qualifiers; Applications only) to exercise the skip logic.
- Remaining operations keep today's shape (no `applications` — straight to
  Labor), so both paths are covered.

## Testing plan

Via the Playwright driver already used against `index.html`:
- Full cascade happy path: Operation → Application → Position → Qualifier →
  Labor → Apply → verify payload shape.
- Zero-application operation: skips straight to Labor.
- Single-option auto-advance at some step.
- Back navigation: change an earlier choice, verify downstream fields clear
  and re-resolve.
- Cancel mid-wizard: returns cleanly to the tree.

## Out of scope

- `multiSelect: true` (checkbox) mode — the wizard is only triggered by the
  single-select radio flow described above; multi-select behavior is
  unchanged.
- Real MOTOR API integration — `fetchLevel` stays a mock async boundary
  until that's wired up separately.
