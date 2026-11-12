export const travelerStyles = `
.yo-map-companion { position:absolute; z-index:9; width:72px; height:84px; transform:translate(-50%,-100%); pointer-events:none; }
.yo-map-vector { display:block; width:100%; height:100%; overflow:visible; }
.yo-map-avatar-fallback { display:none; }
.yo-map-figure { transform-origin:48px 60px; }
.yo-map-leg-front { transform-origin:33px 88px; }
.yo-map-leg-back { transform-origin:61px 88px; }
.yo-map-front-arm { transform-origin:27px 72px; }
.yo-map-back-arm { transform-origin:69px 71px; }
.yo-map-companion[data-facing="left"] .yo-map-vector { transform:scaleX(-1); }
.yo-map-companion[data-motion="walking"] .yo-map-figure { animation:yo-walk-bob .34s ease-in-out infinite alternate; }
.yo-map-companion[data-motion="walking"] .yo-map-leg-front,
.yo-map-companion[data-motion="walking"] .yo-map-back-arm { animation:yo-walk-step .68s ease-in-out infinite; }
.yo-map-companion[data-motion="walking"] .yo-map-leg-back,
.yo-map-companion[data-motion="walking"] .yo-map-front-arm { animation:yo-walk-step .68s ease-in-out -.34s infinite; }
@keyframes yo-walk-step { 0%,100% { transform:rotate(-24deg); } 50% { transform:rotate(24deg) translateY(-2px); } }
@keyframes yo-walk-bob { from { transform:translateY(0); } to { transform:translateY(-2px); } }
@supports not (transform-box:fill-box) { .yo-map-vector { display:none; } .yo-map-avatar-fallback { display:block; } }
@media (prefers-reduced-motion:reduce) { .yo-map-companion * { animation:none !important; } }
`;
