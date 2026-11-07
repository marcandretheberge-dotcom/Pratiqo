const styles = {
  scene: "yo-adventure-scene", openGate: "yo-adventure-open-gate", closedGate: "yo-adventure-closed-gate",
  bloom: "yo-adventure-bloom", window: "yo-adventure-window", celebration: "yo-adventure-celebration",
  victoryScene: "yo-italian-victory-scene", victoryStone: "yo-italian-victory-stone", victoryPath: "yo-italian-victory-path",
  victoryDust: "yo-italian-victory-dust", victoryLight: "yo-italian-victory-light", victoryDestination: "yo-italian-victory-destination",
};
export default styles;
export const adventureCss = `
.yo-adventure-scene { display: block; width: 100%; aspect-ratio: 5 / 2; }
.yo-adventure-open-gate { transform-origin: 168px 100px; transform: scaleX(.15); }
.yo-adventure-closed-gate { transform-origin: 168px 100px; }
.yo-adventure-celebration { animation: yo-adventure-arrive .4s ease-out both; }
.yo-italian-victory-scene { display: block; width: 100%; aspect-ratio: 2 / 1; overflow: hidden; }
.yo-italian-victory-stone { transform-box: fill-box; transform-origin: center; transform: translate(var(--stone-x), var(--stone-y)) rotate(var(--stone-turn)); }
.yo-italian-victory-path { stroke-dasharray: 1; stroke-dashoffset: 0; }
.yo-italian-victory-dust { opacity: 0; transform-box: fill-box; transform-origin: center; }
.yo-italian-victory-light, .yo-italian-victory-destination { opacity: 1; transform-box: fill-box; transform-origin: center bottom; }
@media (prefers-reduced-motion: no-preference) {
  .yo-adventure-celebration .yo-adventure-open-gate { animation: yo-adventure-open .7s ease-out both; }
  .yo-adventure-celebration .yo-adventure-bloom { transform-origin: center bottom; animation: yo-adventure-grow .7s ease-out both; }
  .yo-adventure-window { transition: fill .45s ease-out; }
  .yo-adventure-celebration .yo-italian-victory-stone { animation: yo-italian-stone-settle .65s cubic-bezier(.4,0,.7,1) calc(.18s + var(--stone-delay)) both; }
  .yo-adventure-celebration .yo-italian-victory-dust { animation: yo-italian-paper-dust .65s .45s ease-out both; }
  .yo-adventure-celebration .yo-italian-victory-path { animation: yo-italian-path-light .9s .75s ease-out both; }
  .yo-adventure-celebration .yo-italian-victory-light { animation: yo-italian-light-on .3s var(--light-delay) ease-out both; }
  .yo-adventure-celebration .yo-italian-victory-destination { animation: yo-italian-destination .55s 1.55s ease-out both; }
}
@media (prefers-reduced-motion: reduce) {
  .yo-adventure-celebration { animation: none; }
  .yo-italian-victory-scene * { animation: none; transition: none; }
}
@keyframes yo-adventure-open { from { transform: scaleX(1); } to { transform: scaleX(.15); } }
@keyframes yo-adventure-grow { from { transform: scale(.9); } to { transform: scale(1); } }
@keyframes yo-adventure-arrive { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes yo-italian-stone-settle { from { transform: translate(0,0) rotate(0); } to { transform: translate(var(--stone-x), var(--stone-y)) rotate(var(--stone-turn)); } }
@keyframes yo-italian-paper-dust { 0%,100% { opacity: 0; } 35% { opacity: .65; transform: scale(1.1); } 100% { transform: scale(1.5); } }
@keyframes yo-italian-path-light { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes yo-italian-light-on { from { opacity: 0; transform: scale(.8); } to { opacity: 1; transform: scale(1); } }
@keyframes yo-italian-destination { from { opacity: 0; transform: translateY(8px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
`;
