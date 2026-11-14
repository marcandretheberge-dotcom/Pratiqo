const device = document.getElementById("review-device");
const status = document.getElementById("review-width");
const frame = document.getElementById("review-frame");
const widths = document.querySelectorAll("button[data-width]");
for (const button of widths) {
  button.addEventListener("click", () => {
    const width = button.getAttribute("data-width");
    if (!["320", "375", "1280"].includes(width)) return;
    device.style.width = `${width}px`;
    status.textContent = `Fenêtre de ${width} px`;
    for (const option of widths) option.setAttribute("aria-pressed", String(option === button));
  });
}
document.getElementById("review-route").addEventListener("change", (event) => {
  const route = event.target.value;
  if (route === "/cafe" || route === "/cafe/preview/communaute") frame.src = route;
});
