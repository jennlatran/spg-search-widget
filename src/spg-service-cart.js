/**
 * SPG Search Widget — ServiceCart Variant
 *
 * Dropdown search with a cart-style list of selected operations.
 * Supports manual price overrides for labor hours, rate, and parts.
 * Supersedes existing ServiceCart opcode behavior.
 *
 * Embed:
 *   <div id="spg-cart"></div>
 *   <script src="spg-service-cart.js"></script>
 *   <script>
 *     SPGServiceCartWidget.init({
 *       container: '#spg-cart',
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

  const r2   = n => Math.round(n * 100) / 100;
  const fmt$ = n => '$' + Number(n).toFixed(2);
  const esc  = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  function allOps() {
    return CATEGORIES.flatMap(c => c.operations.map(o => ({ ...o, categoryName: c.name })));
  }

  function getCartPricing(cartItem) {
    const ltId       = cartItem.laborTypeId;
    const lt         = LABOR_TYPES.find(l => l.id === ltId) || LABOR_TYPES[0];
    const laborHours = cartItem.laborHours;
    const laborRate  = cartItem.laborRate;
    const parts      = cartItem.parts;
    const laborCost  = r2(laborHours * laborRate);
    const partsCost  = r2(parts.reduce((s, p) => s + p.price * p.qty, 0));
    return { lt, laborCost, partsCost, total: r2(laborCost + partsCost) };
  }

  function opToCartItem(op) {
    const lt = LABOR_TYPES.find(l => l.id === op.laborTypeId) || LABOR_TYPES[0];
    return {
      id:          op.id,
      name:        op.name,
      opcode:      op.opcode,
      laborTypeId: lt.id,
      laborHours:  op.laborHours,
      laborRate:   lt.rate,
      parts:       op.parts.map(p => ({ ...p })),
      expanded:    false,
    };
  }

  // ─── Styles ───────────────────────────────────────────────────────────────────

  const STYLES = `
.spg-cw *{box-sizing:border-box;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;margin:0;padding:0}
.spg-cw{background:#fff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.07)}
/* Header */
.spg-cw-header{background:#1e3a8a;padding:12px 14px;color:#fff;display:flex;align-items:center;justify-content:space-between}
.spg-cw-title{font-size:15px;font-weight:700}
.spg-cw-veh{font-size:12px;background:rgba(255,255,255,.18);padding:3px 10px;border-radius:20px}
/* Search */
.spg-cw-search-area{padding:12px;border-bottom:1px solid #f1f5f9;position:relative}
.spg-cw-search-row{display:flex;gap:8px;align-items:center}
.spg-cw-search{flex:1;padding:9px 12px 9px 34px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;outline:none;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E") no-repeat 10px center}
.spg-cw-search:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.12)}
/* Dropdown */
.spg-cw-dropdown{position:absolute;left:12px;right:12px;top:calc(100% - 2px);background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;box-shadow:0 6px 18px rgba(0,0,0,.1);z-index:100;max-height:280px;overflow-y:auto;display:none}
.spg-cw-dropdown.open{display:block}
.spg-cw-dd-cat{border-bottom:1px solid #f1f5f9}
.spg-cw-dd-cat-name{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;padding:8px 12px 4px;background:#f8fafc}
.spg-cw-dd-op{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;cursor:pointer;gap:10px;transition:background .1s}
.spg-cw-dd-op:hover{background:#f0f9ff}
.spg-cw-dd-op.disabled{opacity:.4;cursor:not-allowed;background:none}
.spg-cw-dd-op-info{flex:1;min-width:0}
.spg-cw-dd-op-name{font-size:13px;color:#111827}
.spg-cw-dd-op-code{font-size:11px;color:#94a3b8;font-family:monospace}
.spg-cw-dd-op-price{font-size:13px;font-weight:600;color:#059669;flex-shrink:0}
.spg-cw-dd-no-results{padding:16px;text-align:center;color:#94a3b8;font-size:13px}
/* Cart */
.spg-cw-cart{max-height:460px;overflow-y:auto}
.spg-cw-empty{padding:32px;text-align:center;color:#94a3b8;font-size:14px}
.spg-cw-empty-icon{font-size:36px;display:block;margin-bottom:10px}
.spg-cw-item{border-bottom:1px solid #f1f5f9}
.spg-cw-item-hdr{display:flex;align-items:center;padding:12px 14px;gap:10px;cursor:pointer;transition:background .1s}
.spg-cw-item-hdr:hover{background:#f8fafc}
.spg-cw-item-toggle{font-size:10px;color:#94a3b8;width:14px;flex-shrink:0;transition:transform .15s}
.spg-cw-item-toggle.open{transform:rotate(90deg)}
.spg-cw-item-info{flex:1;min-width:0}
.spg-cw-item-name{font-size:14px;font-weight:600;color:#111827;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.spg-cw-item-sub{font-size:12px;color:#6b7280;margin-top:2px}
.spg-cw-item-total{font-size:15px;font-weight:700;color:#059669;flex-shrink:0}
.spg-cw-item-rm{background:none;border:none;cursor:pointer;color:#94a3b8;font-size:18px;line-height:1;padding:0;flex-shrink:0;transition:color .1s}
.spg-cw-item-rm:hover{color:#dc2626}
/* Item detail (expanded) */
.spg-cw-detail{padding:0 14px 14px 38px;display:none}
.spg-cw-detail.open{display:block}
.spg-cw-detail-section{background:#f8fafc;border-radius:7px;padding:12px;margin-bottom:10px}
.spg-cw-detail-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-bottom:10px}
.spg-cw-detail-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:10px}
.spg-cw-detail-row:last-child{margin-bottom:0}
.spg-cw-detail-lbl{font-size:13px;color:#6b7280;flex-shrink:0}
.spg-cw-detail-sel,.spg-cw-detail-inp{font-size:13px;padding:5px 8px;border:1px solid #e2e8f0;border-radius:5px;outline:none;background:#fff;color:#111827}
.spg-cw-detail-sel:focus,.spg-cw-detail-inp:focus{border-color:#3b82f6;box-shadow:0 0 0 2px rgba(59,130,246,.12)}
.spg-cw-detail-inp{width:100px;text-align:right}
.spg-cw-detail-subtotal{display:flex;justify-content:space-between;font-size:13px;padding-top:8px;margin-top:8px;border-top:1px solid #e2e8f0;font-weight:600;color:#374151}
.spg-cw-part-row{display:flex;align-items:center;justify-content:space-between;font-size:13px;padding:5px 0;border-bottom:1px solid #f1f5f9;gap:8px}
.spg-cw-part-row:last-child{border-bottom:none}
.spg-cw-part-name{color:#374151;flex:1}
.spg-cw-part-price-inp{width:80px;text-align:right;font-size:12px;padding:4px 6px;border:1px solid #e2e8f0;border-radius:4px;outline:none;color:#374151}
.spg-cw-part-price-inp:focus{border-color:#3b82f6}
.spg-cw-no-parts{font-size:13px;color:#94a3b8;font-style:italic;padding:4px 0}
/* Footer */
.spg-cw-footer{padding:12px 14px;border-top:2px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:space-between;align-items:center}
.spg-cw-footer-count{font-size:13px;color:#64748b}
.spg-cw-footer-total{font-size:18px;font-weight:800;color:#059669}
`;

  // ─── Widget Class ─────────────────────────────────────────────────────────────

  class SPGServiceCartWidget {
    constructor(config) {
      this.el = typeof config.container === 'string'
        ? document.querySelector(config.container)
        : config.container;
      this.vehicleContext      = config.vehicleContext || {};
      this.onOperationSelected = config.onOperationSelected || null;

      this._state = {
        cart:        [],   // CartItem[]
        search:      '',
        ddOpen:      false,
      };
    }

    init() {
      this._injectStyles();
      this._render();
      this._bindEvents();
    }

    // ── Private ──

    _injectStyles() {
      if (document.getElementById('spg-cw-styles')) return;
      const s = document.createElement('style');
      s.id = 'spg-cw-styles';
      s.textContent = STYLES;
      document.head.appendChild(s);
    }

    _render() {
      const v = this.vehicleContext;
      const vehicleLabel = [v.year, v.make, v.model, v.trim, v.engine].filter(Boolean).join(' ');
      this.el.innerHTML = `
        <div class="spg-cw">
          <div class="spg-cw-header">
            <span class="spg-cw-title">Service Cart</span>
            ${vehicleLabel ? `<span class="spg-cw-veh">${esc(vehicleLabel)}</span>` : ''}
          </div>
          <div class="spg-cw-search-area">
            <div class="spg-cw-search-row">
              <input class="spg-cw-search" type="text" placeholder="Search and add a service…" autocomplete="off" />
            </div>
            <div class="spg-cw-dropdown"></div>
          </div>
          <div class="spg-cw-cart"></div>
          <div class="spg-cw-footer">
            <span class="spg-cw-footer-count">0 items</span>
            <span class="spg-cw-footer-total">$0.00</span>
          </div>
        </div>`;
      this._updateCart();
    }

    _bindEvents() {
      const searchInput = this.el.querySelector('.spg-cw-search');
      const dropdown    = this.el.querySelector('.spg-cw-dropdown');

      searchInput.addEventListener('input', e => {
        this._state.search = e.target.value;
        this._updateDropdown();
        dropdown.classList.toggle('open', e.target.value.trim().length > 0);
      });

      searchInput.addEventListener('focus', () => {
        if (this._state.search.trim()) {
          dropdown.classList.add('open');
        }
      });

      // Close dropdown on outside click
      document.addEventListener('click', e => {
        if (!this.el.contains(e.target)) {
          dropdown.classList.remove('open');
        }
      });

      // Dropdown op selection
      dropdown.addEventListener('click', e => {
        const opEl = e.target.closest('.spg-cw-dd-op:not(.disabled)');
        if (!opEl) return;
        const op = this._findOp(opEl.dataset.op);
        if (op) {
          this._addToCart(op);
          searchInput.value = '';
          this._state.search = '';
          dropdown.classList.remove('open');
        }
      });

      // Cart interactions (delegated)
      this.el.querySelector('.spg-cw-cart').addEventListener('click', e => {
        // Remove button
        const rmBtn = e.target.closest('.spg-cw-item-rm');
        if (rmBtn) {
          this._removeFromCart(rmBtn.dataset.rm);
          return;
        }
        // Expand/collapse header (but not inputs inside it)
        const hdr = e.target.closest('.spg-cw-item-hdr');
        if (hdr && !e.target.closest('select, input, button')) {
          const itemId = hdr.dataset.item;
          const item = this._state.cart.find(c => c.id === itemId);
          if (item) { item.expanded = !item.expanded; this._updateCart(); }
        }
      });

      // Cart input changes
      this.el.querySelector('.spg-cw-cart').addEventListener('change', e => {
        const { item: itemId, field } = e.target.dataset;
        if (itemId && field) this._updateCartItem(itemId, field, e.target.value, e.target);
      });
      this.el.querySelector('.spg-cw-cart').addEventListener('input', e => {
        const { item: itemId, field } = e.target.dataset;
        if (itemId && field && field !== 'laborType') this._updateCartItem(itemId, field, e.target.value, e.target);
      });
    }

    _updateDropdown() {
      const term = this._state.search.toLowerCase().trim();
      const dropdown = this.el.querySelector('.spg-cw-dropdown');
      if (!term) { dropdown.innerHTML = ''; return; }

      const cartIds = new Set(this._state.cart.map(c => c.id));
      let html = '';
      let totalMatches = 0;

      for (const cat of CATEGORIES) {
        const matches = cat.operations.filter(op =>
          op.name.toLowerCase().includes(term) ||
          op.opcode.toLowerCase().includes(term) ||
          cat.name.toLowerCase().includes(term)
        );
        if (matches.length === 0) continue;
        totalMatches += matches.length;

        html += `
          <div class="spg-cw-dd-cat">
            <div class="spg-cw-dd-cat-name">${esc(cat.name)}</div>
            ${matches.map(op => {
              const lt = LABOR_TYPES.find(l => l.id === op.laborTypeId) || LABOR_TYPES[0];
              const total = r2(op.laborHours * lt.rate + op.parts.reduce((s,p) => s+p.price*p.qty, 0));
              const inCart = cartIds.has(op.id);
              return `
                <div class="spg-cw-dd-op${inCart ? ' disabled' : ''}" data-op="${op.id}" title="${inCart ? 'Already in cart' : ''}">
                  <div class="spg-cw-dd-op-info">
                    <div class="spg-cw-dd-op-name">${esc(op.name)}</div>
                    <div class="spg-cw-dd-op-code">${esc(op.opcode)}</div>
                  </div>
                  <span class="spg-cw-dd-op-price">${inCart ? '✓ Added' : fmt$(total)}</span>
                </div>`;
            }).join('')}
          </div>`;
      }

      dropdown.innerHTML = totalMatches === 0
        ? `<div class="spg-cw-dd-no-results">No operations match "<strong>${esc(term)}</strong>"</div>`
        : html;
    }

    _updateCart() {
      const cartEl = this.el.querySelector('.spg-cw-cart');
      if (this._state.cart.length === 0) {
        cartEl.innerHTML = `
          <div class="spg-cw-empty">
            <span class="spg-cw-empty-icon">🛒</span>
            Search above to add services
          </div>`;
        this._updateFooter();
        return;
      }
      cartEl.innerHTML = this._state.cart.map(item => this._cartItemHTML(item)).join('');
      this._updateFooter();
    }

    _cartItemHTML(item) {
      const p = getCartPricing(item);
      return `
        <div class="spg-cw-item" data-item-id="${item.id}">
          <div class="spg-cw-item-hdr" data-item="${item.id}">
            <span class="spg-cw-item-toggle ${item.expanded ? 'open' : ''}">▶</span>
            <div class="spg-cw-item-info">
              <div class="spg-cw-item-name">${esc(item.name)}</div>
              <div class="spg-cw-item-sub">${esc(item.opcode)} · ${item.laborHours}h @ ${fmt$(item.laborRate)}/hr · ${item.parts.length} part${item.parts.length !== 1 ? 's' : ''}</div>
            </div>
            <span class="spg-cw-item-total">${fmt$(p.total)}</span>
            <button class="spg-cw-item-rm" data-rm="${item.id}" title="Remove">×</button>
          </div>
          <div class="spg-cw-detail ${item.expanded ? 'open' : ''}">
            <div class="spg-cw-detail-section">
              <div class="spg-cw-detail-title">Labor</div>
              <div class="spg-cw-detail-row">
                <label class="spg-cw-detail-lbl">Labor Type</label>
                <select class="spg-cw-detail-sel" data-item="${item.id}" data-field="laborType">
                  ${LABOR_TYPES.map(lt => `<option value="${lt.id}" ${lt.id === item.laborTypeId ? 'selected' : ''}>${esc(lt.name)} (${fmt$(lt.rate)}/hr)</option>`).join('')}
                </select>
              </div>
              <div class="spg-cw-detail-row">
                <label class="spg-cw-detail-lbl">Hours</label>
                <input class="spg-cw-detail-inp" type="number" step="0.1" min="0" value="${item.laborHours}" data-item="${item.id}" data-field="laborHours" />
              </div>
              <div class="spg-cw-detail-row">
                <label class="spg-cw-detail-lbl">Rate ($/hr)</label>
                <input class="spg-cw-detail-inp" type="number" step="0.01" min="0" value="${item.laborRate}" data-item="${item.id}" data-field="laborRate" />
              </div>
              <div class="spg-cw-detail-subtotal">
                <span>Labor Total</span><span>${fmt$(p.laborCost)}</span>
              </div>
            </div>

            <div class="spg-cw-detail-section">
              <div class="spg-cw-detail-title">Parts</div>
              ${item.parts.length === 0
                ? '<p class="spg-cw-no-parts">No parts required</p>'
                : item.parts.map((pt, i) => `
                    <div class="spg-cw-part-row">
                      <span class="spg-cw-part-name">${esc(pt.name)} × ${pt.qty}</span>
                      <input class="spg-cw-part-price-inp" type="number" step="0.01" min="0" value="${pt.price}"
                             data-item="${item.id}" data-field="partPrice" data-part="${i}" title="Unit price" />
                    </div>`).join('')}
              <div class="spg-cw-detail-subtotal">
                <span>Parts Total</span><span>${fmt$(p.partsCost)}</span>
              </div>
            </div>
          </div>
        </div>`;
    }

    _updateFooter() {
      const ops = this._state.cart;
      const total = ops.reduce((s, item) => s + getCartPricing(item).total, 0);
      this.el.querySelector('.spg-cw-footer-count').textContent = `${ops.length} item${ops.length !== 1 ? 's' : ''}`;
      this.el.querySelector('.spg-cw-footer-total').textContent = fmt$(r2(total));
    }

    _addToCart(op) {
      if (this._state.cart.some(c => c.id === op.id)) return;
      const item = opToCartItem(op);
      item.expanded = true; // Expand new items so user can see/edit pricing
      this._state.cart.push(item);
      this._updateCart();
      this._emit();
    }

    _removeFromCart(opId) {
      this._state.cart = this._state.cart.filter(c => c.id !== opId);
      this._updateCart();
      this._updateDropdown();
      this._emit();
    }

    _updateCartItem(itemId, field, rawValue, inputEl) {
      const item = this._state.cart.find(c => c.id === itemId);
      if (!item) return;

      if (field === 'laborType') {
        const lt = LABOR_TYPES.find(l => l.id === rawValue);
        if (lt) {
          item.laborTypeId = lt.id;
          // Update rate to match new labor type unless rate was already manually changed
          item.laborRate = lt.rate;
        }
      } else if (field === 'laborHours') {
        item.laborHours = parseFloat(rawValue) || 0;
      } else if (field === 'laborRate') {
        item.laborRate = parseFloat(rawValue) || 0;
      } else if (field === 'partPrice') {
        const idx = parseInt(inputEl.dataset.part, 10);
        if (item.parts[idx]) item.parts[idx].price = parseFloat(rawValue) || 0;
      }

      // Refresh just this item's DOM without collapsing expanded state
      const itemEl = this.el.querySelector(`[data-item-id="${itemId}"]`);
      if (itemEl) itemEl.outerHTML = this._cartItemHTML(item);
      this._updateFooter();
      this._emit();
    }

    _emit() {
      const payload = this._state.cart.map(item => {
        const p = getCartPricing(item);
        return {
          operationId:   item.id,
          operationName: item.name,
          opcode:        item.opcode,
          laborTypeId:   item.laborTypeId,
          laborHours:    item.laborHours,
          laborRate:     item.laborRate,
          laborCost:     p.laborCost,
          parts:         item.parts,
          partsCost:     p.partsCost,
          totalPrice:    p.total,
        };
      });
      if (this.onOperationSelected) this.onOperationSelected(payload);
      this.el.dispatchEvent(new CustomEvent('spg:operations-changed', { detail: { operations: payload }, bubbles: true }));
    }

    _findOp(id) {
      return allOps().find(o => o.id === id) || null;
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────────

  global.SPGServiceCartWidget = {
    init(config) {
      const w = new SPGServiceCartWidget(config);
      w.init();
      return w;
    },
  };

})(window);
