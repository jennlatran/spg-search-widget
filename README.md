# SPG Search Widget

Embeddable JavaScript widget for searching and pricing Service Operations in the SPG (Service Pricing Guide). Supports vehicle-specific labor and parts pricing with three presentation modes from a single file.

---

## Modes

| Mode | Best for | How it opens |
|------|----------|--------------|
| `popover` | Attaching to an existing search input or button | Floats below/above the trigger on click or focus |
| `modal` | Full pricing review before committing | Centered dialog triggered by any element |
| `inline` | Sidebars, drawers, dedicated panels | Renders directly into a container div |

---

## Quick Start

Include the script and call one of the two entry points.

```html
<script src="src/spg-widget.js"></script>
```

### Popover — attach to an existing input

The most common integration pattern. No markup changes required beyond adding an `id` to an existing element.

```js
SPGWidget.attach('#service-search', {
  vehicleContext: { year: 2022, make: 'Toyota', model: 'Camry', trim: 'XSE', engine: '2.5L' },
  onConfirm: (operations) => saveToAppointment(operations),
});
```

### Modal — triggered by a button

```js
SPGWidget.init({
  mode:    'modal',
  trigger: '#add-service-btn',
  vehicleContext: { year: 2021, make: 'Ford', model: 'F-150' },
  onConfirm: (operations) => console.log(operations),
});
```

### Inline — embedded in a container

```js
SPGWidget.init({
  mode:      'inline',
  container: '#service-panel',
  vehicleContext: { year: 2023, make: 'Honda', model: 'Accord' },
  onConfirm: (operations) => console.log(operations),
});
```

---

## Cascading Selection Wizard

By default (`multiSelect: false`), picking a Service Operation doesn't immediately select it — many operations resolve through additional levels before they're a complete line item:

```
Operation   (e.g. Door Handle R&R)
  → Application  (Exterior Door Handle, Door Handle Gasket)
    → Position   (Front Right Door, Front Left Door, …)
      → Qualifier (Black paint (US), Red paint (Japan), …)
        → Labor   (Labor Type + Labor Hours)
```

Each level is fetched only after the prior one is chosen — the widget doesn't preload the whole tree. A level with zero options is skipped entirely (straight to the next level, or straight to Labor); a level with exactly one option auto-selects it and advances. Not every operation has all three sub-levels — some have none (straight to Labor, same as before), some only Applications, etc.

- **Back** steps back one level at a time to change an earlier choice (this re-resolves everything after it); from the very first step it exits the wizard entirely, back to the operation list, with nothing selected.
- **Editing a confirmed selection** — clicking an already-confirmed operation's row again reopens the wizard on the Labor step with its previous choices restored, so Back can revisit and change any earlier answer.
- Confirming (Apply) attaches the resolved Application/Position/Qualifier to the payload (see below) and closes the widget (except in `inline` mode, which stays open).

Set `multiSelect: true` to opt out of this flow entirely and use the original checkbox multi-select behavior instead (no wizard; Labor Type/Hours edited directly per row or in the modal's right panel).

---

## API

### `SPGWidget.attach(trigger, config)`

Convenience method. Equivalent to `SPGWidget.init({ mode: 'popover', trigger, ...config })`.

| Param | Type | Description |
|-------|------|-------------|
| `trigger` | `string \| Element` | CSS selector or DOM element that opens the widget |
| `config` | `object` | See config options below |

### `SPGWidget.init(config)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `'popover' \| 'modal' \| 'inline'` | `'popover'` if trigger set, else `'inline'` | Presentation mode |
| `container` | `string \| Element` | — | Target element for inline mode |
| `trigger` | `string \| Element` | — | Element that opens the widget (popover/modal) |
| `vehicleContext` | `object` | `{}` | `{ year, make, model, trim, engine }` — displayed in the widget header |
| `multiSelect` | `boolean` | `false` | `false` (default): single-select radio flow — choosing an operation opens a step-by-step Application → Position → Qualifier → Labor wizard. `true`: checkbox multi-select with inline/right-panel Labor editing, no wizard |
| `onConfirm` | `function` | — | Called with `operations[]` when the user confirms |
| `onChange` | `function` | — | Called with `operations[]` on every selection change |

Returns a widget instance with the following methods:

```js
const widget = SPGWidget.init({ ... });

widget.open();          // programmatically open (popover/modal)
widget.close();         // programmatically close
widget.getValue();      // returns current operations[] without closing
widget.destroy();       // remove from DOM and clean up listeners
```

### DOM Events

In addition to the `onConfirm` callback, the widget dispatches a `spg:confirm` CustomEvent on the trigger element (popover/modal) or container (inline) so host apps can listen passively:

```js
document.getElementById('service-search').addEventListener('spg:confirm', (e) => {
  console.log(e.detail.operations);
});
```

---

## Payload

`onConfirm` and `spg:confirm` both receive an array of operation objects:

```json
[
  {
    "operationId":     "op-drhandle",
    "operationName":   "Door Handle R&R",
    "opcode":          "BODY-DRHANDLE",
    "applicationId":   "app-ext",
    "applicationName": "Exterior Door Handle",
    "positionId":      "pos-fr",
    "positionName":    "Front Right Door",
    "qualifierId":     "q-blk-us",
    "qualifierName":   "Black paint (US)",
    "laborTypeId":     "standard",
    "laborHours":      0.5,
    "laborRate":       95,
    "laborCost":       47.50,
    "parts": [
      { "id": "p1", "name": "Door Handle", "price": 34.99, "qty": 1 }
    ],
    "partsCost":  34.99,
    "totalPrice": 82.49
  }
]
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `operationId` | `string` | Unique operation identifier |
| `operationName` | `string` | Display name |
| `opcode` | `string` | Legacy opcode mapping |
| `applicationId` / `applicationName` | `string \| null` | Resolved via the wizard; `null` if the operation has no Applications or `multiSelect: true` was used |
| `positionId` / `positionName` | `string \| null` | Resolved via the wizard; `null` if skipped or not applicable |
| `qualifierId` / `qualifierName` | `string \| null` | Resolved via the wizard; `null` if skipped or not applicable |
| `laborTypeId` | `string` | Selected labor type (`standard`, `premium`, `express`) |
| `laborHours` | `number` | Hours — editable by user |
| `laborRate` | `number` | $/hr — editable by user |
| `laborCost` | `number` | `laborHours × laborRate` |
| `parts` | `array` | Parts list with `name`, `price`, `qty` |
| `partsCost` | `number` | Sum of parts |
| `totalPrice` | `number` | `laborCost + partsCost` |

---

## Features

- **Operation search** — filter by name, category, or opcode
- **Category tree** — collapsed by default, auto-expands on search
- **Cascading selection wizard** (default) — single-select radio flow that resolves Operation → Application → Position → Qualifier → Labor, fetching each level only after the prior choice is made; see [Cascading Selection Wizard](#cascading-selection-wizard) above
- **Multi-select** — opt in with `multiSelect: true` for checkbox-driven selection with inline Labor Type/Hours editing (no wizard)
- **Keyboard** — `Escape` closes popover and modal
- **No dependencies** — vanilla JS, zero npm packages required
- **Scoped styles** — all CSS prefixed under `.spgw-*` to avoid conflicts with host app styles

---

## Previewing Locally

No build step or server required. Open directly in your browser:

```
file:///path/to/spg-search-widget/index.html
```

Or serve with any static file server:

```bash
npx serve . -p 3000
# → http://localhost:3000
```

---

## Project Structure

```
spg-search-widget/
├── src/
│   ├── spg-widget.js        # Unified widget (inline + popover + modal)
│   ├── spg-desktop.js       # Legacy: Desktop / Web Scheduler variant
│   ├── spg-mobile.js        # Legacy: Mobile / MCI variant
│   └── spg-service-cart.js  # Legacy: ServiceCart variant
├── demo/
│   ├── desktop.html
│   ├── mobile.html
│   └── service-cart.html
├── index.html               # Interactive preview of all three modes
└── package.json
```

The three files under `src/spg-*.js` (desktop, mobile, service-cart) are the original per-surface variants kept for reference. `spg-widget.js` is the unified replacement.

---

## Roadmap

- [ ] Real API integration (replace mock data with `apiBaseUrl` config option)
- [ ] Vehicle-specific pricing adjustments from backend
- [ ] Bundle/minify to single distributable file
- [ ] TypeScript types for the payload and config
- [ ] Web Component wrapper for framework-agnostic embedding
