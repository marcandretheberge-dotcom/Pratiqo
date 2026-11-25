export const worldMapStyles = `
.yo-shared-world-map { color:#203f36; max-width:1000px; width:100%; margin:24px auto; container-type:inline-size; }
.yo-shared-map-heading { padding:16px 12px 0; }
.yo-shared-map-heading > p { font-size:12px; color:#5f756b; margin:0 0 6px; }
.yo-shared-map-heading h2 { font-size:26px; line-height:1.2; letter-spacing:0; font-weight:700; margin:0; }
.yo-shared-map-heading nav { display:flex; align-items:center; gap:14px; min-height:48px; font-size:12px; color:#52675c; }
.yo-shared-map-heading nav button { display:grid; place-items:center; width:44px; height:44px; cursor:pointer; }
.yo-shared-map-heading nav button:disabled { opacity:.3; cursor:default; }
.yo-shared-atlas { position:relative; isolation:isolate; width:100%; aspect-ratio:4/5; max-width:520px; margin:auto; }
.yo-shared-scenery,.yo-shared-road { position:absolute; width:100%; height:100%; inset:0; pointer-events:none; }
.yo-shared-scenery { border-radius:8px; }
.yo-shared-road { z-index:1; }
.yo-shared-destinations { position:absolute; inset:0; z-index:10; list-style:none; padding:0; margin:0; }
.yo-shared-destinations li { position:absolute; transform:translate(-50%,0); width:max-content; max-width:43%; }
.yo-shared-destinations button { display:flex; align-items:center; justify-content:center; gap:5px; min-height:44px; max-width:100%; padding:8px 12px; border:2px solid #fffaf0; border-radius:24px; background:#fffcf0; box-shadow:0 3px 8px #21483f26; color:#24483e; font-family:inherit; font-size:13px; font-weight:600; line-height:1.25; text-align:center; cursor:pointer; -webkit-tap-highlight-color:transparent; }
.yo-shared-destinations button span { overflow-wrap:anywhere; }
.yo-shared-destinations button svg { flex:none; }
.yo-shared-destinations button[aria-pressed=true] { background:#ffda86; outline:2px solid #287b68; outline-offset:3px; }
.yo-shared-destinations button:disabled { background:#e9ebd9; color:#526453; cursor:default; }
.yo-shared-world-map button:focus-visible,.yo-shared-world-map a:focus-visible { outline:3px solid #146552; outline-offset:5px; }
.yo-shared-map-action { padding:24px 12px; min-height:228px; }
.yo-shared-map-action h3 { font-size:24px; font-weight:700; line-height:1.25; margin:6px 0 12px; letter-spacing:0; }
.yo-shared-map-action p { font-size:15px; line-height:1.6; margin:0 0 12px; }
.yo-shared-map-action .yo-shared-status { color:#60766a; font-size:12px; }
.yo-shared-continue { display:flex; align-items:center; justify-content:space-between; gap:16px; width:100%; min-height:50px; padding:14px 20px; margin-top:24px; border-radius:8px; background:#156c59; color:white; font-weight:650; text-decoration:none; cursor:pointer; }
.yo-shared-continue:hover { background:#105543; }
.yo-shared-map-loading { min-height:500px; padding:24px; }
@media(min-width:900px) {
 .yo-shared-world-map { display:grid; grid-template-columns:minmax(0,520px) minmax(0,1fr); column-gap:32px; }
 .yo-shared-map-heading { grid-column:1; grid-row:1; }
 .yo-shared-atlas { grid-column:1; grid-row:2; }
 .yo-shared-map-action { grid-column:2; grid-row:1 / 3; align-self:center; }
}
@media(max-width:359px) { .yo-shared-destinations button { font-size:12px; padding:7px 9px; } }
@media(prefers-reduced-motion:reduce) { .yo-shared-world-map * { scroll-behavior:auto; } }
`;
