// Shared design tokens served to every tool page as __workplace/tokens.css.
// Tools use these variables and classes so they match the workspace look.
export const DESIGN_TOKENS_CSS = `:root{
  --bg:#f6f7fb;--dot:#cfd3e0;--ui:#ffffff;--ink:#1d2033;--muted:#6b7089;--accent:#5b5bf0;--accent-soft:#eef0fa;--line:#e4e6f0;
  --yellow:#ffe48a;--pink:#ffb8d1;--blue:#a9d4ff;--green:#b5ecc0;--purple:#d4c2ff;--orange:#ffc999;--white:#ffffff;--dark:#2b2f45;--danger:#d23b4e;
  --radius-panel:16px;--radius-control:11px;--shadow-panel:0 10px 30px -10px rgba(30,30,70,.25),0 2px 6px rgba(30,30,70,.06);
  --on-accent:#ffffff;
}
:root.dark{
  --bg:#111327;--dot:#2f3557;--ui:#1a1d35;--ink:#eef0fa;--muted:#9aa0bc;--accent:#8b8bff;--accent-soft:#232743;--line:#2a2f4d;
  --danger:#ff6b7d;--shadow-panel:0 10px 30px -10px rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.3);--on-accent:#111327;
}
html,body{margin:0;min-height:100%;font-family:Inter,-apple-system,"Segoe UI",system-ui,sans-serif;color:var(--ink);background:var(--bg)}
.dot-grid{background-color:var(--bg);background-image:radial-gradient(var(--dot) 1.2px,transparent 1.3px);background-size:24px 24px}
.panel{background:var(--ui);border:1px solid var(--line);border-radius:var(--radius-panel);box-shadow:var(--shadow-panel)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:36px;padding:0 14px;border:1px solid var(--line);border-radius:var(--radius-control);background:var(--ui);color:var(--ink);font:inherit;font-size:14px;font-weight:600;cursor:pointer}
.btn:hover{background:var(--accent-soft)}
.btn.primary{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}
.btn.primary:hover{opacity:.92}
.btn.ghost{border-color:transparent;background:transparent}
.btn.ghost:hover{background:var(--accent-soft)}
.btn.danger{color:var(--danger)}
.btn:disabled{opacity:.4;cursor:default}
.btn:focus-visible,.field:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.field{height:36px;padding:0 12px;border:1px solid var(--line);border-radius:var(--radius-control);background:var(--ui);color:var(--ink);font:inherit;font-size:14px}
.field::placeholder{color:var(--muted)}
.card{background:var(--ui);border:1px solid var(--line);border-radius:var(--radius-panel);box-shadow:0 2px 6px rgba(30,30,70,.06)}
.muted{color:var(--muted)}
.chip{display:inline-flex;align-items:center;height:24px;padding:0 10px;border-radius:999px;background:var(--accent-soft);color:var(--accent);font-size:12px;font-weight:700}
.swatch{width:22px;height:22px;border-radius:50%;border:2px solid rgba(0,0,0,.12);cursor:pointer}
`
