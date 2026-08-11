# Cascading Selection Wizard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Replace the widget's single "pick an Operation" step (for the single-select/radio flow) with a step wizard that resolves Operation → Application → Position → Qualifier → Labor, each level fetched (simulated async) only after the prior choice is made.

**Architecture:** Add cascading `applications` data to select mock operations; add one `_s.wizard` state object with explicit controller methods (`_startWizard`, `_wizardResolve*`, `_wizardSelect*`, `_wizardBack`, `_wizardConfirm`) and matching render methods, following the existing file's style of named state + dedicated render methods. The wizard only activates for `multiSelect: false` (the current default); `multiSelect: true` (checkbox) behavior is untouched.

**Tech Stack:** Plain JS, no build step, no unit test framework in this repo. "Tests" in this plan are Playwright driver scripts (same pattern used earlier in this session) run against `index.html` via a local static server — this replaces the pytest-style TDD loop the writing-plans skill assumes by default; each task's verification step says exactly what to check in the browser instead.

**Design doc:** `docs/plans/2026-08-10-cascading-selection-wizard-design.md` — read it first for the *why* behind each decision below.

---

## Before you start

All work happens in `/Users/jenntran/code/spg-search-widget` on branch `feature/spg-widget-cascading-selection-wizard` (already created, already has the design doc committed). Every task below ends with a commit on this branch — do not touch `master`.

For manual verification, use this loop (used earlier in this session — a `run` skill exists for this project, prefer it if available):

```bash
cd /Users/jenntran/code/spg-search-widget
(python3 -m http.server 8123 >/tmp/spg-server.log 2>&1 &)
sleep 1
curl -sf http://localhost:8123/index.html >/dev/null && echo SERVING
```

Write throwaway driver scripts into the session scratchpad directory (not into the repo) and run with `node <script>.js` (Playwright is already installed there from earlier in this session — if it's a fresh environment, `npm install playwright && npx playwright install chromium` first). Always finish with:

```bash
lsof -ti:8123 -sTCP:LISTEN | xargs -r kill
```

All file references below are to `/Users/jenntran/code/spg-search-widget/src/spg-widget.js` unless stated otherwise. Line numbers are as of the file's current state (144 lines longer than before the previous session's radio-select change) — re-check with `grep -n` before editing if a prior task shifted line numbers, since edits earlier in this plan will shift everything after them.

---

### Task 1: Add cascading mock data + async fetch helper

**Files:**
- Modify: `src/spg-widget.js:52` (op-cpillar), `:54` (op-drhandle), `:63` (op-brk-f), `:103` (op-strut)
- Modify: `src/spg-widget.js:146` (add `fetchLevel` after `calcPricing`)

**Step 1: Add the `applications` cascade to four operations**

This gives the wizard four distinct shapes to handle: full 4-level cascade, single-application auto-advance skipping straight to Labor, applications-only (skip Position/Qualifier), and applications+positions (skip Qualifier only). Every other operation keeps its current shape (no `applications` field at all → skip straight to Labor, same as today).

Replace the `op-drhandle` line (`src/spg-widget.js:54`):

```js
        { id: 'op-drhandle',  name: 'Door Handle R&R',              group: 'Body Panels', opcode: 'BODY-DRHANDLE', laborHours: 0.5, laborTypeId: 'standard', parts: [{ id:'p1', name:'Door Handle', price:34.99, qty:1 }], isDefault: false,
          applications: [
            { id: 'app-ext', name: 'Exterior Door Handle', positions: [
              { id: 'pos-fr', name: 'Front Right Door', qualifiers: [
                { id: 'q-blk-us', name: 'Black paint (US)' },
                { id: 'q-blk-jp', name: 'Black paint (Japan)' },
                { id: 'q-red-us', name: 'Red paint (US)' },
                { id: 'q-red-jp', name: 'Red paint (Japan)' },
                { id: 'q-blu-us', name: 'Blue paint (US)' },
                { id: 'q-blu-jp', name: 'Blue paint (Japan)' },
              ]},
              { id: 'pos-fl', name: 'Front Left Door', qualifiers: [
                { id: 'q-blk-us', name: 'Black paint (US)' },
                { id: 'q-blk-jp', name: 'Black paint (Japan)' },
                { id: 'q-red-us', name: 'Red paint (US)' },
                { id: 'q-red-jp', name: 'Red paint (Japan)' },
              ]},
              { id: 'pos-rr', name: 'Rear Right Door', qualifiers: [
                { id: 'q-blk-us', name: 'Black paint (US)' },
                { id: 'q-red-us', name: 'Red paint (US)' },
              ]},
              { id: 'pos-rl', name: 'Rear Left Door', qualifiers: [
                { id: 'q-blk-us', name: 'Black paint (US)' },
                { id: 'q-red-us', name: 'Red paint (US)' },
              ]},
            ]},
            { id: 'app-gasket', name: 'Door Handle Gasket', positions: [
              { id: 'pos-fr', name: 'Front Right Door', qualifiers: [
                { id: 'q-blk-us', name: 'Black paint (US)' },
                { id: 'q-red-us', name: 'Red paint (US)' },
              ]},
              { id: 'pos-fl', name: 'Front Left Door', qualifiers: [
                { id: 'q-blk-us', name: 'Black paint (US)' },
                { id: 'q-red-us', name: 'Red paint (US)' },
              ]},
            ]},
          ] },
```

Replace the `op-cpillar` line (`:52`) — single Application, no Positions, so it auto-advances straight to Labor:

```js
        { id: 'op-cpillar',   name: 'C Pillar Baffle Plate R&R',   group: 'Body Panels', opcode: 'BODY-CPILLAR', laborHours: 0.8, laborTypeId: 'standard', parts: [], isDefault: false,
          applications: [
            { id: 'app-baffle', name: 'Baffle Plate Assembly' },
          ] },
```

Replace the `op-brk-f` line (`:63`) — two Applications, neither has `positions`, so choosing either skips straight to Labor:

```js
        { id: 'op-brk-f',     name: 'Brake Pad Replacement – Front',   group: 'Brake Pads',    opcode: 'BRK-PAD-F',   laborHours: 1.5, laborTypeId: 'standard', parts: [{ id:'p5',  name:'Front Brake Pad Set',  price:64.99, qty:1 }], isDefault: false,
          applications: [
            { id: 'app-oem',  name: 'OEM Pad Set' },
            { id: 'app-perf', name: 'Performance Pad Set' },
          ] },
```

Replace the `op-strut` line (`:103`) — two Applications, each with two Positions, no `qualifiers`, so Position selection skips straight to Labor:

```js
        { id: 'op-strut',  name: 'Front Strut Assembly R&R', group: 'Struts & Shocks', opcode: 'SUS-STRUT-F', laborHours: 1.8, laborTypeId: 'standard', parts: [{ id:'p22', name:'Front Strut Assembly', price:129.99, qty:2 }], isDefault: false,
          applications: [
            { id: 'app-strut-assy', name: 'Complete Strut Assembly', positions: [
              { id: 'pos-fl', name: 'Front Left' },
              { id: 'pos-fr', name: 'Front Right' },
            ]},
            { id: 'app-mount', name: 'Strut Mount Only', positions: [
              { id: 'pos-fl', name: 'Front Left' },
              { id: 'pos-fr', name: 'Front Right' },
            ]},
          ] },
```

**Step 2: Add the simulated async fetch helper**

Insert immediately after the `calcPricing` function (`src/spg-widget.js:146`, right before the `// ─── Styles ───` comment):

```js

  function fetchLevel(data, delay) {
    if (delay === undefined) delay = 400;
    return new Promise((res, rej) => {
      setTimeout(() => (data ? res(data) : rej(new Error('No data returned'))), delay);
    });
  }
```

Note: an empty array `[]` is truthy in JS, so a level that genuinely has zero options still *resolves* (with `[]`) rather than rejecting — rejection is reserved for a missing/`null` data source, which the calling code (Task 2) avoids by always passing `op.applications || []` etc. This means the reject branch isn't reachable through the current mock data — that's intentional per the design doc (a real boundary for the future MOTOR call, not a fabricated failure) and won't be covered by Task 7's verification for that reason.

**Step 3: Verify syntax**

Run: `node --check src/spg-widget.js`
Expected: no output (exit code 0).

**Step 4: Commit**

```bash
cd /Users/jenntran/code/spg-search-widget
git add src/spg-widget.js
git commit -m "feat: add cascading application/position/qualifier mock data"
```

---

### Task 2: Wizard state + controller methods

**Files:**
- Modify: `src/spg-widget.js` constructor (`this._s = {...}`, around line 339-346 before Task 1's edits shifted things)
- Modify: `src/spg-widget.js` — new methods added after `_applyOverride` (originally ending around line 808)

**Step 1: Add wizard state to the constructor**

Find `this._s = {` in the constructor and add a `wizard` field, then initialize it via a new `_resetWizard()` helper (defined in Step 2) right after:

```js
      this._s = {
        search:       '',
        expandedCats: new Set(),
        expandedOp:   null,  // compact: which op is priced inline
        focusedOp:    null,  // modal: which op shows in right panel
        selectedOps:  [],    // [{ op, pricing, wizard? }]
        overrides:    {},    // { [opId]: { laborTypeId?, laborHours?, laborRate? } }
        wizard:       null,  // set below via _resetWizard()
      };
      this._s.wizard = this._resetWizard();
```

**Step 2: Add the wizard controller methods**

Insert a new `// ── Wizard controller ──` section right after `_applyOverride` and before `// ── Footer ──`:

```js
    // ── Wizard controller ──────────────────────────────────────────────────────
    // Drives Operation -> Application -> Position -> Qualifier -> Labor for the
    // single-select (multiSelect: false) flow. Each level is fetched only after
    // the prior one is chosen, matching how the real MOTOR data source works.
    // A level with 0 options is skipped; exactly 1 option auto-selects and
    // advances. See docs/plans/2026-08-10-cascading-selection-wizard-design.md.

    _resetWizard() {
      return {
        opId: null, step: null, loading: false, error: null,
        applications: [], application: null,
        positions: [],    position:    null,
        qualifiers: [],   qualifier:   null,
        laborTypeId: null, laborHours: null,
      };
    }

    _isOpActive(opId) {
      return this._s.wizard.opId === opId || this._s.selectedOps.some(s => s.op.id === opId);
    }

    _startWizard(op) {
      this._s.wizard = this._resetWizard();
      this._s.wizard.opId = op.id;
      this._wizardResolveApplications(op);
    }

    _wizardCancel() {
      this._s.wizard = this._resetWizard();
      this._render();
    }

    _wizardGoToLabor(op) {
      const ov = this._s.overrides[op.id] || {};
      const p = calcPricing(op, ov);
      this._s.wizard.step = 'labor';
      this._s.wizard.loading = false;
      this._s.wizard.laborTypeId = p.ltId;
      this._s.wizard.laborHours  = p.laborHours;
      this._render();
    }

    _wizardResolveApplications(op) {
      this._s.wizard.loading = true;
      this._s.wizard.error = null;
      this._render();
      fetchLevel(op.applications || []).then(applications => {
        this._s.wizard.applications = applications;
        this._s.wizard.loading = false;
        if (applications.length === 0) { this._wizardGoToLabor(op); return; }
        if (applications.length === 1) { this._wizardSelectApplication(applications[0]); return; }
        this._s.wizard.step = 'application';
        this._render();
      }).catch(err => {
        this._s.wizard.loading = false;
        this._s.wizard.error = { step: 'application', message: err.message };
        this._render();
      });
    }

    _wizardSelectApplication(application) {
      const op = getOp(this._s.wizard.opId);
      const changed = this._s.wizard.application?.id !== application.id;
      this._s.wizard.application = application;
      if (changed) {
        this._s.wizard.positions = []; this._s.wizard.position = null;
        this._s.wizard.qualifiers = []; this._s.wizard.qualifier = null;
      }
      this._wizardResolvePositions(op, application);
    }

    _wizardResolvePositions(op, application) {
      this._s.wizard.loading = true;
      this._s.wizard.error = null;
      this._render();
      fetchLevel(application.positions || []).then(positions => {
        this._s.wizard.positions = positions;
        this._s.wizard.loading = false;
        if (positions.length === 0) { this._wizardGoToLabor(op); return; }
        if (positions.length === 1) { this._wizardSelectPosition(positions[0]); return; }
        this._s.wizard.step = 'position';
        this._render();
      }).catch(err => {
        this._s.wizard.loading = false;
        this._s.wizard.error = { step: 'position', message: err.message };
        this._render();
      });
    }

    _wizardSelectPosition(position) {
      const op = getOp(this._s.wizard.opId);
      const changed = this._s.wizard.position?.id !== position.id;
      this._s.wizard.position = position;
      if (changed) { this._s.wizard.qualifiers = []; this._s.wizard.qualifier = null; }
      this._wizardResolveQualifiers(op, position);
    }

    _wizardResolveQualifiers(op, position) {
      this._s.wizard.loading = true;
      this._s.wizard.error = null;
      this._render();
      fetchLevel(position.qualifiers || []).then(qualifiers => {
        this._s.wizard.qualifiers = qualifiers;
        this._s.wizard.loading = false;
        if (qualifiers.length === 0) { this._wizardGoToLabor(op); return; }
        if (qualifiers.length === 1) { this._wizardSelectQualifier(qualifiers[0]); return; }
        this._s.wizard.step = 'qualifier';
        this._render();
      }).catch(err => {
        this._s.wizard.loading = false;
        this._s.wizard.error = { step: 'qualifier', message: err.message };
        this._render();
      });
    }

    _wizardSelectQualifier(qualifier) {
      const op = getOp(this._s.wizard.opId);
      this._s.wizard.qualifier = qualifier;
      this._wizardGoToLabor(op);
    }

    _wizardBack() {
      const w = this._s.wizard;
      if (w.step === 'labor') {
        w.step = w.qualifiers.length ? 'qualifier'
               : w.positions.length  ? 'position'
               : w.applications.length ? 'application'
               : null;
      } else if (w.step === 'qualifier')   { w.step = 'position'; }
      else if (w.step === 'position')      { w.step = 'application'; }
      else if (w.step === 'application')   { this._wizardCancel(); return; }
      if (!w.step) { this._wizardCancel(); return; }
      this._render();
    }

    _wizardRetry() {
      const op = getOp(this._s.wizard.opId);
      const w = this._s.wizard;
      if (w.error?.step === 'application') this._wizardResolveApplications(op);
      else if (w.error?.step === 'position')  this._wizardResolvePositions(op, w.application);
      else if (w.error?.step === 'qualifier') this._wizardResolveQualifiers(op, w.position);
    }

    _wizardSetLabor(field, raw) {
      if (field === 'laborType')  this._s.wizard.laborTypeId = raw;
      if (field === 'laborHours') this._s.wizard.laborHours  = parseFloat(raw) || 0;
    }

    _wizardConfirm() {
      const op = getOp(this._s.wizard.opId);
      const ov = { laborTypeId: this._s.wizard.laborTypeId, laborHours: this._s.wizard.laborHours };
      const pricing = calcPricing(op, ov);
      this._s.selectedOps = [{
        op, pricing,
        wizard: {
          application: this._s.wizard.application,
          position:    this._s.wizard.position,
          qualifier:   this._s.wizard.qualifier,
        },
      }];
      this._emitChange();
      const payload = this._buildPayload();
      if (this._c.onConfirm) this._c.onConfirm(payload);
      const target = this._c.trigger || this._c.container;
      if (target) target.dispatchEvent(new CustomEvent('spg:confirm', { detail: { operations: payload }, bubbles: true }));
      this._s.selectedOps = [];
      this._s.wizard = this._resetWizard();
      this._render();
      if (this._c.mode !== 'inline') this.close();
    }
```

This task references `this._render()`, which doesn't exist yet — that's fine, it's added in Task 4. The file will fail if actually run in a browser right now, but it's still valid JS syntax.

**Step 2: Verify syntax**

Run: `node --check src/spg-widget.js`
Expected: no output (exit code 0).

**Step 3: Commit**

```bash
git add src/spg-widget.js
git commit -m "feat: add wizard controller state machine (no rendering yet)"
```

---

### Task 3: Wizard rendering methods + CSS

**Files:**
- Modify: `src/spg-widget.js` — new methods added after `_updateRightPanel` (originally ending around line 756)
- Modify: `src/spg-widget.js` — CSS `STYLES` template literal (originally ending around line 322, right before the closing backtick)

**Step 1: Add the wizard render methods**

Insert a new `// ── Wizard rendering ──` section right after `_updateRightPanel` and before `// ── Selection ──`:

```js
    // ── Wizard rendering ───────────────────────────────────────────────────────

    _wizardShellHTML() {
      const w = this._s.wizard;
      const op = getOp(w.opId);
      if (!op) return '';
      const crumbs = [op.name, w.application?.name, w.position?.name, w.qualifier?.name].filter(Boolean);
      return `
        <div class="spgw-wiz">
          <div class="spgw-wiz-hdr">
            <button class="spgw-wiz-back" data-wiz-action="back" ${w.step === 'application' ? 'style="visibility:hidden"' : ''}>‹ Back</button>
            <div class="spgw-wiz-crumbs">${crumbs.map(esc).join(' › ')}</div>
            <button class="spgw-wiz-cancel" data-wiz-action="cancel">✕</button>
          </div>
          <div class="spgw-wiz-body">
            ${w.loading ? this._wizardLoadingHTML()
              : w.error  ? this._wizardErrorHTML(w.error)
              : this._wizardStepBodyHTML(op, w)}
          </div>
        </div>`;
    }

    _wizardLoadingHTML() {
      return `<div class="spgw-wiz-loading"><span class="spgw-wiz-spinner"></span>Loading options…</div>`;
    }

    _wizardErrorHTML(error) {
      return `
        <div class="spgw-wiz-error">
          <p>${esc(error.message)}</p>
          <button class="spgw-wiz-retry" data-wiz-action="retry">Retry</button>
        </div>`;
    }

    _wizardStepBodyHTML(op, w) {
      if (w.step === 'application') return this._wizardOptionListHTML(w.applications, w.application, 'application', 'Select Application');
      if (w.step === 'position')    return this._wizardOptionListHTML(w.positions,    w.position,    'position',    'Select Position');
      if (w.step === 'qualifier')   return this._wizardOptionListHTML(w.qualifiers,   w.qualifier,   'qualifier',   'Select Qualifier');
      if (w.step === 'labor')       return this._wizardLaborHTML(op, w);
      return '';
    }

    _wizardOptionListHTML(options, selected, levelName, title) {
      return `
        <div class="spgw-wiz-title">${esc(title)}</div>
        <div class="spgw-wiz-options">
          ${options.map(o => `
            <button class="spgw-wiz-opt ${selected?.id === o.id ? 'is-selected' : ''}" data-wiz-action="select-${levelName}" data-wiz-id="${o.id}">
              ${esc(o.name)}
            </button>`).join('')}
        </div>`;
    }

    _wizardLaborHTML(op, w) {
      const p = calcPricing(op, { laborTypeId: w.laborTypeId, laborHours: w.laborHours });
      return `
        <div class="spgw-wiz-title">Labor</div>
        <div class="spgw-cprc">
          <div class="spgw-cprc-field">
            <span class="spgw-cprc-lbl">Labor Type</span>
            <select class="spgw-cprc-sel" data-wiz-field="laborType">
              ${LABOR_TYPES.map(lt => `<option value="${lt.id}" ${lt.id === p.ltId ? 'selected' : ''}>${esc(lt.name)}</option>`).join('')}
            </select>
          </div>
          <div class="spgw-cprc-field">
            <span class="spgw-cprc-lbl">Labor Hours</span>
            <input class="spgw-cprc-inp" type="number" step="0.1" min="0" value="${p.laborHours}" data-wiz-field="laborHours" />
          </div>
        </div>
        <div class="spgw-wiz-total"><span>Total</span><strong>${fmt$(p.total)}</strong></div>
        <button class="spgw-wiz-apply" data-wiz-action="apply">Apply</button>`;
    }
```

**Step 2: Add wizard CSS**

Insert right before the closing backtick of the `STYLES` template literal (after the `.spgw-confirm-btn:disabled` rule):

```css

/* ── Wizard ── */
.spgw-wizard-wrap{flex:1;display:flex;flex-direction:column;overflow-y:auto}
.spgw-wiz{display:flex;flex-direction:column;height:100%}
.spgw-wiz-hdr{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #f1f5f9;flex-shrink:0}
.spgw-wiz-back,.spgw-wiz-cancel{background:none;border:none;cursor:pointer;color:#64748b;font-size:12px;padding:2px 4px;border-radius:4px}
.spgw-wiz-back:hover,.spgw-wiz-cancel:hover{background:#f1f5f9;color:#374151}
.spgw-wiz-crumbs{flex:1;font-size:12px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.spgw-wiz-body{flex:1;overflow-y:auto;padding:14px}
.spgw-wiz-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin-bottom:10px}
.spgw-wiz-options{display:flex;flex-direction:column;gap:6px}
.spgw-wiz-opt{text-align:left;padding:10px 12px;border:1px solid #e2e8f0;border-radius:7px;background:#fff;font-size:13px;color:#374151;cursor:pointer;transition:all .12s}
.spgw-wiz-opt:hover{background:#f0f9ff;border-color:#bfdbfe}
.spgw-wiz-opt.is-selected{border-color:#2563eb;background:#eff6ff;color:#1d4ed8;font-weight:600}
.spgw-wiz-loading{display:flex;align-items:center;gap:8px;color:#64748b;font-size:13px;padding:20px 0}
.spgw-wiz-spinner{width:14px;height:14px;border:2px solid #e2e8f0;border-top-color:#2563eb;border-radius:50%;animation:spgw-spin .6s linear infinite}
@keyframes spgw-spin{to{transform:rotate(360deg)}}
.spgw-wiz-error{color:#dc2626;font-size:13px}
.spgw-wiz-error p{margin-bottom:8px}
.spgw-wiz-retry{padding:6px 12px;background:#fee2e2;color:#dc2626;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer}
.spgw-wiz-retry:hover{background:#fecaca}
.spgw-wiz-total{display:flex;justify-content:space-between;align-items:center;padding:12px 0;margin-top:12px;border-top:1px solid #f1f5f9;font-size:13px;color:#374151}
.spgw-wiz-total strong{font-size:16px;color:#059669}
.spgw-wiz-apply{display:block;width:100%;padding:10px;background:#2563eb;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer}
.spgw-wiz-apply:hover{background:#1d4ed8}
```

**Step 3: Verify syntax**

Run: `node --check src/spg-widget.js`
Expected: no output (exit code 0).

**Step 4: Commit**

```bash
git add src/spg-widget.js
git commit -m "feat: add wizard render methods and CSS"
```

---

### Task 4: Rendering dispatcher + swap tree/right-panel for the wizard

**Files:**
- Modify: `src/spg-widget.js` — `_buildCompact`, `_buildModal`, `_updateFooter`, `_updateRightPanel` (rename to `_renderModalRight`)
- Add: `_render()`, `_renderCompactBody()` methods

**Step 1: Add a `.spgw-wizard-wrap` container and gate the footer in `_buildCompact`**

Find `_buildCompact()` and change its `innerHTML`:

```js
    _buildCompact() {
      const v = this._c.vehicleContext;
      const vLabel = [v.year, v.make, v.model, v.trim, v.engine].filter(Boolean).join(' ');
      const el = document.createElement('div');
      el.innerHTML = `
        ${this._c.mode === 'popover' ? `
          <div class="spgw-pop-hdr">
            <span class="spgw-pop-title">Service Operations</span>
            ${vLabel ? `<span class="spgw-pop-veh">${esc(vLabel)}</span>` : ''}
            <button class="spgw-pop-close" data-action="close">✕</button>
          </div>` : ''}
        <div class="spgw-search-wrap">
          <input class="spgw-search" type="text" placeholder="Search by name, category, or opcode…" autocomplete="off" />
        </div>
        <div class="spgw-tree"></div>
        <div class="spgw-wizard-wrap" style="display:none"></div>
        ${this._c.multiSelect ? this._footerHTML() : ''}`;
      return el;
    }
```

(The only changes: the new `.spgw-wizard-wrap` div, and the footer is only rendered when `multiSelect` is true.)

**Step 2: Gate the footer in `_buildModal`**

In `_buildModal()`, change the last line of the template from `${this._footerHTML()}` to `${this._c.multiSelect ? this._footerHTML() : ''}`. Everything else in that method stays the same.

**Step 3: Guard `_updateFooter` for when the footer doesn't exist**

At the top of `_updateFooter()`, add:

```js
    _updateFooter() {
      if (!this._c.multiSelect) return;
      const footer  = this._root.querySelector('.spgw-footer');
      // ...rest of the method is unchanged
```

**Step 4: Rename `_updateRightPanel` to `_renderModalRight` and make it wizard-aware**

Replace the existing `_updateRightPanel` method:

```js
    _updateRightPanel(op) {
      const right = this._root.querySelector('.spgw-modal-right');
      if (right) right.innerHTML = this._rightPanelHTML(op);
    }
```

with:

```js
    _renderModalRight() {
      const right = this._root.querySelector('.spgw-modal-right');
      if (!right) return;
      if (!this._c.multiSelect && this._s.wizard.opId) {
        right.innerHTML = this._wizardShellHTML();
      } else if (this._c.multiSelect) {
        right.innerHTML = this._rightPanelHTML(this._s.focusedOp);
      } else {
        right.innerHTML = this._rightPanelHTML(null);
      }
    }
```

Update every call site that used `this._updateRightPanel(op)`:
- In `_bindEvents`'s modal right-panel add-button handler: change `this._updateRightPanel(op);` to `this._renderModalRight();`.
- In `_deselectOp`: change `this._updateRightPanel(this._s.focusedOp);` to `this._renderModalRight();`.
- In `_applyOverride`: change `this._updateRightPanel(this._s.focusedOp);` to `this._renderModalRight();`.

(Find these with `grep -n "_updateRightPanel" src/spg-widget.js` to confirm you got all of them before moving on — there should be zero matches left except inside the method definition itself, which no longer exists.)

**Step 5: Add the rendering dispatcher and compact-body swap**

Add these two methods right after `_renderModalRight`:

```js
    _render() {
      this._updateTree();
      if (this._c.mode === 'modal') this._renderModalRight();
      else this._renderCompactBody();
    }

    _renderCompactBody() {
      const searchWrap = this._root.querySelector('.spgw-search-wrap');
      const treeEl      = this._root.querySelector('.spgw-tree');
      const wizardWrap  = this._root.querySelector('.spgw-wizard-wrap');
      const footer       = this._root.querySelector('.spgw-footer');
      const showWizard  = !this._c.multiSelect && !!this._s.wizard.opId;
      if (searchWrap) searchWrap.style.display = showWizard ? 'none' : '';
      if (treeEl)      treeEl.style.display     = showWizard ? 'none' : '';
      if (footer)       footer.style.display     = this._c.multiSelect ? '' : 'none';
      if (wizardWrap) {
        wizardWrap.style.display = showWizard ? '' : 'none';
        if (showWizard) wizardWrap.innerHTML = this._wizardShellHTML();
      }
    }
```

**Step 6: Verify syntax**

Run: `node --check src/spg-widget.js`
Expected: no output (exit code 0).

**Step 7: Commit**

```bash
git add src/spg-widget.js
git commit -m "feat: swap tree/right-panel for wizard shell when active"
```

---

### Task 5: Wire the tree and wizard shell to the controller

**Files:**
- Modify: `src/spg-widget.js` — `_opRowHTML`, and the tree/wizard event listeners inside `_bindEvents`

**Step 1: Update `_opRowHTML` to reflect wizard activity and hide the old chevron/expand for single-select**

Replace the existing `_opRowHTML` method body with:

```js
    _opRowHTML(op) {
      const active  = this._isOpActive(op.id);
      const focused = this._c.mode === 'modal' && this._c.multiSelect && this._s.focusedOp?.id === op.id;
      const wizardFocused = this._c.mode === 'modal' && !this._c.multiSelect && this._s.wizard.opId === op.id;
      const expanded = this._c.multiSelect && this._c.mode !== 'modal' && this._s.expandedOp === op.id;
      const ov = this._s.overrides[op.id] || {};
      const p  = calcPricing(op, ov);

      return `
        <div class="spgw-op ${active ? 'is-selected' : ''} ${(focused || wizardFocused) ? 'is-focused' : ''} ${expanded ? 'is-expanded' : ''}">
          <div class="spgw-op-row" data-op-row="${op.id}">
            <input type="${this._c.multiSelect ? 'checkbox' : 'radio'}" name="spgw-op-radio-${this._uid}" class="spgw-chk" data-op="${op.id}" ${active ? 'checked' : ''} />
            <div class="spgw-op-info">
              <span class="spgw-op-name">${esc(op.name)}</span>
              <span class="spgw-op-sub">${esc(op.group || '')}</span>
            </div>
            <span class="spgw-op-price">${fmt$(p.total)}</span>
            ${this._c.multiSelect && this._c.mode !== 'modal'
              ? `<button class="spgw-op-toggle" data-op-toggle="${op.id}">${expanded ? '▲' : '▼'}</button>`
              : ''}
          </div>
          ${expanded ? this._compactPricingHTML(op, p) : ''}
        </div>`;
    }
```

(`_isOpActive` and `_compactPricingHTML` already exist — this task just changes what drives `active`/`expanded` and gates the chevron button to `multiSelect` only.)

**Step 2: Replace the tree's operation-row click handling in `_bindEvents`**

Find these three listeners bound to `.spgw-tree`:
1. The `click` listener containing the category-header, toggle-button, and operation-row-click logic.
2. The `change` listener that does the checkbox/radio select (`Checkbox toggle`).
3. The `click` listener added in the previous session for unselecting an already-checked radio (`Radio click on an already-selected op...`).

Replace all three with:

```js
      // Tree: category toggle, expand toggle (multiSelect), op row click
      root.querySelector('.spgw-tree').addEventListener('click', e => {
        // Category header
        const catHdr = e.target.closest('.spgw-cat-hdr');
        if (catHdr && !this._s.search.trim()) {
          const id = catHdr.dataset.cat;
          this._s.expandedCats[this._s.expandedCats.has(id) ? 'delete' : 'add'](id);
          this._updateTree();
          return;
        }

        // Expand toggle (compact mode, multiSelect only)
        const toggleBtn = e.target.closest('.spgw-op-toggle');
        if (toggleBtn) {
          const opId = toggleBtn.dataset.opToggle;
          this._s.expandedOp = this._s.expandedOp === opId ? null : opId;
          this._updateTree();
          return;
        }

        // Operation row click (includes clicking the checkbox/radio itself)
        const opRow = e.target.closest('.spgw-op-row');
        if (!opRow) return;
        const opId = opRow.dataset.opRow;
        const op = getOp(opId);
        if (!op) return;

        if (this._c.multiSelect) {
          if (e.target.classList.contains('spgw-chk')) return; // handled by 'change' below
          if (this._c.mode === 'modal') {
            this._s.focusedOp = op;
            this._renderModalRight();
            this._updateTree();
          } else {
            this._s.expandedOp = this._s.expandedOp === opId ? null : opId;
            this._updateTree();
          }
        } else {
          if (this._isOpActive(opId)) this._wizardCancel();
          else this._startWizard(op);
        }
      });

      // Checkbox toggle (multiSelect only — single-select uses the click handler above)
      root.querySelector('.spgw-tree').addEventListener('change', e => {
        if (!this._c.multiSelect || !e.target.classList.contains('spgw-chk')) return;
        const op = getOp(e.target.dataset.op);
        if (!op) return;
        e.target.checked ? this._selectOp(op) : this._deselectOp(op.id);
      });
```

**Step 3: Add wizard action/field event bindings**

Add these two listeners on `root` (not scoped to `.spgw-tree` — the wizard shell can render inside `.spgw-wizard-wrap` for popover/inline, or `.spgw-modal-right` for modal, so a root-level delegated listener covers both). Add them right after the "Footer chip remove" listener and before the "Confirm button" listener in `_bindEvents`:

```js
      // Wizard actions (delegated from root — shell renders in wizard-wrap or modal-right)
      root.addEventListener('click', e => {
        const actionBtn = e.target.closest('[data-wiz-action]');
        if (!actionBtn) return;
        const action = actionBtn.dataset.wizAction;
        if (action === 'back')   { this._wizardBack(); return; }
        if (action === 'cancel') { this._wizardCancel(); return; }
        if (action === 'retry')  { this._wizardRetry(); return; }
        if (action === 'apply')  { this._wizardConfirm(); return; }
        const id = actionBtn.dataset.wizId;
        if (action === 'select-application') { const a = this._s.wizard.applications.find(x => x.id === id); if (a) this._wizardSelectApplication(a); }
        if (action === 'select-position')    { const p = this._s.wizard.positions.find(x => x.id === id);    if (p) this._wizardSelectPosition(p); }
        if (action === 'select-qualifier')   { const q = this._s.wizard.qualifiers.find(x => x.id === id);   if (q) this._wizardSelectQualifier(q); }
      });

      root.addEventListener('change', e => {
        if (e.target.dataset.wizField === 'laborType') { this._wizardSetLabor('laborType', e.target.value); this._render(); }
      });
      root.addEventListener('input', e => {
        if (e.target.dataset.wizField === 'laborHours') this._wizardSetLabor('laborHours', e.target.value);
      });
```

**Step 4: Verify syntax**

Run: `node --check src/spg-widget.js`
Expected: no output (exit code 0).

**Step 5: Commit**

```bash
git add src/spg-widget.js
git commit -m "feat: wire tree and wizard shell to the wizard controller"
```

---

### Task 6: Include the resolved chain in the confirmed payload

**Files:**
- Modify: `src/spg-widget.js` — `_buildPayload`

**Step 1: Update `_buildPayload`**

Replace the method:

```js
    _buildPayload() {
      return this._s.selectedOps.map(({ op, pricing }) => ({
        operationId:   op.id,
        operationName: op.name,
        opcode:        op.opcode,
        laborTypeId:   pricing.ltId,
        laborHours:    pricing.laborHours,
        laborRate:     pricing.laborRate,
        laborCost:     pricing.laborCost,
        parts:         pricing.parts,
        partsCost:     pricing.partsCost,
        totalPrice:    pricing.total,
      }));
    }
```

with:

```js
    _buildPayload() {
      return this._s.selectedOps.map(({ op, pricing, wizard }) => ({
        operationId:     op.id,
        operationName:   op.name,
        opcode:          op.opcode,
        applicationId:   wizard?.application?.id   ?? null,
        applicationName: wizard?.application?.name ?? null,
        positionId:      wizard?.position?.id       ?? null,
        positionName:    wizard?.position?.name     ?? null,
        qualifierId:     wizard?.qualifier?.id       ?? null,
        qualifierName:   wizard?.qualifier?.name     ?? null,
        laborTypeId:     pricing.ltId,
        laborHours:      pricing.laborHours,
        laborRate:       pricing.laborRate,
        laborCost:       pricing.laborCost,
        parts:           pricing.parts,
        partsCost:       pricing.partsCost,
        totalPrice:      pricing.total,
      }));
    }
```

`multiSelect: true` selections never have a `.wizard` field, so those five fields are simply `null` for that flow — expected, per the design doc.

**Step 2: Verify syntax**

Run: `node --check src/spg-widget.js`
Expected: no output (exit code 0).

**Step 3: Commit**

```bash
git add src/spg-widget.js
git commit -m "feat: include resolved application/position/qualifier in confirmed payload"
```

---

### Task 7: Browser verification of every wizard path

**Files:**
- Create (scratchpad, not committed): a Playwright driver script

**Step 1: Serve the demo and confirm it's up**

```bash
cd /Users/jenntran/code/spg-search-widget
(python3 -m http.server 8123 >/tmp/spg-server.log 2>&1 &)
sleep 1
curl -sf http://localhost:8123/index.html >/dev/null && echo SERVING
```

**Step 2: Write the verification script**

Write this to your scratchpad directory as `verify-wizard.js` (adjust the path if your scratchpad differs):

```js
const { chromium } = require('playwright');

async function openPopoverTree(page) {
  await page.click('#popover-trigger');
  await page.waitForSelector('.spgw-popover.spgw--visible .spgw-tree', { state: 'visible' });
  return page.locator('.spgw-popover.spgw--visible');
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });

  // ── Scenario 1: full 4-level cascade happy path (Door Handle R&R) ──
  await page.goto('http://localhost:8123/index.html', { waitUntil: 'load' });
  let root = await openPopoverTree(page);
  await root.locator('.spgw-cat-hdr[data-cat="body-frame"]').click();
  await root.locator('input[data-op="op-drhandle"]').click();
  await page.waitForSelector('.spgw-wiz-title:has-text("Select Application")');
  await root.locator('.spgw-wiz-opt', { hasText: 'Exterior Door Handle' }).click();
  await page.waitForSelector('.spgw-wiz-title:has-text("Select Position")');
  await root.locator('.spgw-wiz-opt', { hasText: 'Front Right Door' }).click();
  await page.waitForSelector('.spgw-wiz-title:has-text("Select Qualifier")');
  await root.locator('.spgw-wiz-opt', { hasText: 'Black paint (US)' }).click();
  await page.waitForSelector('.spgw-wiz-title:has-text("Labor")');
  await root.locator('.spgw-wiz-apply').click();
  await page.waitForTimeout(150);
  const fieldValue1 = await page.inputValue('#popover-trigger');
  console.log('SCENARIO_1_FIELD', JSON.stringify(fieldValue1));

  // ── Scenario 2: single-option auto-advance + skip straight to Labor (C Pillar) ──
  await page.reload({ waitUntil: 'load' });
  root = await openPopoverTree(page);
  await root.locator('.spgw-cat-hdr[data-cat="body-frame"]').click();
  await root.locator('input[data-op="op-cpillar"]').click();
  await page.waitForSelector('.spgw-wiz-title:has-text("Labor")', { timeout: 3000 });
  const crumbs2 = await page.textContent('.spgw-wiz-crumbs');
  console.log('SCENARIO_2_CRUMBS', JSON.stringify(crumbs2));

  // ── Scenario 3: applications-only, skip Position/Qualifier (Brake Pad Front) ──
  await page.reload({ waitUntil: 'load' });
  root = await openPopoverTree(page);
  await root.locator('.spgw-cat-hdr[data-cat="brakes"]').click();
  await root.locator('input[data-op="op-brk-f"]').click();
  await page.waitForSelector('.spgw-wiz-title:has-text("Select Application")');
  await root.locator('.spgw-wiz-opt', { hasText: 'OEM Pad Set' }).click();
  await page.waitForSelector('.spgw-wiz-title:has-text("Labor")', { timeout: 3000 });
  console.log('SCENARIO_3_OK', true);

  // ── Scenario 4: back navigation changes an earlier choice ──
  await page.reload({ waitUntil: 'load' });
  root = await openPopoverTree(page);
  await root.locator('.spgw-cat-hdr[data-cat="body-frame"]').click();
  await root.locator('input[data-op="op-drhandle"]').click();
  await page.waitForSelector('.spgw-wiz-title:has-text("Select Application")');
  await root.locator('.spgw-wiz-opt', { hasText: 'Exterior Door Handle' }).click();
  await page.waitForSelector('.spgw-wiz-title:has-text("Select Position")');
  await root.locator('.spgw-wiz-opt', { hasText: 'Front Right Door' }).click();
  await page.waitForSelector('.spgw-wiz-title:has-text("Select Qualifier")');
  await root.locator('.spgw-wiz-back').click();
  await page.waitForSelector('.spgw-wiz-title:has-text("Select Position")');
  await root.locator('.spgw-wiz-back').click();
  await page.waitForSelector('.spgw-wiz-title:has-text("Select Application")');
  await root.locator('.spgw-wiz-opt', { hasText: 'Door Handle Gasket' }).click();
  await page.waitForSelector('.spgw-wiz-title:has-text("Select Position")');
  const positionCountAfterBack = await root.locator('.spgw-wiz-opt').count();
  console.log('SCENARIO_4_POSITION_COUNT_AFTER_SWITCHING_APPLICATION', positionCountAfterBack);

  // ── Scenario 5: cancel mid-wizard returns to the tree ──
  await root.locator('.spgw-wiz-cancel').click();
  await page.waitForSelector('.spgw-tree', { state: 'visible' });
  const treeVisible = await root.locator('.spgw-tree').isVisible();
  console.log('SCENARIO_5_TREE_VISIBLE_AFTER_CANCEL', treeVisible);

  console.log('CONSOLE_ERRORS', JSON.stringify(errors));
  await browser.close();
})();
```

**Step 3: Run it**

```bash
node verify-wizard.js
```

Expected output (values, not exact formatting):
- `SCENARIO_1_FIELD` contains `"Door Handle R&R"` and a dollar amount.
- `SCENARIO_2_CRUMBS` contains `"C Pillar Baffle Plate R&R"` and `"Baffle Plate Assembly"` — proving the single Application auto-selected without a click.
- `SCENARIO_3_OK` is `true` (reaching the Labor step after only picking an Application).
- `SCENARIO_4_POSITION_COUNT_AFTER_SWITCHING_APPLICATION` is `2` (Door Handle Gasket's 2 positions, not stale data from Exterior Door Handle's 4).
- `SCENARIO_5_TREE_VISIBLE_AFTER_CANCEL` is `true`.
- `CONSOLE_ERRORS` is `[]`.

If anything doesn't match, fix the relevant method from Tasks 2-5 and re-run — don't move on with a failing scenario.

**Step 4: Manually sanity-check the Modal tab once**

The script above only exercises Popover. Modal uses a different DOM shape (`.spgw-modal-right` instead of `.spgw-wizard-wrap`, tree stays visible). At minimum, click through `.tab-btn[data-tab="modal"]` → `#modal-trigger` → pick an Operation from the left tree → confirm the wizard renders in the right panel instead of the old Labor-only panel, and that the left tree still shows the category list underneath. A screenshot (`page.screenshot(...)`) here is enough — full scripted coverage of Modal is not required for this task.

**Step 5: Stop the server**

```bash
lsof -ti:8123 -sTCP:LISTEN | xargs -r kill
```

**Step 6: Commit** (only if Step 3/4 required code fixes — if everything passed on the first run, there's nothing to commit for this task)

```bash
git add src/spg-widget.js
git commit -m "fix: address issues found in wizard browser verification"
```

---

## Out of scope (per design doc)

- `multiSelect: true` checkbox mode is unaffected — do not add wizard behavior there.
- No real MOTOR API call — `fetchLevel` stays a mock async boundary.
- The error/Retry UI path is implemented but not exercised by the mock data (see Task 1, Step 2) — do not add fabricated random failures to force-test it.
