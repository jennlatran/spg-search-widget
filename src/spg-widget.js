/**
 * SPG Widget — unified embeddable Service Pricing Guide widget
 *
 * Three presentation modes from one file:
 *
 *   inline  – renders directly into a container div
 *   popover – floats below/above a trigger element (search input, button, etc.)
 *   modal   – full centered dialog with two-panel pricing layout
 *
 * ── Attach to an existing search input (most common integration) ──
 *
 *   SPGWidget.attach('#service-search', {
 *     vehicleContext: { year: 2022, make: 'Toyota', model: 'Camry' },
 *     onConfirm: (operations) => console.log(operations),
 *   });
 *
 * ── Inline (tight space) ──
 *
 *   SPGWidget.init({
 *     mode: 'inline',
 *     container: '#my-div',
 *     onConfirm: (ops) => {},
 *   });
 *
 * ── Modal triggered by a button ──
 *
 *   SPGWidget.init({
 *     mode: 'modal',
 *     trigger: '#open-spg-btn',
 *     onConfirm: (ops) => {},
 *   });
 *
 * Events: trigger element (or container) dispatches 'spg:confirm' with detail.operations
 *
 * Returns: widget instance with .open(), .close(), .getValue(), .destroy() methods
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
      id: 'body-frame', name: 'Body & Frame',
      operations: [
        { id: 'op-cpillar',   name: 'C Pillar Baffle Plate R&R',   group: 'Body Panels', opcode: 'BODY-CPILLAR', laborHours: 0.8, laborTypeId: 'standard', parts: [], isDefault: false,
          applications: [
            { id: 'app-baffle', name: 'Baffle Plate Assembly' },
          ] },
        { id: 'op-console',   name: 'Console R&R',                 group: 'Body Panels', opcode: 'BODY-CONSOLE', laborHours: 0.6, laborTypeId: 'standard', parts: [], isDefault: false },
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
        { id: 'op-drlockact', name: 'Door Lock Actuator R&R',       group: 'Body Panels', opcode: 'BODY-DRLOCKACT', laborHours: 0.9, laborTypeId: 'standard', parts: [{ id:'p2', name:'Door Lock Actuator', price:49.99, qty:1 }], isDefault: false },
        { id: 'op-drlockcyl', name: 'Door Lock Cylinder R&R',       group: 'Body Panels', opcode: 'BODY-DRLOCKCYL', laborHours: 0.7, laborTypeId: 'standard', parts: [{ id:'p3', name:'Door Lock Cylinder', price:29.99, qty:1 }], isDefault: false },
        { id: 'op-drmirror',  name: 'Door Mirror R&R',              group: 'Body Panels', opcode: 'BODY-DRMIRROR', laborHours: 0.4, laborTypeId: 'standard', parts: [{ id:'p4', name:'Door Mirror', price:59.99, qty:1 }], isDefault: false },
      ],
    },
    {
      id: 'brakes', name: 'Brakes',
      operations: [
        { id: 'op-brk-f',     name: 'Brake Pad Replacement – Front',   group: 'Brake Pads',    opcode: 'BRK-PAD-F',   laborHours: 1.5, laborTypeId: 'standard', parts: [{ id:'p5',  name:'Front Brake Pad Set',  price:64.99, qty:1 }], isDefault: false,
          applications: [
            { id: 'app-oem',  name: 'OEM Pad Set' },
            { id: 'app-perf', name: 'Performance Pad Set' },
          ] },
        { id: 'op-brk-r',     name: 'Brake Pad Replacement – Rear',    group: 'Brake Pads',    opcode: 'BRK-PAD-R',   laborHours: 1.5, laborTypeId: 'standard', parts: [{ id:'p6',  name:'Rear Brake Pad Set',   price:54.99, qty:1 }], isDefault: false },
        { id: 'op-rotor',     name: 'Brake Rotor Replacement – Front', group: 'Rotors',        opcode: 'BRK-ROTOR-F', laborHours: 2.0, laborTypeId: 'standard', parts: [{ id:'p7',  name:'Front Rotor (ea)',     price:79.99, qty:2 }], isDefault: false },
        { id: 'op-brk-flush', name: 'Brake Fluid Flush',               group: 'Brake Fluid',   opcode: 'BRK-FLUSH',   laborHours: 0.8, laborTypeId: 'standard', parts: [{ id:'p8',  name:'DOT 3 Brake Fluid',    price:14.99, qty:1 }], isDefault: false },
      ],
    },
    {
      id: 'electrical', name: 'Electrical',
      operations: [
        { id: 'op-batt', name: 'Battery Replacement',    group: 'Battery & Charging', opcode: 'ELEC-BATT', laborHours: 0.5, laborTypeId: 'standard', parts: [{ id:'p9',  name:'Group 35 Battery', price:139.99, qty:1 }], isDefault: false },
        { id: 'op-alt',  name: 'Alternator Replacement', group: 'Battery & Charging', opcode: 'ELEC-ALT',  laborHours: 2.5, laborTypeId: 'premium',  parts: [{ id:'p10', name:'Reman. Alternator', price:229.99, qty:1 }], isDefault: false },
        { id: 'op-strtr', name: 'Starter Replacement',    group: 'Battery & Charging', opcode: 'ELEC-STRTR', laborHours: 1.8, laborTypeId: 'premium', parts: [{ id:'p11', name:'Starter Motor',    price:189.99, qty:1 }], isDefault: false },
      ],
    },
    {
      id: 'hvac', name: 'HVAC',
      operations: [
        { id: 'op-ac',      name: 'A/C System Recharge',          group: 'Climate Control', opcode: 'HVAC-AC',  laborHours: 1.0, laborTypeId: 'standard', parts: [{ id:'p12', name:'R-134a Refrigerant', price:49.99, qty:1 }], isDefault: false },
        { id: 'op-cab-flt', name: 'Cabin Air Filter Replacement', group: 'Climate Control', opcode: 'HVAC-CAB', laborHours: 0.3, laborTypeId: 'standard', parts: [{ id:'p13', name:'Cabin Air Filter',   price:19.99, qty:1 }], isDefault: true  },
      ],
    },
    {
      id: 'powertrain', name: 'Powertrain',
      operations: [
        { id: 'op-oil-conv',  name: 'Oil Change – Conventional',  group: 'Engine',       opcode: 'OC-CONV',     laborHours: 0.5, laborTypeId: 'standard', parts: [{ id:'p14', name:'Oil Filter',            price: 8.99, qty:1 }, { id:'p15', name:'Conv. Oil 5W-30 (5qt)', price:24.99, qty:1 }], isDefault: false },
        { id: 'op-oil-synth', name: 'Oil Change – Full Synthetic', group: 'Engine',       opcode: 'OC-SYNTH',    laborHours: 0.5, laborTypeId: 'standard', parts: [{ id:'p16', name:'Oil Filter',            price:12.99, qty:1 }, { id:'p17', name:'Full Syn. Oil 5W-30 (5qt)', price:49.99, qty:1 }], isDefault: false },
        { id: 'op-spark',     name: 'Spark Plug Replacement',     group: 'Engine',       opcode: 'ENG-SPARK',   laborHours: 1.5, laborTypeId: 'standard', parts: [{ id:'p18', name:'Iridium Spark Plug',    price:14.99, qty:4 }], isDefault: false },
        { id: 'op-trans',     name: 'Transmission Fluid Service',  group: 'Transmission', opcode: 'TRANS-FLUID', laborHours: 1.5, laborTypeId: 'premium',  parts: [{ id:'p19', name:'ATF Fluid (1qt)',       price:18.99, qty:4 }], isDefault: false },
      ],
    },
    {
      id: 'steering', name: 'Steering',
      operations: [
        { id: 'op-tierod',  name: 'Outer Tie Rod End R&R',   group: 'Steering Linkage', opcode: 'STR-TIEROD', laborHours: 0.9, laborTypeId: 'standard', parts: [{ id:'p20', name:'Outer Tie Rod End', price:24.99, qty:2 }], isDefault: false },
        { id: 'op-prack',   name: 'Power Steering Rack R&R', group: 'Steering Gear',    opcode: 'STR-RACK',   laborHours: 2.2, laborTypeId: 'premium',  parts: [{ id:'p21', name:'Steering Rack',     price:349.99, qty:1 }], isDefault: false },
      ],
    },
    {
      id: 'suspension', name: 'Suspension',
      operations: [
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
        { id: 'op-cabush', name: 'Control Arm Bushing R&R',  group: 'Control Arms',    opcode: 'SUS-CABUSH',  laborHours: 1.2, laborTypeId: 'standard', parts: [{ id:'p23', name:'Control Arm Bushing', price:19.99, qty:2 }], isDefault: false },
      ],
    },
    {
      id: 'vehicle', name: 'Vehicle',
      operations: [
        { id: 'op-tire-rot', name: 'Tire Rotation',           group: 'General', opcode: 'TIRE-ROT',  laborHours: 0.5, laborTypeId: 'standard', parts: [], isDefault: true },
        { id: 'op-whl-bal',  name: 'Wheel Balance (4 wheels)', group: 'General', opcode: 'WHEEL-BAL', laborHours: 1.0, laborTypeId: 'standard', parts: [], isDefault: false },
      ],
    },
  ];

  // ─── Utilities ────────────────────────────────────────────────────────────────

  const r2   = n => Math.round(n * 100) / 100;
  const fmt$ = n => '$' + Number(n).toFixed(2);
  const esc  = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  let widgetUidCounter = 0;

  function resolve(ref) {
    if (!ref) return null;
    return typeof ref === 'string' ? document.querySelector(ref) : ref;
  }

  function getOp(id) {
    for (const cat of CATEGORIES) {
      const op = cat.operations.find(o => o.id === id);
      if (op) return op;
    }
    return null;
  }

  function calcPricing(op, ov) {
    ov = ov || {};
    const ltId      = ov.laborTypeId || op.laborTypeId;
    const lt        = LABOR_TYPES.find(l => l.id === ltId) || LABOR_TYPES[0];
    const laborHours = ov.laborHours !== undefined ? ov.laborHours : op.laborHours;
    const laborRate  = ov.laborRate  !== undefined ? ov.laborRate  : lt.rate;
    const laborCost  = r2(laborHours * laborRate);
    const partsCost  = r2(op.parts.reduce((s, p) => s + p.price * p.qty, 0));
    return { ltId, laborHours, laborRate, laborCost, partsCost, parts: op.parts, total: r2(laborCost + partsCost) };
  }

  function fetchLevel(data, delay) {
    if (delay === undefined) delay = 400;
    return new Promise((res, rej) => {
      setTimeout(() => (data ? res(data) : rej(new Error('No data returned'))), delay);
    });
  }

  // ─── Styles ───────────────────────────────────────────────────────────────────

  const STYLES = `
/* ── Reset ── */
.spgw-root *{box-sizing:border-box;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;margin:0;padding:0}

/* ── Inline: wraps the compact widget body ── */
.spgw-inline{display:flex;flex-direction:column;height:100%;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.07)}

/* ── Popover: fixed, floats near trigger ── */
.spgw-popover{
  position:fixed;z-index:9800;
  background:#fff;border:1px solid #e2e8f0;border-radius:10px;
  box-shadow:0 8px 30px rgba(0,0,0,.14),0 2px 8px rgba(0,0,0,.08);
  display:flex;flex-direction:column;
  opacity:0;pointer-events:none;transform:translateY(-6px);
  transition:opacity .15s,transform .15s;
  min-width:340px;max-width:480px;
}
.spgw-popover.spgw--visible{opacity:1;pointer-events:all;transform:translateY(0)}

/* ── Modal overlay ── */
.spgw-modal-overlay{
  position:fixed;inset:0;z-index:9900;
  background:rgba(15,23,42,.55);backdrop-filter:blur(2px);
  display:flex;align-items:center;justify-content:center;padding:20px;
  opacity:0;pointer-events:none;transition:opacity .2s;
}
.spgw-modal-overlay.spgw--visible{opacity:1;pointer-events:all}
.spgw-modal-dialog{
  background:#fff;border-radius:12px;
  box-shadow:0 24px 64px rgba(0,0,0,.25);
  width:100%;max-width:760px;
  display:flex;flex-direction:column;
  max-height:calc(100vh - 40px);
  transform:scale(.97) translateY(8px);
  transition:transform .2s;
  overflow:hidden;
}
.spgw-modal-overlay.spgw--visible .spgw-modal-dialog{transform:scale(1) translateY(0)}

/* ── Compact widget header (popover only) ── */
.spgw-pop-hdr{
  padding:10px 12px 8px;border-bottom:1px solid #f1f5f9;
  display:flex;align-items:center;justify-content:space-between;flex-shrink:0;
}
.spgw-pop-title{font-size:13px;font-weight:700;color:#1e293b}
.spgw-pop-veh{font-size:11px;color:#64748b;background:#f1f5f9;padding:2px 8px;border-radius:10px}
.spgw-pop-close{background:none;border:none;cursor:pointer;color:#94a3b8;font-size:18px;line-height:1;padding:2px 4px;border-radius:4px}
.spgw-pop-close:hover{color:#374151;background:#f1f5f9}

/* ── Modal dialog header ── */
.spgw-modal-hdr{
  padding:14px 18px;background:#1e3a8a;color:#fff;flex-shrink:0;
  display:flex;align-items:center;justify-content:space-between;
}
.spgw-modal-title{font-size:15px;font-weight:700}
.spgw-modal-veh{font-size:12px;background:rgba(255,255,255,.18);padding:3px 10px;border-radius:20px;opacity:.95}
.spgw-modal-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,.7);font-size:20px;line-height:1;padding:2px 6px;border-radius:4px}
.spgw-modal-close:hover{color:#fff;background:rgba(255,255,255,.15)}

/* ── Modal two-panel body ── */
.spgw-modal-body{display:flex;flex:1;overflow:hidden}
.spgw-modal-left{width:300px;min-width:260px;flex-shrink:0;display:flex;flex-direction:column;border-right:1px solid #e2e8f0}
.spgw-modal-right{flex:1;overflow-y:auto;background:#fafafa}

/* ── Search ── */
.spgw-search-wrap{padding:8px;flex-shrink:0;border-bottom:1px solid #f1f5f9}
.spgw-search{
  width:100%;padding:7px 10px 7px 30px;border:1px solid #e2e8f0;border-radius:6px;
  font-size:13px;outline:none;color:#111827;
  background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.35-4.35'/%3E%3C/svg%3E") no-repeat 9px center;
}
.spgw-search:focus{border-color:#3b82f6;box-shadow:0 0 0 2px rgba(59,130,246,.12)}

/* ── Tree ── */
.spgw-tree{flex:1;overflow-y:auto}
.spgw-cat{border-bottom:1px solid #f1f5f9}
.spgw-cat-hdr{display:flex;align-items:center;gap:5px;padding:8px 10px;cursor:pointer;user-select:none;transition:background .12s}
.spgw-cat-hdr:hover{background:#f8fafc}
.spgw-caret{font-size:9px;color:#94a3b8;width:12px;flex-shrink:0;transition:transform .15s;display:inline-block}
.spgw-caret.open{transform:rotate(90deg)}
.spgw-cat-name{font-size:13px;font-weight:600;color:#1e293b;flex:1}
.spgw-cat-badge{font-size:11px;padding:1px 6px;border-radius:8px;background:#f1f5f9;color:#64748b}
.spgw-cat-badge.match{background:#dbeafe;color:#1d4ed8}

/* ── Operation row ── */
.spgw-op{border-bottom:1px solid #f8fafc}
.spgw-op-row{
  display:flex;align-items:center;gap:7px;
  padding:7px 10px 7px 22px;cursor:pointer;transition:background .1s;
}
.spgw-op-row:hover,.spgw-op.is-focused .spgw-op-row{background:#f0f9ff}
.spgw-op.is-focused .spgw-op-row{border-left:3px solid #3b82f6;padding-left:19px}
.spgw-op.is-selected .spgw-op-name{color:#1d4ed8;font-weight:500}
.spgw-chk{flex-shrink:0;accent-color:#2563eb;width:14px;height:14px;cursor:pointer}
.spgw-op-info{flex:1;min-width:0}
.spgw-op-name{display:block;font-size:13px;color:#374151;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.spgw-op-sub{display:block;font-size:12px;color:#94a3b8}
.spgw-op-price{font-size:12px;font-weight:600;color:#059669;flex-shrink:0}
.spgw-op-toggle{
  background:none;border:1px solid #e2e8f0;cursor:pointer;
  color:#94a3b8;font-size:9px;width:20px;height:20px;
  border-radius:4px;display:flex;align-items:center;justify-content:center;
  flex-shrink:0;transition:all .12s;
}
.spgw-op-toggle:hover,.spgw-op.is-expanded .spgw-op-toggle{background:#f1f5f9;color:#374151;border-color:#cbd5e1}

/* ── Compact inline pricing detail ── */
.spgw-op-detail{
  padding:0 10px 10px 22px;
  border-top:1px solid #f1f5f9;background:#f8fafc;
}
.spgw-cprc{padding:10px;background:#fff;border-radius:7px;border:1px solid #e2e8f0;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.spgw-cprc-field{display:flex;align-items:center;gap:8px}
.spgw-cprc-sel{font-size:12px;padding:6px 8px;border:1px solid #e2e8f0;border-radius:5px;outline:none;background:#fff;color:#374151}
.spgw-cprc-sel:focus{border-color:#3b82f6}
.spgw-cprc-inp{font-size:12px;padding:6px 8px;border:1px solid #e2e8f0;border-radius:5px;outline:none;background:#fff;color:#374151;width:70px;text-align:right}
.spgw-cprc-inp:focus{border-color:#3b82f6}
.spgw-cprc-lbl{font-size:12px;font-weight:600;color:#374151;white-space:nowrap}

/* ── Modal right panel pricing ── */
.spgw-rp{padding:18px}
.spgw-rp-empty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#94a3b8;padding:32px;text-align:center}
.spgw-rp-empty-icon{font-size:40px}
.spgw-rp-empty p{font-size:13px;line-height:1.5}
.spgw-rp-hdr{padding-bottom:14px;border-bottom:1px solid #e2e8f0;margin-bottom:14px}
.spgw-rp-name{font-size:16px;font-weight:700;color:#111827;margin-bottom:5px}
.spgw-rp-tag{font-size:11px;color:#6b7280;font-family:monospace;background:#f3f4f6;padding:2px 7px;border-radius:4px}
.spgw-rp-section{background:#fff;border:1px solid #e2e8f0;border-radius:7px;padding:12px;margin-bottom:10px}
.spgw-rp-section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin-bottom:10px}
.spgw-rp-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}
.spgw-rp-row:last-child{margin-bottom:0}
.spgw-rp-lbl{font-size:13px;color:#6b7280;flex-shrink:0}
.spgw-rp-sel,.spgw-rp-inp{font-size:13px;padding:6px 8px;border:1px solid #e2e8f0;border-radius:5px;outline:none;background:#fff;color:#111827}
.spgw-rp-sel:focus,.spgw-rp-inp:focus{border-color:#3b82f6;box-shadow:0 0 0 2px rgba(59,130,246,.1)}
.spgw-rp-inp{width:100px;text-align:right}
.spgw-rp-subtotal{display:flex;justify-content:space-between;font-size:13px;font-weight:600;color:#374151;padding-top:8px;margin-top:8px;border-top:1px solid #f1f5f9}
.spgw-rp-part{display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-bottom:1px solid #f8fafc;color:#374151}
.spgw-rp-no-parts{font-size:13px;color:#94a3b8;font-style:italic;margin-bottom:4px}
.spgw-rp-total{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-top:2px solid #e2e8f0;margin-bottom:12px}
.spgw-rp-total-lbl{font-size:14px;font-weight:700;color:#111827}
.spgw-rp-total-val{font-size:20px;font-weight:800;color:#059669}
.spgw-rp-add-btn{display:block;width:100%;padding:9px;background:#2563eb;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;transition:background .12s}
.spgw-rp-add-btn:hover{background:#1d4ed8}
.spgw-rp-add-btn.is-selected{background:#fee2e2;color:#dc2626}
.spgw-rp-add-btn.is-selected:hover{background:#fecaca}

/* ── Empty tree state ── */
.spgw-tree-empty{padding:20px;text-align:center;font-size:13px;color:#94a3b8}

/* ── Footer ── */
.spgw-footer{
  padding:8px 10px;border-top:1px solid #e2e8f0;background:#f8fafc;
  display:flex;align-items:center;justify-content:space-between;gap:10px;
  flex-shrink:0;flex-wrap:wrap;min-height:48px;
}
.spgw-footer-left{display:flex;align-items:center;gap:6px;flex:1;min-width:0;flex-wrap:wrap}
.spgw-no-sel{font-size:12px;color:#94a3b8;font-style:italic}
.spgw-chip{
  display:flex;align-items:center;gap:4px;
  background:#dbeafe;border:1px solid #93c5fd;border-radius:12px;
  padding:3px 6px 3px 9px;font-size:11px;
}
.spgw-chip-name{color:#1e40af;font-weight:500;max-width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.spgw-chip-rm{background:none;border:none;cursor:pointer;color:#93c5fd;font-size:14px;line-height:1;padding:0 1px;transition:color .1s}
.spgw-chip-rm:hover{color:#dc2626}
.spgw-footer-right{display:flex;align-items:center;gap:8px;flex-shrink:0}
.spgw-total{font-size:14px;font-weight:700;color:#059669}
.spgw-confirm-btn{
  padding:7px 14px;background:#2563eb;color:#fff;border:none;border-radius:6px;
  font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;transition:background .12s;
}
.spgw-confirm-btn:hover:not(:disabled){background:#1d4ed8}
.spgw-confirm-btn:disabled{opacity:.4;cursor:not-allowed}

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
`;

  // ─── Widget ───────────────────────────────────────────────────────────────────

  class SPGWidgetCore {
    constructor(config) {
      this._uid = ++widgetUidCounter;
      this._c = {
        mode:           config.mode || (config.trigger ? 'popover' : 'inline'),
        container:      resolve(config.container),
        trigger:        resolve(config.trigger),
        vehicleContext: config.vehicleContext || {},
        multiSelect:    config.multiSelect === true,
        onConfirm:      config.onConfirm  || null,
        onChange:       config.onChange   || null,
      };
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
      this._root     = null;
      this._isOpen   = false;
      this._onOutside = null;
      this._onKey     = null;
      this._onScroll  = null;
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    init() {
      _injectStyles();
      const mode = this._c.mode;
      if (mode === 'inline') {
        this._root = this._buildCompact();
        this._root.classList.add('spgw-root', 'spgw-inline');
        this._c.container.appendChild(this._root);
        this._bindEvents();
        this._updateTree();
      } else if (mode === 'popover') {
        this._root = this._buildCompact();
        this._root.classList.add('spgw-root', 'spgw-popover');
        document.body.appendChild(this._root);
        this._bindEvents();
        this._bindTrigger();
      } else {
        this._root = this._buildModal();
        this._root.classList.add('spgw-root');
        document.body.appendChild(this._root);
        this._bindEvents();
        if (this._c.trigger) this._bindTrigger();
      }
      return this;
    }

    open() {
      if (this._isOpen) return;
      this._isOpen = true;
      if (this._c.mode === 'popover') this._positionPopover();
      this._root.classList.add('spgw--visible');
      if (this._c.mode === 'modal') document.body.style.overflow = 'hidden';
      this._updateTree();

      // Close on outside click (popover + modal)
      if (this._c.mode !== 'inline') {
        setTimeout(() => {
          this._onOutside = e => {
            if (!this._root.contains(e.target) && e.target !== this._c.trigger) this.close();
          };
          this._onKey = e => { if (e.key === 'Escape') this.close(); };
          document.addEventListener('mousedown', this._onOutside);
          document.addEventListener('keydown',   this._onKey);
        }, 0);

        // Reposition popover on scroll
        if (this._c.mode === 'popover') {
          this._onScroll = () => this._isOpen && this._positionPopover();
          window.addEventListener('scroll', this._onScroll, true);
        }
      }
    }

    close() {
      if (!this._isOpen) return;
      this._isOpen = false;
      this._root.classList.remove('spgw--visible');
      if (this._c.mode === 'modal') document.body.style.overflow = '';
      if (this._onOutside) { document.removeEventListener('mousedown', this._onOutside); this._onOutside = null; }
      if (this._onKey)     { document.removeEventListener('keydown',   this._onKey);     this._onKey     = null; }
      if (this._onScroll)  { window.removeEventListener('scroll',      this._onScroll, true); this._onScroll = null; }
    }

    getValue() { return this._buildPayload(); }

    destroy() {
      this.close();
      if (this._root && this._root.parentNode) this._root.parentNode.removeChild(this._root);
    }

    // ── Build ──────────────────────────────────────────────────────────────────

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

    _buildModal() {
      const v = this._c.vehicleContext;
      const vLabel = [v.year, v.make, v.model, v.trim, v.engine].filter(Boolean).join(' ');
      const el = document.createElement('div');
      el.className = 'spgw-modal-overlay';
      el.innerHTML = `
        <div class="spgw-modal-dialog">
          <div class="spgw-modal-hdr">
            <span class="spgw-modal-title">Service Operations</span>
            ${vLabel ? `<span class="spgw-modal-veh">${esc(vLabel)}</span>` : ''}
            <button class="spgw-modal-close" data-action="close">✕</button>
          </div>
          <div class="spgw-modal-body">
            <div class="spgw-modal-left">
              <div class="spgw-search-wrap">
                <input class="spgw-search" type="text" placeholder="Search operations…" autocomplete="off" />
              </div>
              <div class="spgw-tree"></div>
            </div>
            <div class="spgw-modal-right">${this._rightPanelHTML(null)}</div>
          </div>
          ${this._c.multiSelect ? this._footerHTML() : ''}
        </div>`;
      return el;
    }

    _footerHTML() {
      return `<div class="spgw-footer">
        <div class="spgw-footer-left"><span class="spgw-no-sel">No services selected</span></div>
        <div class="spgw-footer-right">
          <button class="spgw-confirm-btn" disabled>Apply</button>
        </div>
      </div>`;
    }

    // ── Events ─────────────────────────────────────────────────────────────────

    _bindTrigger() {
      const trigger = this._c.trigger;
      const open = () => { if (!this._isOpen) this.open(); };
      trigger.addEventListener('focus', open);
      trigger.addEventListener('click', open);
    }

    _bindEvents() {
      const root = this._root;

      // Close button (popover header + modal header)
      root.addEventListener('click', e => {
        if (e.target.closest('[data-action="close"]')) { this.close(); return; }
      });

      // Backdrop click (modal)
      if (this._c.mode === 'modal') {
        root.addEventListener('mousedown', e => {
          if (e.target === root) this.close();
        });
      }

      // Search
      root.querySelector('.spgw-search').addEventListener('input', e => {
        this._s.search = e.target.value;
        this._updateTree();
      });

      // Tree: category toggle, op row click, checkbox
      root.querySelector('.spgw-tree').addEventListener('click', e => {
        // Category header
        const catHdr = e.target.closest('.spgw-cat-hdr');
        if (catHdr && !this._s.search.trim()) {
          const id = catHdr.dataset.cat;
          this._s.expandedCats[this._s.expandedCats.has(id) ? 'delete' : 'add'](id);
          this._updateTree();
          return;
        }

        // Expand toggle (compact mode)
        const toggleBtn = e.target.closest('.spgw-op-toggle');
        if (toggleBtn) {
          const opId = toggleBtn.dataset.opToggle;
          this._s.expandedOp = this._s.expandedOp === opId ? null : opId;
          this._updateTree();
          return;
        }

        // Operation row click (not checkbox, not toggle)
        const opRow = e.target.closest('.spgw-op-row');
        if (opRow && !e.target.classList.contains('spgw-chk') && !e.target.closest('.spgw-op-toggle')) {
          const opId = opRow.dataset.opRow;
          const op = getOp(opId);
          if (!op) return;

          if (this._c.mode === 'modal') {
            // Modal: focus shows pricing panel, separate from selection
            this._s.focusedOp = op;
            this._renderModalRight();
            this._updateTree();
          } else {
            // Compact: click row = expand pricing inline
            this._s.expandedOp = this._s.expandedOp === opId ? null : opId;
            this._updateTree();
          }
        }
      });

      // Checkbox toggle
      root.querySelector('.spgw-tree').addEventListener('change', e => {
        if (!e.target.classList.contains('spgw-chk')) return;
        const op = getOp(e.target.dataset.op);
        if (!op) return;
        e.target.checked ? this._selectOp(op) : this._deselectOp(op.id);
      });

      // Radio click on an already-selected op: unselect it (native radios can't be
      // unchecked by clicking again, and no 'change' event fires in that case)
      root.querySelector('.spgw-tree').addEventListener('click', e => {
        const chk = e.target.closest('.spgw-chk');
        if (!chk || this._c.multiSelect || chk.type !== 'radio') return;
        const opId = chk.dataset.op;
        if (this._s.selectedOps.some(s => s.op.id === opId)) {
          chk.checked = false;
          this._deselectOp(opId);
        }
      });

      // Compact pricing inputs (delegated from tree)
      root.querySelector('.spgw-tree').addEventListener('change', e => {
        const { op: opId, field } = e.target.dataset;
        if (opId && field) this._applyOverride(opId, field, e.target.value);
      });
      root.querySelector('.spgw-tree').addEventListener('input', e => {
        const { op: opId, field } = e.target.dataset;
        if (opId && field && field !== 'laborType') this._applyOverride(opId, field, e.target.value);
      });

      // Modal right panel inputs + add button
      if (this._c.mode === 'modal') {
        const right = root.querySelector('.spgw-modal-right');
        right.addEventListener('change', e => {
          const { op: opId, field } = e.target.dataset;
          if (opId && field) this._applyOverride(opId, field, e.target.value);
        });
        right.addEventListener('input', e => {
          const { op: opId, field } = e.target.dataset;
          if (opId && field && field !== 'laborType') this._applyOverride(opId, field, e.target.value);
        });
        right.addEventListener('click', e => {
          const btn = e.target.closest('.spgw-rp-add-btn');
          if (!btn) return;
          const op = getOp(btn.dataset.op);
          if (!op) return;
          const isSelected = this._s.selectedOps.some(s => s.op.id === op.id);
          isSelected ? this._deselectOp(op.id) : this._selectOp(op);
          this._renderModalRight();
        });
      }

      // Footer chip remove
      root.querySelector('.spgw-footer').addEventListener('click', e => {
        const rm = e.target.closest('.spgw-chip-rm');
        if (rm) this._deselectOp(rm.dataset.rm);
      });

      // Confirm button
      root.querySelector('.spgw-confirm-btn').addEventListener('click', () => {
        const payload = this._buildPayload();
        if (this._c.onConfirm) this._c.onConfirm(payload);
        const target = this._c.trigger || this._c.container;
        if (target) target.dispatchEvent(new CustomEvent('spg:confirm', { detail: { operations: payload }, bubbles: true }));
        if (this._c.mode !== 'inline') this.close();
      });
    }

    // ── Tree rendering ─────────────────────────────────────────────────────────

    _updateTree() {
      const term = this._s.search.toLowerCase().trim();
      const treeEl = this._root.querySelector('.spgw-tree');
      let html = '';

      for (const cat of CATEGORIES) {
        const ops = term
          ? cat.operations.filter(o =>
              o.name.toLowerCase().includes(term) ||
              o.opcode.toLowerCase().includes(term) ||
              cat.name.toLowerCase().includes(term))
          : cat.operations;

        if (term && ops.length === 0) continue;

        const expanded = term || this._s.expandedCats.has(cat.id);
        html += `
          <div class="spgw-cat">
            <div class="spgw-cat-hdr" data-cat="${cat.id}">
              <span class="spgw-caret ${expanded ? 'open' : ''}">▶</span>
              <span class="spgw-cat-name">${esc(cat.name)}</span>
              <span class="spgw-cat-badge ${term ? 'match' : ''}">${ops.length}</span>
            </div>
            <div class="spgw-cat-ops" ${expanded ? '' : 'style="display:none"'}>
              ${ops.map(op => this._opRowHTML(op)).join('')}
            </div>
          </div>`;
      }

      if (!html) {
        html = `<div class="spgw-tree-empty">No operations match "<strong>${esc(term)}</strong>"</div>`;
      }

      treeEl.innerHTML = html;
    }

    _opRowHTML(op) {
      const selected = this._s.selectedOps.some(s => s.op.id === op.id);
      const focused  = this._c.mode === 'modal' && this._s.focusedOp?.id === op.id;
      const expanded = this._c.mode !== 'modal' && this._s.expandedOp === op.id;
      const ov = this._s.overrides[op.id] || {};
      const p  = calcPricing(op, ov);

      return `
        <div class="spgw-op ${selected ? 'is-selected' : ''} ${focused ? 'is-focused' : ''} ${expanded ? 'is-expanded' : ''}">
          <div class="spgw-op-row" data-op-row="${op.id}">
            <input type="${this._c.multiSelect ? 'checkbox' : 'radio'}" name="spgw-op-radio-${this._uid}" class="spgw-chk" data-op="${op.id}" ${selected ? 'checked' : ''} />
            <div class="spgw-op-info">
              <span class="spgw-op-name">${esc(op.name)}</span>
              <span class="spgw-op-sub">${esc(op.group || '')}</span>
            </div>
            <span class="spgw-op-price">${fmt$(p.total)}</span>
            ${this._c.mode !== 'modal'
              ? `<button class="spgw-op-toggle" data-op-toggle="${op.id}">${expanded ? '▲' : '▼'}</button>`
              : ''}
          </div>
          ${expanded ? this._compactPricingHTML(op, p) : ''}
        </div>`;
    }

    _compactPricingHTML(op, p) {
      return `
        <div class="spgw-op-detail">
          <div class="spgw-cprc">
            <div class="spgw-cprc-field">
              <span class="spgw-cprc-lbl">Labor Type</span>
              <select class="spgw-cprc-sel" data-op="${op.id}" data-field="laborType">
                ${LABOR_TYPES.map(lt => `<option value="${lt.id}" ${lt.id === p.ltId ? 'selected' : ''}>${esc(lt.name)}</option>`).join('')}
              </select>
            </div>
            <div class="spgw-cprc-field">
              <span class="spgw-cprc-lbl">Labor Hours</span>
              <input class="spgw-cprc-inp" type="number" step="0.1" min="0" value="${p.laborHours}" data-op="${op.id}" data-field="laborHours" />
            </div>
          </div>
        </div>`;
    }

    // ── Modal right panel ──────────────────────────────────────────────────────

    _rightPanelHTML(op) {
      if (!op) return `
        <div class="spgw-rp rp-empty-wrap" style="height:100%;display:flex">
          <div class="spgw-rp-empty">
            <span class="spgw-rp-empty-icon">🔧</span>
            <p>Select an operation from the list<br>to view and edit pricing</p>
          </div>
        </div>`;
      const ov = this._s.overrides[op.id] || {};
      const p  = calcPricing(op, ov);
      const isSelected = this._s.selectedOps.some(s => s.op.id === op.id);
      return `
        <div class="spgw-rp">
          <div class="spgw-rp-hdr">
            <div class="spgw-rp-name">${esc(op.name)}</div>
            <span class="spgw-rp-tag">${esc(op.opcode)}</span>
          </div>
          <div class="spgw-rp-section">
            <div class="spgw-rp-section-title">Labor</div>
            <div class="spgw-rp-row">
              <label class="spgw-rp-lbl">Labor Type</label>
              <select class="spgw-rp-sel" data-op="${op.id}" data-field="laborType">
                ${LABOR_TYPES.map(lt => `<option value="${lt.id}" ${lt.id === p.ltId ? 'selected' : ''}>${esc(lt.name)} (${fmt$(lt.rate)}/hr)</option>`).join('')}
              </select>
            </div>
            <div class="spgw-rp-row">
              <label class="spgw-rp-lbl">Labor Hours</label>
              <input class="spgw-rp-inp" type="number" step="0.1" min="0" value="${p.laborHours}" data-op="${op.id}" data-field="laborHours" />
            </div>
            <div class="spgw-rp-row">
              <label class="spgw-rp-lbl">Rate ($/hr)</label>
              <input class="spgw-rp-inp" type="number" step="1" min="0" value="${p.laborRate}" data-op="${op.id}" data-field="laborRate" />
            </div>
            <div class="spgw-rp-subtotal"><span>Labor Total</span><span>${fmt$(p.laborCost)}</span></div>
          </div>
          <div class="spgw-rp-section">
            <div class="spgw-rp-section-title">Parts</div>
            ${p.parts.length
              ? p.parts.map(pt => `<div class="spgw-rp-part"><span>${esc(pt.name)} × ${pt.qty}</span><span>${fmt$(pt.price * pt.qty)}</span></div>`).join('')
              : '<p class="spgw-rp-no-parts">No parts required</p>'}
            <div class="spgw-rp-subtotal"><span>Parts Total</span><span>${fmt$(p.partsCost)}</span></div>
          </div>
          <div class="spgw-rp-total">
            <span class="spgw-rp-total-lbl">Total</span>
            <span class="spgw-rp-total-val">${fmt$(p.total)}</span>
          </div>
          <button class="spgw-rp-add-btn ${isSelected ? 'is-selected' : ''}" data-op="${op.id}">
            ${isSelected ? '✓ Remove from Selection' : '+ Add to Selection'}
          </button>
        </div>`;
    }

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

    // ── Selection ──────────────────────────────────────────────────────────────

    _selectOp(op) {
      const pricing = calcPricing(op, this._s.overrides[op.id]);
      if (!this._c.multiSelect) {
        this._s.selectedOps = [{ op, pricing }];
      } else {
        const idx = this._s.selectedOps.findIndex(s => s.op.id === op.id);
        if (idx >= 0) {
          this._s.selectedOps[idx] = { op, pricing };
        } else {
          this._s.selectedOps.push({ op, pricing });
        }
      }
      this._updateFooter();
      this._updateTree();
      this._emitChange();
    }

    _deselectOp(opId) {
      this._s.selectedOps = this._s.selectedOps.filter(s => s.op.id !== opId);
      this._updateFooter();
      this._updateTree();
      if (this._c.mode === 'modal' && this._s.focusedOp?.id === opId) {
        this._renderModalRight();
      }
      this._emitChange();
    }

    _applyOverride(opId, field, raw) {
      const ov = this._s.overrides[opId] || {};
      if (field === 'laborType')   ov.laborTypeId = raw;
      else if (field === 'laborHours') ov.laborHours = parseFloat(raw) || 0;
      else if (field === 'laborRate')  ov.laborRate  = parseFloat(raw) || 0;
      this._s.overrides[opId] = ov;

      // If already selected, update its pricing
      const idx = this._s.selectedOps.findIndex(s => s.op.id === opId);
      if (idx >= 0) {
        const op = this._s.selectedOps[idx].op;
        this._s.selectedOps[idx].pricing = calcPricing(op, ov);
        this._updateFooter();
        this._emitChange();
      }
      // Refresh expanded compact view or modal right panel
      if (this._c.mode !== 'modal' && this._s.expandedOp === opId) {
        this._updateTree();
      } else if (this._c.mode === 'modal' && this._s.focusedOp?.id === opId) {
        this._renderModalRight();
      }
    }

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
      const wizard = this._s.wizard;
      fetchLevel(op.applications || []).then(applications => {
        if (this._s.wizard !== wizard) return;
        this._s.wizard.applications = applications;
        this._s.wizard.loading = false;
        if (applications.length === 0) { this._wizardGoToLabor(op); return; }
        if (applications.length === 1) { this._wizardSelectApplication(applications[0]); return; }
        this._s.wizard.step = 'application';
        this._render();
      }).catch(err => {
        if (this._s.wizard !== wizard) return;
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
      const wizard = this._s.wizard;
      fetchLevel(application.positions || []).then(positions => {
        if (this._s.wizard !== wizard) return;
        this._s.wizard.positions = positions;
        this._s.wizard.loading = false;
        if (positions.length === 0) { this._wizardGoToLabor(op); return; }
        if (positions.length === 1) { this._wizardSelectPosition(positions[0]); return; }
        this._s.wizard.step = 'position';
        this._render();
      }).catch(err => {
        if (this._s.wizard !== wizard) return;
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
      const wizard = this._s.wizard;
      fetchLevel(position.qualifiers || []).then(qualifiers => {
        if (this._s.wizard !== wizard) return;
        this._s.wizard.qualifiers = qualifiers;
        this._s.wizard.loading = false;
        if (qualifiers.length === 0) { this._wizardGoToLabor(op); return; }
        if (qualifiers.length === 1) { this._wizardSelectQualifier(qualifiers[0]); return; }
        this._s.wizard.step = 'qualifier';
        this._render();
      }).catch(err => {
        if (this._s.wizard !== wizard) return;
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

    // ── Footer ─────────────────────────────────────────────────────────────────

    _updateFooter() {
      if (!this._c.multiSelect) return;
      const footer  = this._root.querySelector('.spgw-footer');
      const left    = footer.querySelector('.spgw-footer-left');
      const right   = footer.querySelector('.spgw-footer-right');
      const ops     = this._s.selectedOps;
      const total   = r2(ops.reduce((s, item) => s + item.pricing.total, 0));

      left.innerHTML = ops.length === 0
        ? '<span class="spgw-no-sel">No services selected</span>'
        : ops.map(item => `
            <div class="spgw-chip">
              <span class="spgw-chip-name" title="${esc(item.op.name)}">${esc(item.op.name)}</span>
              <button class="spgw-chip-rm" data-rm="${item.op.id}">×</button>
            </div>`).join('');

      right.innerHTML = `
        ${ops.length ? `<span class="spgw-total">${fmt$(total)}</span>` : ''}
        <button class="spgw-confirm-btn" ${ops.length === 0 ? 'disabled' : ''}>Apply</button>`;

      // Re-bind confirm button
      right.querySelector('.spgw-confirm-btn').addEventListener('click', () => {
        const payload = this._buildPayload();
        if (this._c.onConfirm) this._c.onConfirm(payload);
        const target = this._c.trigger || this._c.container;
        if (target) target.dispatchEvent(new CustomEvent('spg:confirm', { detail: { operations: payload }, bubbles: true }));
        if (this._c.mode !== 'inline') this.close();
      });
    }

    // ── Popover positioning ────────────────────────────────────────────────────

    _positionPopover() {
      const trigger = this._c.trigger;
      if (!trigger) return;
      const r    = trigger.getBoundingClientRect();
      const pw   = Math.max(360, r.width);
      const ph   = 440;
      const gap  = 6;
      const top  = (window.innerHeight - r.bottom > ph || r.top < ph)
        ? r.bottom + gap
        : r.top - ph - gap;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - pw - 8));
      Object.assign(this._root.style, {
        top:      `${top}px`,
        left:     `${left}px`,
        width:    `${pw}px`,
        maxHeight:`${Math.min(ph, window.innerHeight - top - 12)}px`,
      });
    }

    // ── Emit & payload ─────────────────────────────────────────────────────────

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

    _emitChange() {
      if (this._c.onChange) this._c.onChange(this._buildPayload());
    }
  }

  // ─── Style injection (once per page) ─────────────────────────────────────────

  function _injectStyles() {
    if (document.getElementById('spgw-styles')) return;
    const s = document.createElement('style');
    s.id = 'spgw-styles';
    s.textContent = STYLES;
    document.head.appendChild(s);
  }

  // ─── Public API ───────────────────────────────────────────────────────────────

  global.SPGWidget = {
    /**
     * Full config init.
     * @param {object} config
     * @param {'inline'|'popover'|'modal'} [config.mode]
     * @param {string|Element} [config.container]  - for inline mode
     * @param {string|Element} [config.trigger]    - element that opens the widget
     * @param {object}  [config.vehicleContext]    - { year, make, model, trim, engine }
     * @param {boolean} [config.multiSelect=false]
     * @param {function} [config.onConfirm]        - called with operations[] on confirm
     * @param {function} [config.onChange]         - called on every selection change
     */
    init(config) {
      const w = new SPGWidgetCore(config);
      w.init();
      if (config.mode === 'inline' || !config.trigger) w.open && w._root && null; // inline is always open
      return w;
    },

    /**
     * Convenience: attach a popover to an existing element.
     * @param {string|Element} trigger
     * @param {object} config
     */
    attach(trigger, config) {
      return this.init({ mode: 'popover', ...config, trigger });
    },
  };

})(window);
