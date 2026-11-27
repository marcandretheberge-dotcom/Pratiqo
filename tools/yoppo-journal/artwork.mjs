import path from "node:path";
import sharp from "sharp";

import motion from "../../lib/yo/onboarding/journalMotion.json" with { type: "json" };

const { width, height } = motion.stage;

const head = { left: 118, top: 10, width: 412, height: 392 };
const svg = (w, h, shapes) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${shapes}</svg>`
);

const scenery = svg(width, height, `
  <defs>
    <linearGradient id="field" x2="1" y2=".3" gradientUnits="objectBoundingBox">
      <stop stop-color="#c3ddd0"/><stop offset=".49" stop-color="#eee9ce"/><stop offset="1" stop-color="#c3dad0"/>
    </linearGradient>
    <radialGradient id="sun"><stop stop-color="#fff4cf"/><stop offset="1" stop-color="#fff4cf" stop-opacity="0"/></radialGradient>
    <radialGradient id="ground"><stop stop-color="#678775" stop-opacity=".25"/><stop offset="1" stop-color="#678775" stop-opacity="0"/></radialGradient>
  </defs>
  <path fill="url(#field)" d="M0 0h960v400H0z"/>
  <ellipse cx="452" cy="285" rx="348" ry="218" fill="url(#sun)"/>
  <g fill="none" stroke="#87ae98" stroke-width="1.6" opacity=".48">
    <path d="M-35 219c91-81 139 36 227-10s89-75 137-70m-361 100c91-81 143 37 233-12s87-68 143-66m-371 99c96-78 145 36 239-14s86-57 128-53"/>
    <path d="M688 168c70-16 67-86 149-112s88-7 151-39m-296 169c72-23 70-91 155-110s83-11 142-37m-282 164c76-25 68-89 151-106s88-16 135-42"/>
  </g>
  <g fill="none" stroke="#997b51" stroke-width="2.2" stroke-dasharray="2 11" stroke-linecap="round" opacity=".55">
    <path d="M-15 279c70 19 121-41 160-30 51 13 30 63-2 49s-4-75 81-72M742 245c45-7 50-71 112-65"/>
  </g>
  <circle cx="855" cy="180" r="5" fill="#f9e9bb" stroke="#a98c58" stroke-width="2"/>
  <ellipse cx="476" cy="397" rx="176" ry="17" fill="url(#ground)"/>`);

// Eye coordinates are in the approved journal illustration's original 1254-unit drawing space.
const eyes = [
  { white: "M292 380C296 347 319 327 348 335C373 339 391 357 388 389C385 422 364 436 337 432C306 431 288 413 292 380Z",
    iris: '<ellipse cx="348" cy="387.5" rx="41.5" ry="47" transform="rotate(13 348 387.5)"/>',
    lid: "M278 378C281 289 393 298 397 382C404 462 282 466 278 392Z", lash: "M289 385Q332 415 384 385" },
  { white: "M526 390C532 356 552 341 578 351C607 356 625 375 621 408C619 438 599 452 571 449C538 448 519 424 526 390Z",
    iris: '<ellipse cx="565.5" cy="402" rx="41.5" ry="48" transform="rotate(-9 565.5 402)"/>',
    lid: "M518 388C517 309 625 311 635 388C646 468 539 484 518 418Z", lash: "M528 399Q572 431 623 399" },
];

export async function prepareArtwork(atlas, dir) {
  const save = (name, buf) => sharp(buf).png().toFile(path.join(dir, name + ".png"));
  const crop = (name, region) => sharp(atlas).extract(region).png().toFile(path.join(dir, name + ".png"));
  const atlasUri = "data:image/png;base64," + (await sharp(atlas).png().toBuffer()).toString("base64");
  const headOverlay = (shapes) => svg(head.width, head.height,
    `<g transform="translate(-${head.left} -${head.top}) scale(${864 / 1254})">${shapes}</g>`);
  const lookDown = eyes.map(({white, iris}, i) => `
    <defs><clipPath id="white${i}"><path d="${white}"/></clipPath><clipPath id="iris${i}">${iris}</clipPath></defs>
    <g clip-path="url(#white${i})"><path d="${white}" fill="#fff9ed"/>
      <g transform="translate(-13 11)"><g clip-path="url(#iris${i})"><image href="${atlasUri}" width="1254" height="1254"/></g></g>
    </g>`).join("");
  const lid = (eye) => headOverlay(`
    <defs><linearGradient id="skin" x2=".2" y2="1"><stop stop-color="#f9eddc"/><stop offset="1" stop-color="#f7e7d3"/></linearGradient></defs>
    <path d="${eye.lid}" fill="url(#skin)"/><path d="${eye.lash}" fill="none" stroke="#49362d" stroke-width="6" stroke-linecap="round"/>`);
  await Promise.all([
    crop("head", head), crop("body", { left: 55, top: 424, width: 501, height: 406 }),
    crop("pencil-paw", { left: 599, top: 356, width: 221, height: 252 }),
    save("look-down", headOverlay(lookDown)), save("lid-left", lid(eyes[0])), save("lid-right", lid(eyes[1])),
    save("scenery", scenery),
    save("notes", svg(37, 15, '<path d="M2 10l4-5 2 6 6-8 1 6 5-5 2 2 5-4 3 2 5-3" stroke="#377568" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>')),
    save("star", svg(44, 52, '<path d="M22 2c2 15 5 20 20 24-15 3-18 8-20 24C20 34 17 29 2 26 17 22 20 17 22 2Z" fill="#ffdf83" stroke="#b17b39" stroke-width="2.6"/>')),
  ]);
}
