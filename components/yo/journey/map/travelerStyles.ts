export const travelerStyles = `
.yo-map-companion { position:absolute; z-index:9; width:72px; height:84px; transform:translate(-50%,-100%); pointer-events:none; }
.yo-map-vector { display:block; width:100%; height:100%; overflow:visible; }
.yo-map-rig { position:relative; width:100%; height:100%; }
.yo-map-avatar-fallback { display:none; }
.yo-map-figure { transform-origin:48px 60px; }
.yo-map-leg-front { transform-origin:33px 88px; }
.yo-map-leg-back { transform-origin:61px 88px; }
.yo-map-front-arm { transform-origin:27px 72px; }
.yo-map-back-arm { transform-origin:69px 71px; }
.yo-map-companion[data-motion="idle"]:not([data-pose="riding"]) .yo-map-back-arm { transform:rotate(-16deg); }
.yo-map-quills { transform-origin:48px 28px; }
.yo-map-backpack { transform-origin:69px 58px; }
.yo-map-companion[data-active="true"][data-motion="idle"]:not([data-pose="riding"]) .yo-map-figure { animation:yo-idle-breathe 3.8s ease-in-out infinite; }
.yo-map-companion[data-active="true"] .yo-map-quills { animation:yo-quill-breeze 3.4s ease-in-out infinite; }
.yo-map-companion[data-active="true"][data-motion="walking"] .yo-map-quills { animation:yo-quill-travel .85s ease-in-out infinite alternate; }
.yo-map-companion[data-active="true"][data-motion="walking"] .yo-map-backpack { animation:yo-pack-sway .68s ease-in-out infinite alternate; }
.yo-map-companion[data-facing="left"]:not([data-pose="riding"]) .yo-map-vector { transform:scaleX(-1); }
.yo-map-companion[data-facing="left"][data-pose="riding"] .yo-map-rig { transform:scaleX(-1); }
.yo-map-companion[data-motion="walking"]:not([data-pose="riding"]) .yo-map-figure { animation:yo-walk-bob .34s ease-in-out infinite alternate; }
.yo-map-companion[data-motion="walking"]:not([data-pose="riding"]) .yo-map-leg-front,
.yo-map-companion[data-motion="walking"]:not([data-pose="riding"]) .yo-map-back-arm { animation:yo-walk-step .68s ease-in-out infinite; }
.yo-map-companion[data-motion="walking"]:not([data-pose="riding"]) .yo-map-leg-back,
.yo-map-companion[data-motion="walking"]:not([data-pose="riding"]) .yo-map-front-arm { animation:yo-walk-step .68s ease-in-out -.34s infinite; }
@keyframes yo-walk-step { 0%,100% { transform:rotate(-24deg); } 50% { transform:rotate(24deg) translateY(-2px); } }
@keyframes yo-walk-bob { from { transform:translateY(0); } to { transform:translateY(-2px); } }
@keyframes yo-idle-breathe { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-.8px); } }
@keyframes yo-quill-breeze { 0%,100% { transform:rotate(-1deg); } 50% { transform:rotate(2deg); } }
@keyframes yo-quill-travel { from { transform:rotate(-3deg) skewX(-1deg); } to { transform:rotate(5deg) skewX(-3deg); } }
@keyframes yo-pack-sway { from { transform:rotate(-1.5deg); } to { transform:rotate(2deg); } }
.yo-map-companion[data-active="false"] *,.yo-map-companion[data-reduced="true"] * { animation:none !important; }
@supports not (transform-box:fill-box) { .yo-map-rig { display:none; } .yo-map-avatar-fallback { display:block; } }
@media (prefers-reduced-motion:reduce) { .yo-map-companion * { animation:none !important; } }
`;
