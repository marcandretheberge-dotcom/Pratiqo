import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const proposalPath = "rive/yoppo-master/evidence/reference-segmentation-proposal.json";
const proposal = JSON.parse(fs.readFileSync(proposalPath, "utf8"));
const output = path.resolve(".qa-guided/yoppo-pilot/reference-review");
const protectedFiles = [
  proposal.source,
  "lib/companion/yoppoRigContract.ts",
  "scripts/audit-yoppo-master.mjs",
  "scripts/measure-yoppo-geometry.mjs",
  "scripts/compare-yoppo-master.ts",
  ".github/workflows/yoppo-rive-pilot-review.yml",
  "rive/yoppo-master/scene.rml",
];
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const before = Object.fromEntries(protectedFiles.map(file => [file, sha(fs.readFileSync(file))]));
assert.equal(before[proposal.source], proposal.sourceSha256);
assert.equal(proposal.measurementIntegration, false);
assert.equal(proposal.parts.length, 14);
assert.equal(new Set(proposal.parts.map(part => part.id)).size, 14);
const metadata = await sharp(proposal.source).metadata();
assert.deepEqual([metadata.width, metadata.height], proposal.sourceSize);
const original = fs.readFileSync(proposal.source);
const image = `data:image/png;base64,${original.toString("base64")}`;
const escape = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const photo = `<image href="${image}" x="0" y="0" width="500" height="500"/>`;
const shapes = proposal.parts.map(part => `<g data-part="${part.id}" class="part-outline">
  <path d="${part.path}" fill="none" stroke="${part.color}" stroke-width="1.1"/>
  <circle cx="${part.anchor[0]}" cy="${part.anchor[1]}" r="8" fill="white" stroke="${part.color}" stroke-width="1.2"/>
  <text x="${part.anchor[0]}" y="${part.anchor[1] + 0.5}" text-anchor="middle" dominant-baseline="middle" fill="${part.color}" font-size="8" font-weight="700">${part.number}</text>
</g>`).join("");
const seams = proposal.junctions.map(junction => `<path class="junction-outline" d="${junction.path}" fill="none" stroke="#C15719" stroke-width="2" stroke-dasharray="4 3"/>`).join("");
const overview = (annotated = false) => `<svg viewBox="0 0 500 500" role="img" aria-label="${annotated ? "PNG original avec les 14 repères proposés" : "Yoppo original inchangé"}" xmlns="http://www.w3.org/2000/svg">${photo}${annotated ? `<g id="annotations">${shapes}${seams}</g>` : ""}</svg>`;
const legend = proposal.parts.map(part => `<a class="legend-item" href="#${part.id}"><b style="color:${part.color}">${part.number}</b><span>${escape(part.label)}</span></a>`).join("");
const junctionCards = proposal.junctions.map(junction => `<article class="junction">
  <h3><span>${junction.id}</span> ${escape(junction.title)}</h3>
  <svg viewBox="${junction.crop.join(" ")}" role="img" aria-label="${escape(junction.title)} : séparation proposée" xmlns="http://www.w3.org/2000/svg">${photo}<path d="${junction.path}" fill="none" stroke="#C15719" stroke-width="1.5" stroke-dasharray="3 2"/></svg>
  <p>${escape(junction.text)}</p>
</article>`).join("");
const reviewPaths = Object.fromEntries([...proposal.parts, ...proposal.accessories].map(part => [part.id, part.path]));
const pieces = proposal.parts.map(part => `<article class="piece" id="${part.id}">
  <h3><span style="color:${part.color}">${part.number}</span> ${escape(part.label)}</h3>
  <svg viewBox="${part.crop.join(" ")}" role="img" aria-label="Extrait source proposé : ${escape(part.label)}" xmlns="http://www.w3.org/2000/svg"><defs><mask id="mask-${part.id}" maskUnits="userSpaceOnUse" x="0" y="0" width="500" height="500"><path d="${part.path}" fill="white"/>${(part.excludedReviewParts ?? []).map(id => {
    assert.ok(reviewPaths[id], `Unknown review-only subtraction: ${id}`);
    return `<path d="${reviewPaths[id]}" fill="black"/>`;
  }).join("")}</mask></defs><g mask="url(#mask-${part.id})">${photo}</g></svg>
  <p>${escape(part.note)}</p><p class="uncertain">${escape(part.uncertainty)}</p>
  <code>${part.id}</code>
</article>`).join("");

const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; font-src 'none'; base-uri 'none'; form-action 'none'">
<title>Yoppo | Découpage de référence à valider</title>
<style>
*{box-sizing:border-box}html{scroll-behavior:auto}body{margin:0;background:#fff;color:#222b2a;font:16px/1.5 'Segoe UI',Arial,sans-serif;letter-spacing:0}main{max-width:1320px;margin:auto;padding:24px}h1{font-size:30px;line-height:1.15;margin:8px 0 12px}h2{font-size:23px;margin:0 0 8px}h3{font-size:17px;margin:0 0 12px}p{margin:6px 0 12px}.eyebrow{font-size:12px;text-transform:uppercase;font-weight:700;color:#42655c}.status{font-size:14px;color:#8a501b;font-weight:700}.summary{color:#4b5552}.columns{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin:22px 0 16px}figure{margin:0;min-width:0}figcaption{display:flex;justify-content:space-between;gap:12px;align-items:center;font-weight:600;font-size:15px;margin:0 0 8px}figcaption small{font-weight:400;color:#5a625e}svg{display:block;width:100%;height:auto;font-family:'Segoe UI',Arial,sans-serif}.columns svg{background:#F4F0E8;aspect-ratio:1;border:1px solid #dddcd5;border-radius:6px;max-height:560px}.legend{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px 16px;padding:16px 0;border-block:1px solid #dce0dd}.legend-item{display:flex;align-items:baseline;gap:9px;text-decoration:none;color:#26362f;font-size:14px;padding:3px 0}.legend-item b{font-variant-numeric:tabular-nums}.legend-item:hover span{text-decoration:underline}.legend-item:focus-visible{outline:2px solid #2456B0;outline-offset:2px}.footnote{font-size:13px;color:#56635c;margin-top:12px}.tools{display:flex;gap:10px;align-items:center;font-size:13px;font-weight:400}.tools input{accent-color:#247459;width:17px;height:17px;margin:0}.section{padding:32px 0;border-bottom:1px solid #dce0dd}.section-intro{color:#53625a;max-width:950px}.junctions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:22px}.junction h3 span{color:#a64d16;margin-right:8px}.junction svg{height:215px;background:#F4F0E8;border:1px solid #e0ddd6;border-radius:6px;margin:12px 0}.junction p{font-size:14px;color:#405348}.parts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:28px 20px;margin-top:22px}.piece{min-width:0;scroll-margin-top:16px}.piece h3 span{margin-right:6px}.piece svg{height:180px;background:#F4F0E8;border:1px solid #e0ddd6;border-radius:6px;margin-bottom:12px}.piece p{font-size:13px}.piece .uncertain{color:#8a501b}.piece code{font-size:12px;color:#56635c}.pending{border-left:3px solid #C15719;padding:2px 0 2px 16px}.pending p{margin:0}.preserved{display:flex;flex-wrap:wrap;gap:8px 24px;padding:0;list-style-position:inside}.hash{overflow-wrap:anywhere;font-size:12px;color:#56635c}.hidden{display:none}@media(max-width:700px){main{padding:18px}h1{font-size:25px}.columns{grid-template-columns:1fr;gap:24px}.legend{grid-template-columns:repeat(2,minmax(0,1fr))}.junctions{grid-template-columns:1fr}.junction svg{height:200px}.parts{grid-template-columns:repeat(2,minmax(0,1fr))}.piece svg{height:155px}.piece h3{font-size:15px}.tools{font-size:12px}.columns svg{max-height:none}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
</style></head><body><main>
<section id="overview">
<div class="eyebrow">Yoppo · Référence originale · Proposition V1</div>
<h1>Le même Yoppo, des parties clairement repérées</h1>
<p class="status">À valider par toi. Aucun nouveau dessin ni seuil de contrôle modifié.</p>
<p class="summary">14 groupes visibles. Gauche et droite désignent les côtés de l'image.</p>
<div class="columns"><figure><figcaption>PNG original <small>Pixels source inchangés</small></figcaption>${overview()}</figure>
<figure><figcaption>Découpage proposé <label class="tools"><input id="show-annotations" type="checkbox" checked> Repères</label></figcaption>${overview(true)}</figure></div>
<div class="legend">${legend}</div>
<p class="footnote">Pointillés orange : jonctions à confirmer. Les contours sont des repères proposés, pas des masques de mesure approuvés. Le PNG original reste la référence.</p>
</section>
<section class="section" id="junctions"><div class="eyebrow">Trois décisions de découpage</div><h2>Ce que l'image seule ne peut pas certifier</h2><p class="section-intro">Aucune couleur, proportion ni expression n'a été retouchée. Les pointillés proposent une séparation entre pièces, sans prétendre décrire les volumes cachés.</p><div class="junctions">${junctionCards}</div>
<div class="pending"><p><strong>Validation attendue :</strong> les séparations A, B et le rattachement C te conviennent-ils ?</p></div></section>
<section class="section" id="parts"><h2>Les 14 repères, séparément</h2><p class="section-intro">Extraits du PNG derrière les enveloppes proposées, à des échelles de présentation différentes. Le visage et le corps contiennent leurs détails enfants : ces vues se chevauchent volontairement et ne sont pas un puzzle de calques prêts à animer.</p><div class="parts">${pieces}</div></section>
<section class="section"><h2>Conservé sans interprétation</h2><ul class="preserved">${proposal.preservedDetails.map(item => `<li>${escape(item)}</li>`).join("")}</ul><p>Les parties cachées derrière la tête, le corps, les paupières, les bretelles et le sac restent inconnues. Aucun remplissage ni prolongement inventé.</p><p class="status">VISUAL REVIEW PENDING HUMAN REVIEW</p><p>Cette proposition n'est branchée ni sur les tests de mesure, ni sur Rive, ni sur l'application. Une validation du repérage ne vaut pas validation du rendu.</p><p class="hash">SHA-256 du PNG original : ${proposal.sourceSha256}</p></section>
</main><script>
document.getElementById('show-annotations').addEventListener('change', event => {
  document.getElementById('annotations').classList.toggle('hidden', !event.target.checked);
});
</script></body></html>`;

fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, "index.html"), html);
// Keep a byte-identical original in the review bundle, never a regenerated image.
fs.writeFileSync(path.join(output, "canonical-original.png"), original);
assert.equal(sha(fs.readFileSync(path.join(output, "canonical-original.png"))), proposal.sourceSha256);
assert.equal(sha(Buffer.from(image.split(",")[1], "base64")), proposal.sourceSha256);
for (const [file, hash] of Object.entries(before)) assert.equal(sha(fs.readFileSync(file)), hash, file);
const integrity = {
  proposal: proposalPath,
  proposalSha256: sha(fs.readFileSync(proposalPath)),
  status: proposal.status,
  reviewOnly: true,
  externalRequestsRequired: false,
  sourceBytesPreserved: true,
  protectedFilesUnchanged: before,
  output: "index.html",
};
fs.writeFileSync(path.join(output, "integrity.json"), JSON.stringify(integrity, null, 2) + "\n");
console.log(`PASS: original PNG bytes, 14 unique groups, protected gates and RML unchanged. Local review: ${path.join(output, "index.html")}`);
