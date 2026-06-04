/**
 * SPG Search Widget — Mobile / MCI Variant
 *
 * Card-based horizontally scrolling view for mobile check-in contexts.
 * Auto-adds operations marked as `isDefault: true` on initialization.
 *
 * Embed:
 *   <div id="spg-mobile"></div>
 *   <script src="spg-mobile.js"></script>
 *   <script>
 *     SPGMobileWidget.init({
 *       container: '#spg-mobile',
 *       vehicleContext: { year: 2022, make: 'Toyota', model: 'Camry' },
 *       onOperationSelected: (ops) => console.log(ops),
 *     });
 *   </script>
 *
 * Events: container dispatches 'spg:operations-changed' with detail.operations
 */
(function (global) {
  'use strict';

  // ─── Mock Data ────────────────────────────────────────────────────────────────

  const LABOR_TYPES = [
    { id: 'standard', name: 'Standard',  rate: 95  },
    { id: 'premium',  name: 'Premium',   rate: 125 },
    { id: 'express',  name: 'Express',   rate: 145 },
  ];

  const CATEGORIES = [
    {
      id: 'oil-fluids', name: 'Oil & Fluids',
      operations: [
        { id: 'op-oil-conv',  name: 'Oil Change – Conventional',      opcode: 'OC-CONV',     laborHours: 0.5, laborTypeId: 'standard', parts: [{ id:'p1', name:'Oil Filter',                price: 8.99, qty:1 }, { id:'p2', name:'Conv. Oil 5W-30 (5qt)', price:24.99, qty:1 }], totalPrice: 82.49,  isDefault: false },
        { id: 'op-oil-synth', name: 'Oil Change – Full Synthetic',     opcode: 'OC-SYNTH',    laborHours: 0.5, laborTypeId: 'standard', parts: [{ id:'p3', name:'Oil Filter',                price:12.99, qty:1 }, { id:'p4', name:'Full Syn. Oil 5W-30 (5qt)', price:49.99, qty:1 }], totalPrice: 110.48, isDefault: false },
        { id: 'op-coolant',   name: 'Coolant System Flush',            opcode: 'COOL-FLUSH',  laborHours: 1.0, laborTypeId: 'standard', parts: [{ id:'p5', name:'Coolant (1 gal)',            price:22.99, qty:2 }], totalPrice: 140.98, isDefault: false },
        { id: 'op-trans',     name: 'Transmission Fluid Service',      opcode: 'TRANS-FLUID', laborHours: 1.5, laborTypeId: 'premium',  parts: [{ id:'p6', name:'ATF Fluid (1qt)',            price:18.99, qty:4 }], totalPrice: 263.46, isDefault: false },
      ],
    },
    {
      id: 'brakes', name: 'Brakes',
      operations: [
        { id: 'op-brk-f',     name: 'Brake Pads – Front',             opcode: 'BRK-PAD-F',   laborHours: 1.5, laborTypeId: 'standard', parts: [{ id:'p7',  name:'Front Brake Pad Set',       price:64.99, qty:1 }], totalPrice: 207.49, isDefault: false },
        { id: 'op-brk-r',     name: 'Brake Pads – Rear',              opcode: 'BRK-PAD-R',   laborHours: 1.5, laborTypeId: 'standard', parts: [{ id:'p8',  name:'Rear Brake Pad Set',        price:54.99, qty:1 }], totalPrice: 197.49, isDefault: false },
        { id: 'op-rotor',     name: 'Rotor Replacement – Front',       opcode: 'BRK-ROTOR-F', laborHours: 2.0, laborTypeId: 'standard', parts: [{ id:'p9',  name:'Front Rotor (ea)',          price:79.99, qty:2 }], totalPrice: 254.98, isDefault: false },
        { id: 'op-brk-flush', name: 'Brake Fluid Flush',              opcode: 'BRK-FLUSH',   laborHours: 0.8, laborTypeId: 'standard', parts: [{ id:'p10', name:'DOT 3 Brake Fluid',         price:14.99, qty:1 }], totalPrice:  90.99, isDefault: false },
      ],
    },
    {
      id: 'tires', name: 'Tires & Wheels',
      operations: [
        { id: 'op-tire-rot',  name: 'Tire Rotation',                  opcode: 'TIRE-ROT',    laborHours: 0.5, laborTypeId: 'standard', parts: [], totalPrice: 47.50, isDefault: true  },
        { id: 'op-whl-bal',   name: 'Wheel Balance (4 wheels)',        opcode: 'WHEEL-BAL',   laborHours: 1.0, laborTypeId: 'standard', parts: [], totalPrice: 95.00, isDefault: false },
        { id: 'op-tire-inst', name: 'Tire Installation (per tire)',    opcode: 'TIRE-INST',   laborHours: 0.3, laborTypeId: 'standard', parts: [{ id:'p11', name:'Valve Stem',               price: 3.99, qty:1 }], totalPrice: 32.49, isDefault: false },
      ],
    },
    {
      id: 'engine', name: 'Engine',
      operations: [
        { id: 'op-spark',   name: 'Spark Plug Replacement',           opcode: 'ENG-SPARK',   laborHours: 1.5, laborTypeId: 'standard', parts: [{ id:'p12', name:'Iridium Spark Plug',        price:14.99, qty:4 }], totalPrice: 202.46, isDefault: false },
        { id: 'op-air-flt', name: 'Engine Air Filter',                opcode: 'ENG-AIR',     laborHours: 0.3, laborTypeId: 'standard', parts: [{ id:'p13', name:'Engine Air Filter',         price:24.99, qty:1 }], totalPrice:  53.49, isDefault: false },
        { id: 'op-fuel',    name: 'Fuel System Cleaning',             opcode: 'ENG-FUEL',    laborHours: 1.0, laborTypeId: 'premium',  parts: [{ id:'p14', name:'Fuel System Cleaner',      price:34.99, qty:1 }], totalPrice: 159.99, isDefault: false },
      ],
    },
    {
      id: 'electrical', name: 'Electrical',
      operations: [
        { id: 'op-batt', name: 'Battery Replacement',                 opcode: 'ELEC-BATT',   laborHours: 0.5, laborTypeId: 'standard', parts: [{ id:'p15', name:'Group 35 Battery',         price:139.99, qty:1 }], totalPrice: 187.49, isDefault: false },
        { id: 'op-alt',  name: 'Alternator Replacement',              opcode: 'ELEC-ALT',    laborHours: 2.5, laborTypeId: 'premium',  parts: [{ id:'p16', name:'Reman. Alternator',         price:229.99, qty:1 }], totalPrice: 542.49, isDefault: false },
      ],
    },
    {
      id: 'hvac', name: 'HVAC',
      operations: [
        { id: 'op-ac',      name: 'A/C System Recharge',              opcode: 'HVAC-AC',     laborHours: 1.0, laborTypeId: 'standard', parts: [{ id:'p17', name:'R-134a Refrigerant',       price:49.99, qty:1 }], totalPrice: 144.99, isDefault: false },
        { id: 'op-cab-flt', name: 'Cabin Air Filter',                 opcode: 'HVAC-CAB',    laborHours: 0.3, laborTypeId: 'standard', parts: [{ id:'p18', name:'Cabin Air Filter',         price:19.99, qty:1 }], totalPrice:  48.49, isDefault: true  },
      ],
    },
  ];

  // ─── Utilities ────────────────────────────────────────────────────────────────

  const r2  = n => Math.round(n * 100) / 100;
  const fmt$ = n => '$' + Number(n).toFixed(2);
  const esc  = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  function calcPricing(op) {
    const lt = LABOR_TYPES.find(l => l.id === op.laborTypeId) || LABOR_TYPES[0];
    const laborCost = r2(op.laborHours * lt.rate);
    const partsCost = r2(op.parts.reduce((s, p) => s + p.price * p.qty, 0));
    return { laborRate: lt.rate, laborCost, partsCost, total: r2(laborCost + partsCost) };
  }

  function allOps() {
    return CATEGORIES.flatMap(c => c.operations.map(o => ({ ...o, categoryName: c.name })));
  }

  // ─── Styles ───────────────────────────────────────────────────────────────────

  const STYLES = `
.spg-mw *{box-sizing:border-box;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;margin:0;padding:0}
.spg-mw{display:flex;flex-direction:column;background:#f8fafc;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 2px 12px rgba(0,0,0,.08)}
/* Header */
.spg-mw-header{background:#1e3a8a;padding:14px 14px 0}
.spg-mw-veh{font-size:13px;color:rgba(255,255,255,.8);margin-bottom:10px;font-weight:500}
.spg-mw-search-wrap{position:relative;margin-bottom:12px}
.spg-mw-search{width:100%;padding:10px 12px 10px 36px;border:none;border-radius:8px;font-size:14px;outline:none;background:#fff;color:#111827}
.spg-mw-search::placeholder{color:#94a3b8}
.spg-mw-search-icon{position:absolute;left:11px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:14px;pointer-events:none}
/* Category pills */
.spg-mw-cats{display:flex;gap:6px;overflow-x:auto;padding-bottom:12px;scrollbar-width:none}
.spg-mw-cats::-webkit-scrollbar{display:none}
.spg-mw-cat-pill{flex-shrink:0;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;cursor:pointer;border:none;background:rgba(255,255,255,.18);color:#fff;transition:background .15s}
.spg-mw-cat-pill.active{background:#fff;color:#1e3a8a}
/* Cards area */
.spg-mw-body{padding:14px 0 0}
.spg-mw-cat-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;padding:0 14px 8px}
.spg-mw-cards-row{display:flex;gap:10px;overflow-x:auto;padding:0 14px 14px;scrollbar-width:none}
.spg-mw-cards-row::-webkit-scrollbar{display:none}
.spg-mw-card{flex-shrink:0;width:148px;background:#fff;border-radius:10px;border:2px solid #e2e8f0;padding:12px;cursor:pointer;transition:border-color .15s,box-shadow .15s;position:relative}
.spg-mw-card:hover{border-color:#93c5fd;box-shadow:0 2px 8px rgba(59,130,246,.12)}
.spg-mw-card.selected{border-color:#2563eb;background:#eff6ff}
.spg-mw-card-default{position:absolute;top:8px;right:8px;font-size:10px;font-weight:700;color:#059669;background:#d1fae5;padding:2px 6px;border-radius:4px;text-transform:uppercase;letter-spacing:.04em}
.spg-mw-card-name{font-size:13px;font-weight:600;color:#1e293b;line-height:1.3;margin-bottom:6px;margin-top:4px;min-height:36px}
.spg-mw-card-opcode{font-size:11px;color:#94a3b8;font-family:monospace;margin-bottom:8px}
.spg-mw-card-price{font-size:16px;font-weight:800;color:#059669;margin-bottom:10px}
.spg-mw-card-btn{display:block;width:100%;padding:6px;border-radius:6px;font-size:12px;font-weight:600;border:none;cursor:pointer;transition:background .15s}
.spg-mw-card-btn.add{background:#2563eb;color:#fff}
.spg-mw-card-btn.add:hover{background:#1d4ed8}
.spg-mw-card-btn.remove{background:#fee2e2;color:#dc2626}
.spg-mw-card-btn.remove:hover{background:#fecaca}
/* No results */
.spg-mw-no-results{padding:24px;text-align:center;color:#94a3b8;font-size:13px}
/* Selected */
.spg-mw-selected{background:#fff;border-top:1px solid #e2e8f0}
.spg-mw-sel-hdr{display:flex;justify-content:space-between;align-items:center;padding:12px 14px 8px;font-size:13px;font-weight:700;color:#374151}
.spg-mw-sel-total{color:#059669;font-size:15px}
.spg-mw-sel-list{padding:0 14px 14px;display:flex;flex-direction:column;gap:6px;max-height:180px;overflow-y:auto}
.spg-mw-sel-item{display:flex;align-items:center;justify-content:space-between;background:#f8fafc;border-radius:8px;padding:8px 10px;gap:8px}
.spg-mw-sel-name{font-size:13px;color:#1e293b;font-weight:500;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.spg-mw-sel-price{font-size:13px;font-weight:700;color:#059669;flex-shrink:0}
.spg-mw-sel-rm{background:none;border:none;cursor:pointer;color:#94a3b8;font-size:18px;line-height:1;padding:0 2px;flex-shrink:0;transition:color .1s}
.spg-mw-sel-rm:hover{color:#dc2626}
.spg-mw-no-sel{padding:12px 14px;font-size:13px;color:#94a3b8;font-style:italic}
/* Pricing sheet (modal overlay) */
.spg-mw-overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;display:flex;align-items:flex-end;justify-content:center}
.spg-mw-sheet{background:#fff;border-radius:16px 16px 0 0;width:100%;max-width:480px;max-height:85vh;overflow-y:auto;padding:0 0 24px}
.spg-mw-sheet-drag{width:36px;height:4px;background:#e2e8f0;border-radius:2px;margin:12px auto}
.spg-mw-sheet-header{padding:0 18px 14px;border-bottom:1px solid #f1f5f9}
.spg-mw-sheet-name{font-size:17px;font-weight:700;color:#111827;margin-bottom:4px}
.spg-mw-sheet-opcode{font-size:12px;color:#6b7280;font-family:monospace;background:#f3f4f6;padding:2px 8px;border-radius:4px}
.spg-mw-sheet-body{padding:16px 18px}
.spg-mw-sheet-row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #f8fafc;font-size:14px}
.spg-mw-sheet-row:last-child{border-bottom:none}
.spg-mw-sheet-lbl{color:#6b7280}
.spg-mw-sheet-val{color:#111827;font-weight:500}
.spg-mw-sheet-total{display:flex;justify-content:space-between;padding:14px 18px;border-top:2px solid #e2e8f0;font-size:17px;font-weight:800}
.spg-mw-sheet-total-lbl{color:#111827}
.spg-mw-sheet-total-val{color:#059669}
.spg-mw-sheet-actions{padding:0 18px;display:flex;gap:10px}
.spg-mw-sheet-add{flex:1;padding:12px;background:#2563eb;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer}
.spg-mw-sheet-add:hover{background:#1d4ed8}
.spg-mw-sheet-close{padding:12px 16px;background:#f1f5f9;color:#374151;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer}
.spg-mw-sheet-close:hover{background:#e2e8f0}
`;

  // ─── Widget Class ─────────────────────────────────────────────────────────────

  class SPGMobileWidget {
    constructor(config) {
      this.el = typeof config.container === 'string'
        ? document.querySelector(config.container)
        : config.container;
      this.vehicleContext      = config.vehicleContext || {};
      this.onOperationSelected = config.onOperationSelected || null;

      this._state = {
        activeCat:    'all',
        search:       '',
        selectedOps:  [],
        sheetOp:      null,
      };
    }

    init() {
      this._injectStyles();
      this._render();
      this._bindEvents();
      // Auto-add defaults
      allOps().filter(o => o.isDefault).forEach(o => this._addOp(o, true));
    }

    // ── Private ──

    _injectStyles() {
      if (document.getElementById('spg-mw-styles')) return;
      const s = document.createElement('style');
      s.id = 'spg-mw-styles';
      s.textContent = STYLES;
      document.head.appendChild(s);
    }

    _render() {
      const v = this.vehicleContext;
      const vehicleLabel = [v.year, v.make, v.model, v.trim, v.engine].filter(Boolean).join(' ');
      this.el.innerHTML = `
        <div class="spg-mw">
          <div class="spg-mw-header">
            ${vehicleLabel ? `<div class="spg-mw-veh">${esc(vehicleLabel)}</div>` : ''}
            <div class="spg-mw-search-wrap">
              <span class="spg-mw-search-icon">🔍</span>
              <input class="spg-mw-search" type="text" placeholder="Search services…" autocomplete="off" />
            </div>
            <div class="spg-mw-cats">
              <button class="spg-mw-cat-pill active" data-cat="all">All</button>
              ${CATEGORIES.map(c => `<button class="spg-mw-cat-pill" data-cat="${c.id}">${esc(c.name)}</button>`).join('')}
            </div>
          </div>
          <div class="spg-mw-body"></div>
          <div class="spg-mw-selected">
            <div class="spg-mw-sel-hdr">
              <span>Added Services</span>
              <span class="spg-mw-sel-total"></span>
            </div>
            <div class="spg-mw-sel-list"><p class="spg-mw-no-sel">None selected</p></div>
          </div>
        </div>`;
      this._updateCards();
    }

    _bindEvents() {
      // Search
      this.el.querySelector('.spg-mw-search').addEventListener('input', e => {
        this._state.search = e.target.value;
        this._updateCards();
      });

      // Category pills
      this.el.querySelector('.spg-mw-cats').addEventListener('click', e => {
        const pill = e.target.closest('.spg-mw-cat-pill');
        if (!pill) return;
        this._state.activeCat = pill.dataset.cat;
        this._state.search = '';
        this.el.querySelector('.spg-mw-search').value = '';
        this.el.querySelectorAll('.spg-mw-cat-pill').forEach(p => p.classList.toggle('active', p === pill));
        this._updateCards();
      });

      // Card buttons
      this.el.querySelector('.spg-mw-body').addEventListener('click', e => {
        const btn = e.target.closest('.spg-mw-card-btn');
        if (btn) {
          e.stopPropagation();
          const op = this._findOp(btn.dataset.op);
          if (!op) return;
          const selected = this._state.selectedOps.some(s => s.id === op.id);
          selected ? this._removeOp(op.id) : this._addOp(op);
          return;
        }
        const card = e.target.closest('.spg-mw-card');
        if (card) {
          const op = this._findOp(card.dataset.op);
          if (op) this._openSheet(op);
        }
      });

      // Sheet: add / close
      document.addEventListener('click', e => {
        const addBtn = e.target.closest('[data-sheet-add]');
        if (addBtn) {
          const op = this._findOp(addBtn.dataset.sheetAdd);
          if (op) { this._addOp(op); this._closeSheet(); }
          return;
        }
        const closeBtn = e.target.closest('[data-sheet-close]');
        if (closeBtn) { this._closeSheet(); return; }
        // Click backdrop
        if (e.target.classList.contains('spg-mw-overlay')) this._closeSheet();
      });

      // Selected list remove
      this.el.querySelector('.spg-mw-sel-list').addEventListener('click', e => {
        const btn = e.target.closest('.spg-mw-sel-rm');
        if (btn) this._removeOp(btn.dataset.rm);
      });
    }

    _visibleOps() {
      const term = this._state.search.toLowerCase().trim();
      const catId = this._state.activeCat;

      let ops = allOps();
      if (catId !== 'all') ops = ops.filter(o => {
        const cat = CATEGORIES.find(c => c.id === catId);
        return cat?.operations.some(co => co.id === o.id);
      });
      if (term) ops = ops.filter(o =>
        o.name.toLowerCase().includes(term) ||
        o.opcode.toLowerCase().includes(term) ||
        o.categoryName.toLowerCase().includes(term)
      );
      return ops;
    }

    _updateCards() {
      const body = this.el.querySelector('.spg-mw-body');
      const term = this._state.search.toLowerCase().trim();
      const catId = this._state.activeCat;

      if (term) {
        // Flat search results
        const ops = this._visibleOps();
        if (ops.length === 0) {
          body.innerHTML = `<div class="spg-mw-no-results">No services match "<strong>${esc(term)}</strong>"</div>`;
          return;
        }
        body.innerHTML = `
          <div class="spg-mw-cat-label">Search Results</div>
          <div class="spg-mw-cards-row">${ops.map(op => this._card(op)).join('')}</div>`;
        return;
      }

      // Category view
      const cats = catId === 'all' ? CATEGORIES : CATEGORIES.filter(c => c.id === catId);
      body.innerHTML = cats.map(cat => `
        <div class="spg-mw-cat-label">${esc(cat.name)}</div>
        <div class="spg-mw-cards-row">
          ${cat.operations.map(op => this._card(op)).join('')}
        </div>`).join('');
    }

    _card(op) {
      const selected = this._state.selectedOps.some(s => s.id === op.id);
      const p = calcPricing(op);
      return `
        <div class="spg-mw-card${selected ? ' selected' : ''}" data-op="${op.id}">
          ${op.isDefault ? '<span class="spg-mw-card-default">Default</span>' : ''}
          <div class="spg-mw-card-name">${esc(op.name)}</div>
          <div class="spg-mw-card-opcode">${esc(op.opcode)}</div>
          <div class="spg-mw-card-price">${fmt$(p.total)}</div>
          <button class="spg-mw-card-btn ${selected ? 'remove' : 'add'}" data-op="${op.id}">
            ${selected ? '✓ Added' : '+ Add'}
          </button>
        </div>`;
    }

    _openSheet(op) {
      this._state.sheetOp = op;
      const p = calcPricing(op);
      const lt = LABOR_TYPES.find(l => l.id === op.laborTypeId) || LABOR_TYPES[0];
      const selected = this._state.selectedOps.some(s => s.id === op.id);

      const overlay = document.createElement('div');
      overlay.className = 'spg-mw-overlay';
      overlay.id = 'spg-mw-sheet-overlay';
      overlay.innerHTML = `
        <div class="spg-mw-sheet">
          <div class="spg-mw-sheet-drag"></div>
          <div class="spg-mw-sheet-header">
            <div class="spg-mw-sheet-name">${esc(op.name)}</div>
            <span class="spg-mw-sheet-opcode">${esc(op.opcode)}</span>
          </div>
          <div class="spg-mw-sheet-body">
            <div class="spg-mw-sheet-row"><span class="spg-mw-sheet-lbl">Labor Type</span><span class="spg-mw-sheet-val">${esc(lt.name)}</span></div>
            <div class="spg-mw-sheet-row"><span class="spg-mw-sheet-lbl">Labor Hours</span><span class="spg-mw-sheet-val">${op.laborHours} hrs</span></div>
            <div class="spg-mw-sheet-row"><span class="spg-mw-sheet-lbl">Labor Rate</span><span class="spg-mw-sheet-val">${fmt$(lt.rate)}/hr</span></div>
            <div class="spg-mw-sheet-row"><span class="spg-mw-sheet-lbl">Labor Total</span><span class="spg-mw-sheet-val">${fmt$(p.laborCost)}</span></div>
            ${op.parts.map(pt => `<div class="spg-mw-sheet-row"><span class="spg-mw-sheet-lbl">${esc(pt.name)} × ${pt.qty}</span><span class="spg-mw-sheet-val">${fmt$(pt.price * pt.qty)}</span></div>`).join('')}
            ${op.parts.length ? `<div class="spg-mw-sheet-row"><span class="spg-mw-sheet-lbl">Parts Total</span><span class="spg-mw-sheet-val">${fmt$(p.partsCost)}</span></div>` : ''}
          </div>
          <div class="spg-mw-sheet-total">
            <span class="spg-mw-sheet-total-lbl">Total</span>
            <span class="spg-mw-sheet-total-val">${fmt$(p.total)}</span>
          </div>
          <div class="spg-mw-sheet-actions">
            ${!selected
              ? `<button class="spg-mw-sheet-add" data-sheet-add="${op.id}">Add Service</button>`
              : `<button class="spg-mw-sheet-add" style="background:#fee2e2;color:#dc2626" data-sheet-add="${op.id}">Remove Service</button>`}
            <button class="spg-mw-sheet-close" data-sheet-close>Cancel</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
    }

    _closeSheet() {
      const overlay = document.getElementById('spg-mw-sheet-overlay');
      if (overlay) overlay.remove();
      this._state.sheetOp = null;
    }

    _addOp(op, silent = false) {
      if (!this._state.selectedOps.some(s => s.id === op.id)) {
        this._state.selectedOps.push({ ...op, _pricing: calcPricing(op) });
      }
      this._updateCards();
      this._updateSelected();
      if (!silent) this._emit();
    }

    _removeOp(opId) {
      this._state.selectedOps = this._state.selectedOps.filter(s => s.id !== opId);
      this._updateCards();
      this._updateSelected();
      this._emit();
    }

    _updateSelected() {
      const ops = this._state.selectedOps;
      const list = this.el.querySelector('.spg-mw-sel-list');
      const totalEl = this.el.querySelector('.spg-mw-sel-total');
      const grandTotal = ops.reduce((s, o) => s + o._pricing.total, 0);
      totalEl.textContent = ops.length ? `Total: ${fmt$(r2(grandTotal))}` : '';
      if (ops.length === 0) {
        list.innerHTML = '<p class="spg-mw-no-sel">None selected</p>';
        return;
      }
      list.innerHTML = ops.map(o => `
        <div class="spg-mw-sel-item">
          <span class="spg-mw-sel-name">${esc(o.name)}</span>
          <span class="spg-mw-sel-price">${fmt$(o._pricing.total)}</span>
          <button class="spg-mw-sel-rm" data-rm="${o.id}" title="Remove">×</button>
        </div>`).join('');
    }

    _emit() {
      const payload = this._state.selectedOps.map(o => ({
        operationId:   o.id,
        operationName: o.name,
        opcode:        o.opcode,
        laborTypeId:   o.laborTypeId,
        laborHours:    o.laborHours,
        laborRate:     o._pricing.laborRate,
        laborCost:     o._pricing.laborCost,
        parts:         o.parts,
        partsCost:     o._pricing.partsCost,
        totalPrice:    o._pricing.total,
        isDefault:     o.isDefault,
      }));
      if (this.onOperationSelected) this.onOperationSelected(payload);
      this.el.dispatchEvent(new CustomEvent('spg:operations-changed', { detail: { operations: payload }, bubbles: true }));
    }

    _findOp(id) {
      return allOps().find(o => o.id === id) || null;
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────────

  global.SPGMobileWidget = {
    init(config) {
      const w = new SPGMobileWidget(config);
      w.init();
      return w;
    },
  };

})(window);
