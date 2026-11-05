const styles = {
  scene: "yo-adventure-scene", openGate: "yo-adventure-open-gate", closedGate: "yo-adventure-closed-gate",
  bloom: "yo-adventure-bloom", window: "yo-adventure-window", celebration: "yo-adventure-celebration",
};
export default styles;
export const adventureCss = `
.yo-adventure-scene { display: block; width: 100%; aspect-ratio: 5 / 2; }
.yo-adventure-open-gate { transform-origin: 168px 100px; transform: scaleX(.15); }
.yo-adventure-closed-gate { transform-origin: 168px 100px; }
.yo-adventure-celebration { animation: yo-adventure-arrive .4s ease-out both; }
@media (prefers-reduced-motion: no-preference) {
  .yo-adventure-celebration .yo-adventure-open-gate { animation: yo-adventure-open .7s ease-out both; }
  .yo-adventure-celebration .yo-adventure-bloom { transform-origin: center bottom; animation: yo-adventure-grow .7s ease-out both; }
  .yo-adventure-window { transition: fill .45s ease-out; }
}
@media (prefers-reduced-motion: reduce) {
  .yo-adventure-celebration { animation: none; }
}
@keyframes yo-adventure-open { from { transform: scaleX(1); } to { transform: scaleX(.15); } }
@keyframes yo-adventure-grow { from { transform: scale(.9); } to { transform: scale(1); } }
@keyframes yo-adventure-arrive { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
`;
