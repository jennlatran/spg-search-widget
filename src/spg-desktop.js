/**
 * SPG Search Widget — Desktop / Web Scheduler Variant
 *
 * Embed:
 *   <div id="spg"></div>
 *   <script src="spg-desktop.js"></script>
 *   <script>
 *     SPGDesktopWidget.init({
 *       container: '#spg',
 *       vehicleContext: { year: 2022, make: 'Toyota', model: 'Camry', trim: 'XSE', engine: '2.5L' },
 *       multiSelect: true,
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
        { id: 'op-brk-f',     name: 'Brake Pad Replacement – Front',  opcode: 'BRK-PAD-F',   laborHours: 1.5, laborTypeId: 'standard', parts: [{ id:'p7',  name:'Front Brake Pad Set',       price:64.99, qty:1 }], totalPrice: 207.49, isDefault: false },
        { id: 'op-brk-r',     name: 'Brake Pad Replacement – Rear',   opcode: 'BRK-PAD-R',   laborHours: 1.5, laborTypeId: 'standard', parts: [{ id:'p8',  name:'Rear Brake Pad Set',        price:54.99, qty:1 }], totalPrice: 197.49, isDefault: false },
        { id: 'op-rotor',     name: 'Brake Rotor Replacement – Front', opcode: 'BRK-ROTOR-F', laborHours: 2.0, laborTypeId: 'standard', parts: [{ id:'p9',  name:'Front Rotor (ea)',          price:79.99, qty:2 }], totalPrice: 254.98, isDefault: false },
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
      id: 'engine', name: 'Engine & Performance',
      operations: [
        { id: 'op-spark',   name: 'Spark Plug Replacement',           opcode: 'ENG-SPARK',   laborHours: 1.5, laborTypeId: 'standard', parts: [{ id:'p12', name:'Iridium Spark Plug',        price:14.99, qty:4 }], totalPrice: 202.46, isDefault: false },
        { id: 'op-air-flt', name: 'Engine Air Filter Replacement',    opcode: 'ENG-AIR',     laborHours: 0.3, laborTypeId: 'standard', parts: [{ id:'p13', name:'Engine Air Filter',         price:24.99, qty:1 }], totalPrice:  53.49, isDefault: false },
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
        { id: 'op-cab-flt', name: 'Cabin Air Filter Replacement',     opcode: 'HVAC-CAB',    laborHours: 0.3, laborTypeId: 'standard', parts: [{ id:'p18', name:'Cabin Air Filter',         price:19.99, qty:1 }], totalPrice:  48.49, isDefault: true  },
      ],
    },
  ];

  // ─── Utilities ────────────────────────────────────────────────────────────────

  const r2 = n => Math.round(n * 100) / 100;
  const fmt$ = n => '$' + Number(n).toFixed(2);
  const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  function calcPricing(op, override) {
    const ov = override || {};
    const ltId = ov.laborTypeId || op.laborTypeId;
    const lt = LABOR_TYPES.find(l => l.id === ltId) || LABOR_TYPES[0];
    const laborHours = ov.laborHours !== undefined ? ov.laborHours : op.laborHours;
    const laborRate  = ov.laborRate  !== undefined ? ov.laborRate  : lt.rate;
    const parts      = ov.parts || op.parts;
    const laborCost  = r2(laborHours * laborRate);
    const partsCost  = r2(parts.reduce((s, p) => s + p.price * p.qty, 0));
    return { ltId, laborHours, laborRate, laborCost, partsCost, parts, total: r2(laborCost + partsCost) };
  }

  // ─── Styles ───────────────────────────────────────────────────────────────────

  const STYLES = `
.spg-dw *{box-sizing:border-box;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;margin:0;padding:0}
.spg-dw{display:flex;flex-direction:column;height:600px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.08)}
.spg-dw-header{padding:12px 16px;background:#1e3a8a;color:#fff;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.spg-dw-title{font-size:15px;font-weight:700;letter-spacing:.01em}
.spg-dw-vehicle{font-size:12px;background:rgba(255,255,255,.18);padding:3px 10px;border-radius:20px;opacity:.95}
.spg-dw-body{display:flex;flex:1;overflow:hidden}
.spg-dw-left{width:340px;min-width:240px;display:flex;flex-direction:column;border-right:1px solid #e2e8f0;flex-shrink:0}
.spg-dw-right{flex:1;overflow-y:auto;background:#fafafa}
.spg-dw-search-wrap{padding:10px;border-bottom:1px solid #f1f5f9;flex-shrink:0}
.spg-dw-search{width:100%;padding:8px 10px 8px 32px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;outline:none;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E") no-repeat 10px center}
.spg-dw-search:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.12)}
.spg-dw-tree{flex:1;overflow-y:auto}
.spg-dw-cat{border-bottom:1px solid #f1f5f9}
.spg-dw-cat-hdr{display:flex;align-items:center;gap:6px;padding:9px 12px;cursor:pointer;user-select:none;transition:background .15s}
.spg-dw-cat-hdr:hover{background:#f8fafc}
.spg-dw-caret{font-size:9px;color:#94a3b8;width:12px;flex-shrink:0;transition:transform .15s}
.spg-dw-caret.open{transform:rotate(90deg)}
.spg-dw-cat-name{font-size:13px;font-weight:600;color:#1e293b;flex:1}
.spg-dw-badge{font-size:11px;padding:1px 7px;border-radius:10px;background:#f1f5f9;color:#64748b}
.spg-dw-badge.match{background:#dbeafe;color:#1d4ed8}
.spg-dw-ops{overflow:hidden}
.spg-dw-op{display:flex;align-items:center;gap:8px;padding:8px 12px 8px 30px;cursor:pointer;border-bottom:1px solid #f8fafc;transition:background .1s}
.spg-dw-op:hover{background:#f0f9ff}
.spg-dw-op.focused{background:#eff6ff;border-left:3px solid #3b82f6;padding-left:27px}
.spg-dw-op.selected .spg-dw-op-name{color:#1d4ed8;font-weight:500}
.spg-dw-chk{flex-shrink:0;accent-color:#2563eb;width:14px;height:14px;cursor:pointer}
.spg-dw-op-meta{flex:1;min-width:0}
.spg-dw-op-name{display:block;font-size:13px;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.spg-dw-op-code{display:block;font-size:11px;color:#94a3b8;font-family:monospace}
.spg-dw-op-price{font-size:13px;font-weight:600;color:#059669;flex-shrink:0}
.spg-dw-no-results{padding:24px;text-align:center;color:#94a3b8;font-size:13px}
/* Pricing panel */
.spg-dw-empty-panel{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#94a3b8;padding:32px}
.spg-dw-empty-icon{font-size:48px}
.spg-dw-empty-panel p{font-size:14px;text-align:center;line-height:1.5}
.spg-dw-pricing{padding:20px}
.spg-dw-ph{margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid #e2e8f0}
.spg-dw-ph h3{font-size:17px;color:#111827;font-weight:700;margin-bottom:6px}
.spg-dw-opcode-tag{display:inline-block;font-size:11px;color:#6b7280;font-family:monospace;background:#f3f4f6;padding:2px 8px;border-radius:4px}
.spg-dw-section{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px;margin-bottom:12px}
.spg-dw-section-title{font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px}
.spg-dw-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
.spg-dw-row:last-child{margin-bottom:0}
.spg-dw-lbl{font-size:13px;color:#6b7280;flex-shrink:0}
.spg-dw-sel,.spg-dw-inp{font-size:13px;padding:6px 8px;border:1px solid #e2e8f0;border-radius:5px;outline:none;background:#fff;color:#111827}
.spg-dw-sel:focus,.spg-dw-inp:focus{border-color:#3b82f6;box-shadow:0 0 0 2px rgba(59,130,246,.12)}
.spg-dw-inp{width:110px;text-align:right}
.spg-dw-subtotal-row{display:flex;justify-content:space-between;font-size:13px;padding-top:10px;margin-top:10px;border-top:1px solid #f1f5f9;font-weight:600;color:#374151}
.spg-dw-no-parts{font-size:13px;color:#94a3b8;font-style:italic;margin-bottom:8px}
.spg-dw-part{display:flex;justify-content:space-between;font-size:13px;padding:5px 0;border-bottom:1px solid #f8fafc;color:#374151}
.spg-dw-part:last-child{border-bottom:none}
.spg-dw-total-row{display:flex;justify-content:space-between;align-items:center;padding:14px 0;border-top:2px solid #e2e8f0;margin-bottom:14px}
.spg-dw-total-lbl{font-size:15px;font-weight:700;color:#111827}
.spg-dw-total-val{font-size:22px;font-weight:800;color:#059669}
.spg-dw-add-btn{display:block;width:100%;padding:10px;background:#2563eb;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer;transition:background .15s}
.spg-dw-add-btn:hover{background:#1d4ed8}
.spg-dw-add-btn.remove{background:#fee2e2;color:#dc2626}
.spg-dw-add-btn.remove:hover{background:#fecaca}
/* Footer */
.spg-dw-footer{border-top:1px solid #e2e8f0;padding:10px 14px;background:#f8fafc;flex-shrink:0;max-height:110px;overflow-y:auto}
.spg-dw-no-sel{font-size:13px;color:#94a3b8}
.spg-dw-sel-hdr{display:flex;justify-content:space-between;font-size:12px;font-weight:700;color:#374151;margin-bottom:7px;text-transform:uppercase;letter-spacing:.04em}
.spg-dw-grand-total{color:#059669}
.spg-dw-chips{display:flex;flex-wrap:wrap;gap:5px}
.spg-dw-chip{display:flex;align-items:center;gap:5px;background:#dbeafe;border:1px solid #93c5fd;border-radius:20px;padding:3px 8px 3px 10px;font-size:12px}
.spg-dw-chip-name{color:#1e40af;font-weight:500}
.spg-dw-chip-price{color:#1d4ed8}
.spg-dw-chip-rm{background:none;border:none;cursor:pointer;color:#94a3b8;font-size:15px;line-height:1;padding:0 1px;transition:color .1s}
.spg-dw-chip-rm:hover{color:#dc2626}
`;

  // ─── Widget Class ─────────────────────────────────────────────────────────────

  class SPGDesktopWidget {
    constructor(config) {
      this.el = typeof config.container === 'string'
        ? document.querySelector(config.container)
        : config.container;
      this.vehicleContext      = config.vehicleContext || {};
      this.multiSelect         = config.multiSelect !== false;
      this.onOperationSelected = config.onOperationSelected || null;

      this._state = {
        expandedCats: new Set(),
        selectedOps: [],   // [{ op, override, pricing }]
        focusedOp:   null,
        search:      '',
        overrides:   {},   // { [opId]: { laborTypeId?, laborHours?, laborRate? } }
      };
    }

    init() {
      this._injectStyles();
      this._render();
      this._bindEvents();
    }

    // ── Private ──

    _injectStyles() {
      if (document.getElementById('spg-dw-styles')) return;
      const s = document.createElement('style');
      s.id = 'spg-dw-styles';
      s.textContent = STYLES;
      document.head.appendChild(s);
    }

    _render() {
      const v = this.vehicleContext;
      const vehicleLabel = [v.year, v.make, v.model, v.trim, v.engine].filter(Boolean).join(' ');
      this.el.innerHTML = `
        <div class="spg-dw">
          <div class="spg-dw-header">
            <span class="spg-dw-title">Service Operations</span>
            ${vehicleLabel ? `<span class="spg-dw-vehicle">${esc(vehicleLabel)}</span>` : ''}
          </div>
          <div class="spg-dw-body">
            <div class="spg-dw-left">
              <div class="spg-dw-search-wrap">
                <input class="spg-dw-search" type="text" placeholder="Search by name, category, or opcode…" autocomplete="off" />
              </div>
              <div class="spg-dw-tree"></div>
            </div>
            <div class="spg-dw-right">
              <div class="spg-dw-pricing-panel">${this._emptyPanel()}</div>
            </div>
          </div>
          <div class="spg-dw-footer">
            <div class="spg-dw-no-sel">No operations selected</div>
          </div>
        </div>`;
      this._updateTree();
    }

    _bindEvents() {
      // Search
      this.el.querySelector('.spg-dw-search').addEventListener('input', e => {
        this._state.search = e.target.value;
        this._updateTree();
      });

      // Category toggle + operation focus (click row, not checkbox)
      this.el.querySelector('.spg-dw-tree').addEventListener('click', e => {
        const hdr = e.target.closest('.spg-dw-cat-hdr');
        if (hdr) {
          const catId = hdr.dataset.cat;
          this._state.expandedCats[this._state.expandedCats.has(catId) ? 'delete' : 'add'](catId);
          this._updateTree();
          return;
        }
        const opEl = e.target.closest('.spg-dw-op');
        if (opEl && !e.target.classList.contains('spg-dw-chk')) {
          const op = this._findOp(opEl.dataset.op);
          if (op) this._focusOp(op);
        }
      });

      // Checkbox toggle
      this.el.querySelector('.spg-dw-tree').addEventListener('change', e => {
        if (!e.target.classList.contains('spg-dw-chk')) return;
        const op = this._findOp(e.target.dataset.op);
        if (!op) return;
        e.target.checked ? this._addOp(op) : this._removeOp(op.id);
      });

      // Pricing panel inputs (delegated)
      const rightPanel = this.el.querySelector('.spg-dw-right');
      rightPanel.addEventListener('change', e => {
        const { op: opId, field } = e.target.dataset;
        if (opId && field) this._applyOverride(opId, field, e.target.value);
      });
      rightPanel.addEventListener('input', e => {
        const { op: opId, field } = e.target.dataset;
        if (opId && field && field !== 'laborType') this._applyOverride(opId, field, e.target.value);
      });
      rightPanel.addEventListener('click', e => {
        const btn = e.target.closest('.spg-dw-add-btn');
        if (!btn) return;
        const op = this._findOp(btn.dataset.op);
        if (!op) return;
        const already = this._state.selectedOps.some(s => s.op.id === op.id);
        already ? this._removeOp(op.id) : this._addOp(op);
        this._updatePricingPanel(op);
      });

      // Footer chip remove
      this.el.querySelector('.spg-dw-footer').addEventListener('click', e => {
        const btn = e.target.closest('.spg-dw-chip-rm');
        if (btn) this._removeOp(btn.dataset.rm);
      });
    }

    _updateTree() {
      const term = this._state.search.toLowerCase().trim();
      let html = '';

      for (const cat of CATEGORIES) {
        const ops = term
          ? cat.operations.filter(o =>
              o.name.toLowerCase().includes(term) ||
              o.opcode.toLowerCase().includes(term) ||
              cat.name.toLowerCase().includes(term))
          : cat.operations;

        if (term && ops.length === 0) continue;

        const expanded = term || this._state.expandedCats.has(cat.id);
        html += `
          <div class="spg-dw-cat">
            <div class="spg-dw-cat-hdr" data-cat="${cat.id}">
              <span class="spg-dw-caret ${expanded ? 'open' : ''}">▶</span>
              <span class="spg-dw-cat-name">${esc(cat.name)}</span>
              <span class="spg-dw-badge ${term ? 'match' : ''}">${ops.length}</span>
            </div>
            <div class="spg-dw-ops" ${expanded ? '' : 'style="display:none"'}>
              ${ops.map(op => this._opRow(op)).join('')}
            </div>
          </div>`;
      }

      if (!html) {
        html = `<div class="spg-dw-no-results">No operations match "<strong>${esc(term)}</strong>"</div>`;
      }

      this.el.querySelector('.spg-dw-tree').innerHTML = html;
    }

    _opRow(op) {
      const selected = this._state.selectedOps.some(s => s.op.id === op.id);
      const focused  = this._state.focusedOp?.id === op.id;
      const pricing  = calcPricing(op, this._state.overrides[op.id]);
      return `
        <div class="spg-dw-op${selected ? ' selected' : ''}${focused ? ' focused' : ''}" data-op="${op.id}">
          ${this.multiSelect ? `<input class="spg-dw-chk" type="checkbox" data-op="${op.id}" ${selected ? 'checked' : ''} />` : ''}
          <div class="spg-dw-op-meta">
            <span class="spg-dw-op-name">${esc(op.name)}</span>
            <span class="spg-dw-op-code">${esc(op.opcode)}</span>
          </div>
          <span class="spg-dw-op-price">${fmt$(pricing.total)}</span>
        </div>`;
    }

    _focusOp(op) {
      this._state.focusedOp = op;
      this._updatePricingPanel(op);
      this._updateTree();
    }

    _updatePricingPanel(op) {
      this.el.querySelector('.spg-dw-pricing-panel').innerHTML = op
        ? this._pricingPanel(op)
        : this._emptyPanel();
    }

    _pricingPanel(op) {
      const ov = this._state.overrides[op.id] || {};
      const p  = calcPricing(op, ov);
      const ltId = p.ltId;
      const selected = this._state.selectedOps.some(s => s.op.id === op.id);

      return `
        <div class="spg-dw-pricing">
          <div class="spg-dw-ph">
            <h3>${esc(op.name)}</h3>
            <span class="spg-dw-opcode-tag">${esc(op.opcode)}</span>
          </div>

          <div class="spg-dw-section">
            <div class="spg-dw-section-title">Labor</div>
            <div class="spg-dw-row">
              <label class="spg-dw-lbl">Labor Type</label>
              <select class="spg-dw-sel" data-op="${op.id}" data-field="laborType">
                ${LABOR_TYPES.map(lt => `<option value="${lt.id}" ${lt.id === ltId ? 'selected' : ''}>${esc(lt.name)} (${fmt$(lt.rate)}/hr)</option>`).join('')}
              </select>
            </div>
            <div class="spg-dw-row">
              <label class="spg-dw-lbl">Labor Hours</label>
              <input class="spg-dw-inp" type="number" step="0.1" min="0" value="${p.laborHours}" data-op="${op.id}" data-field="laborHours" />
            </div>
            <div class="spg-dw-row">
              <label class="spg-dw-lbl">Labor Rate ($/hr)</label>
              <input class="spg-dw-inp" type="number" step="0.01" min="0" value="${p.laborRate}" data-op="${op.id}" data-field="laborRate" />
            </div>
            <div class="spg-dw-subtotal-row">
              <span>Labor Total</span><span>${fmt$(p.laborCost)}</span>
            </div>
          </div>

          <div class="spg-dw-section">
            <div class="spg-dw-section-title">Parts</div>
            ${p.parts.length === 0
              ? '<p class="spg-dw-no-parts">No parts required</p>'
              : p.parts.map(pt => `<div class="spg-dw-part"><span>${esc(pt.name)} × ${pt.qty}</span><span>${fmt$(pt.price * pt.qty)}</span></div>`).join('')}
            <div class="spg-dw-subtotal-row">
              <span>Parts Total</span><span>${fmt$(p.partsCost)}</span>
            </div>
          </div>

          <div class="spg-dw-total-row">
            <span class="spg-dw-total-lbl">Total</span>
            <span class="spg-dw-total-val">${fmt$(p.total)}</span>
          </div>

          <button class="spg-dw-add-btn${selected ? ' remove' : ''}" data-op="${op.id}">
            ${selected ? '✓ Remove from Selection' : '+ Add to Selection'}
          </button>
        </div>`;
    }

    _emptyPanel() {
      return `
        <div class="spg-dw-empty-panel">
          <span class="spg-dw-empty-icon">🔧</span>
          <p>Select an operation from the list<br>to view pricing details</p>
        </div>`;
    }

    _updateFooter() {
      const footer = this.el.querySelector('.spg-dw-footer');
      const ops = this._state.selectedOps;
      if (ops.length === 0) {
        footer.innerHTML = '<div class="spg-dw-no-sel">No operations selected</div>';
        return;
      }
      const grandTotal = ops.reduce((s, item) => s + item.pricing.total, 0);
      footer.innerHTML = `
        <div class="spg-dw-sel-hdr">
          <span>Selected (${ops.length})</span>
          <span class="spg-dw-grand-total">Grand Total: ${fmt$(r2(grandTotal))}</span>
        </div>
        <div class="spg-dw-chips">
          ${ops.map(item => `
            <div class="spg-dw-chip">
              <span class="spg-dw-chip-name">${esc(item.op.name)}</span>
              <span class="spg-dw-chip-price">${fmt$(item.pricing.total)}</span>
              <button class="spg-dw-chip-rm" data-rm="${item.op.id}" title="Remove">×</button>
            </div>`).join('')}
        </div>`;
    }

    _addOp(op) {
      const pricing = calcPricing(op, this._state.overrides[op.id]);
      const idx = this._state.selectedOps.findIndex(s => s.op.id === op.id);
      const entry = { op, pricing };
      if (idx >= 0) {
        this._state.selectedOps[idx] = entry;
      } else {
        this._state.selectedOps.push(entry);
      }
      this._updateTree();
      this._updateFooter();
      this._emit();
    }

    _removeOp(opId) {
      this._state.selectedOps = this._state.selectedOps.filter(s => s.op.id !== opId);
      if (this._state.focusedOp?.id === opId) this._updatePricingPanel(this._state.focusedOp);
      this._updateTree();
      this._updateFooter();
      this._emit();
    }

    _applyOverride(opId, field, raw) {
      const ov = this._state.overrides[opId] || {};
      if (field === 'laborType') {
        ov.laborTypeId = raw;
        const lt = LABOR_TYPES.find(l => l.id === raw);
        // Only auto-update rate if it hasn't been manually overridden
        if (lt && ov.laborRate === undefined) {
          // rate follows type until user manually edits it
        }
      } else if (field === 'laborHours') {
        ov.laborHours = parseFloat(raw) || 0;
      } else if (field === 'laborRate') {
        ov.laborRate = parseFloat(raw) || 0;
      }
      this._state.overrides[opId] = ov;

      const op = this._findOp(opId);
      if (!op) return;
      // Refresh panel without losing focus
      this._updatePricingPanel(op);
      // If this op is already selected, update its pricing
      if (this._state.selectedOps.some(s => s.op.id === opId)) {
        this._addOp(op);
      }
    }

    _emit() {
      const payload = this._state.selectedOps.map(({ op, pricing }) => ({
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
      if (this.onOperationSelected) this.onOperationSelected(payload);
      this.el.dispatchEvent(new CustomEvent('spg:operations-changed', { detail: { operations: payload }, bubbles: true }));
    }

    _findOp(id) {
      for (const cat of CATEGORIES) {
        const op = cat.operations.find(o => o.id === id);
        if (op) return op;
      }
      return null;
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────────

  global.SPGDesktopWidget = {
    init(config) {
      const w = new SPGDesktopWidget(config);
      w.init();
      return w;
    },
  };

})(window);
