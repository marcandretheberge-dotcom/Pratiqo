export const travelStyles = `
[data-travel-shell]{height:100dvh;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr);background:#dceeee;letter-spacing:0}
.review-app [data-travel-shell]{height:100%}
[data-travel-shell] .yo-course-header{background:#f7faf6;border:0}
[data-travel-shell] .yo-course-header-inner{min-height:52px;padding:4px 16px;max-width:none}
[data-travel-shell] .yo-course-main{height:100%;max-width:none;min-height:0;padding:0}
.italian-travel{color:#25473e;height:100%;min-height:0;display:grid;grid-template-rows:auto auto minmax(0,1fr);letter-spacing:0;background:#dceeee}
.travel-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 16px;background:#f7faf6}
.travel-heading h1{font-size:18px;font-weight:750;line-height:1.2;margin:0}
.travel-heading-tools{display:flex;gap:4px}
.travel-eyebrow{display:flex;gap:5px;align-items:center;font-size:11px;font-weight:750;text-transform:uppercase;color:#527367;margin:0 0 4px}
.travel-icon,.travel-close{width:44px;height:44px;display:grid;place-items:center;flex-shrink:0;background:transparent;border-radius:50%;color:#275f52}
.travel-icon:hover,.travel-close:hover{background:#dfebe3}
.travel-chapters{display:flex;justify-content:center;border-bottom:1px solid #b8d1c4;padding:0 12px;gap:20px;overflow:auto;background:#f7faf6}
.travel-chapters button{display:flex;align-items:center;gap:6px;min-height:44px;white-space:nowrap;font-size:13px;font-weight:650;border-bottom:3px solid transparent}
.travel-chapters button[aria-pressed=true]{border-color:#247566;color:#1b6658}.travel-chapters button:disabled{opacity:.55}
.travel-chapters button span{font-size:10px;color:#57776b}
.travel-layout{min-height:0;display:grid;grid-template-rows:minmax(0,1fr) auto}
.travel-stage{min-height:0;position:relative;display:grid;place-items:center;overflow:hidden;container-type:size;background:#dceeee}
.travel-map{position:relative;width:100%;aspect-ratio:4/5;isolation:isolate}
@supports(width:1cqh){.travel-map{width:min(100cqw,80cqh);height:min(125cqw,100cqh)}}
.travel-geography{position:absolute;inset:0;width:100%;height:100%}
.travel-city{position:absolute;z-index:10;display:flex;align-items:center;gap:5px;min-height:44px;max-width:120px;padding:0 6px;font-size:12px;font-weight:800;color:#294f44;white-space:nowrap;transform:translate(52px,-50%);text-shadow:0 1px #fff;-webkit-tap-highlight-color:transparent}
.travel-city[data-side=left]{transform:translate(calc(-100% - 52px),-50%)}
.travel-city[data-city=u07]{transform:translate(52px,calc(-50% + 18px))}
.travel-city span:first-child{border-radius:4px;background:#fffffff0;padding:5px 7px;box-shadow:0 2px 4px #28573b16;transition:background .15s}
.travel-city:active span:first-child{background:#cfebdc}
.travel-city[aria-pressed=true] span:first-child{background:#216c5e;color:white;text-shadow:none}
.travel-city[aria-disabled=true]{color:#596b63}.travel-city-number{font-size:10px}
.travel-map-credit{position:absolute;bottom:6px;right:8px;font-size:9px;color:#54766e}
.travel-destination{display:grid;grid-template-columns:minmax(0,1fr) minmax(200px,280px);align-items:center;gap:20px;padding:14px max(20px,calc((100% - 900px)/2));padding-bottom:max(14px,env(safe-area-inset-bottom));background:#f7faf6;border-top:1px solid #bed3c6;z-index:20}
.travel-destination h2{font-weight:750;font-size:20px;line-height:1.25;margin:0}
.travel-primary{min-height:50px;width:100%;display:flex;align-items:center;justify-content:center;gap:10px;background:#236d5b;color:white;padding:12px 16px;border-radius:7px;font-size:16px;font-weight:750;margin-top:20px}
.travel-destination .travel-primary{margin:0}.travel-primary:disabled{opacity:.5}
.travel-text-button{min-height:44px;padding:9px 0;font-size:14px;color:#286858;text-decoration:underline;text-underline-offset:4px}
.travel-equipment{display:flex;gap:15px;border-top:1px solid #d8dfd7;margin-top:16px;padding-top:20px}.travel-equipment h3{font-weight:750;font-size:16px}.travel-equipment p{font-size:13px;line-height:1.6;color:#546e62;margin:6px 0}.travel-equipment button{min-height:44px;text-decoration:underline;font-weight:700;font-size:14px}.travel-equipment-icon{background:#f7e2ab;width:46px;height:46px;flex-shrink:0;border-radius:50%;display:grid;place-items:center}
.travel-details{border-top:1px solid #d8dfd7;margin-top:20px;padding:10px 0}.travel-details summary{min-height:44px;padding:10px 0;cursor:pointer;font-size:14px;font-weight:700}.travel-details p{font-size:13px;line-height:1.6;margin-bottom:14px}
.travel-overlay{position:fixed;inset:0;background:#1c38396e;z-index:80}
.travel-arrival,.travel-discovery,.travel-tool-sheet{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:81;background:#fffdf6;color:#25473e;width:min(94vw,520px);max-height:90dvh;overflow:auto;border-radius:8px;box-shadow:0 16px 70px #103e3b45}
.travel-tool-sheet{padding:28px 24px}.travel-tool-sheet h2{font-size:22px;font-weight:750;padding-right:40px;margin-bottom:12px}.travel-tool-sheet>p{font-size:14px;line-height:1.6}
.travel-arrival{padding:50px 28px 30px;text-align:center}.travel-arrival h2,.travel-discovery h2{font-size:28px;line-height:1.2;font-weight:800;margin:16px 0}.travel-arrival p,.travel-discovery p{font-size:15px;line-height:1.7}.travel-skip{position:absolute;right:16px;top:8px;min-height:44px;font-weight:700;font-size:14px;text-decoration:underline}.travel-ticket{font-size:12px;font-weight:800;color:#8a5e2b}
.travel-flight{height:200px;position:relative;overflow:hidden}.travel-earth{position:absolute;inset:35px 10px;background:#d4e9de;border-radius:50%;display:grid;place-items:center;font-size:22px;color:#658a71;font-weight:800;border:2px solid #adcbb8}.travel-flight>.yo-map-vector{position:absolute;width:86px;height:100px;bottom:18px;left:24%}.travel-flight>svg:not(.yo-map-vector){position:absolute;left:60%;top:50px;color:#2a6c78}.travel-flight[data-flying=true]>svg:not(.yo-map-vector){animation:travel-flight 2.8s ease-in-out forwards}.travel-flight[data-flying=true]>.yo-map-vector{animation:travel-board .6s ease-out forwards}
@keyframes travel-flight{0%{transform:translate(-150px,60px) rotate(20deg)}100%{transform:translate(60px,-55px) rotate(20deg)}}@keyframes travel-board{to{transform:translate(100px,-35px) scale(.5);opacity:0}}
.travel-discovery>img{width:100%;height:200px;object-fit:cover}.travel-discovery-copy{padding:24px}.travel-close{position:absolute;right:10px;top:10px;z-index:2}.travel-discovery h3{font-size:18px;font-weight:750;margin:18px 0 10px}.travel-discovery .travel-sources{font-size:11px;text-decoration:underline}.travel-phrase{padding:12px 0;border-bottom:1px solid #d8dfd7;display:grid;gap:4px}.travel-phrase span{font-size:13px}.travel-choices{display:flex;gap:8px;flex-wrap:wrap}.travel-choices button{padding:12px 18px;border:1px solid #93b6a6;border-radius:6px;min-height:44px}.travel-choices button[aria-pressed=true]{background:#d8eddf}
/* Character and accessory share the 57px reference rig at every viewport size. */
.travel-map{--travel-yoppo-size:64px}
.travel-map .yo-map-companion{z-index:12;width:var(--travel-yoppo-size);height:calc(var(--travel-yoppo-size)*67/57)}
.yo-travel-scooter{position:absolute;width:calc(var(--travel-yoppo-size)*90/57);height:calc(var(--travel-yoppo-size)*48/57);left:calc(var(--travel-yoppo-size)*-10/57);bottom:calc(var(--travel-yoppo-size)*-13/57);z-index:2;overflow:visible}
.travel-map [data-pose=riding] .yo-map-vector{transform:translate(calc(var(--travel-yoppo-size)*-6/57),calc(var(--travel-yoppo-size)*-7/57))}
.travel-map [data-pose=riding] .yo-map-figure{animation:none;transform:translateY(8px)}.travel-map [data-pose=riding] .yo-map-leg{animation:none;transform:rotate(-65deg)}.travel-map [data-pose=riding] .yo-map-leg-back{transform:rotate(48deg)}.travel-map [data-pose=riding] .yo-map-front-arm{animation:none;transform:rotate(-90deg)}.travel-map [data-pose=riding] .yo-map-back-arm{animation:none;transform:rotate(-10deg)}
.italian-travel[data-scene-active=true] .travel-geography pattern path{animation:travel-water 6s ease-in-out infinite alternate}
@keyframes travel-water{to{transform:translateX(3px)}}
.italian-travel button:focus-visible,.travel-arrival button:focus-visible,.travel-discovery button:focus-visible,.travel-tool-sheet button:focus-visible{outline:3px solid #975124;outline-offset:3px}
@media(max-width:700px){.travel-heading{padding:0 12px}.travel-heading h1{font-size:17px}.travel-chapters{gap:16px;justify-content:flex-start}.travel-chapters button{font-size:12px}.travel-destination{grid-template-columns:minmax(0,1fr);gap:10px;padding:12px 16px max(12px,env(safe-area-inset-bottom))}.travel-destination h2{font-size:18px}.travel-city{font-size:11px;padding:0 2px}.travel-city span:first-child{padding:4px}.travel-city-number{display:none}.travel-map{--travel-yoppo-size:57px}.travel-arrival{padding:50px 20px 24px}.travel-tool-sheet{top:auto;bottom:0;transform:translateX(-50%);width:100%;border-radius:8px 8px 0 0;padding-bottom:max(24px,env(safe-area-inset-bottom))}}
@media(max-height:600px){[data-travel-shell]{height:auto;min-height:100%}.italian-travel{height:auto}.travel-stage{height:360px}}
@media(prefers-reduced-motion:reduce){.italian-travel *,.travel-flight *{animation:none!important;scroll-behavior:auto!important}}
`;
