// Rebuild the three mobile gestures with Rive CLI 1.9.2 and the repository's sharp.
// RIVE_BIN=/path/to/rive node tools/yoppo-journal/render.mjs
import { execFileSync } from "node:child_process";
import { copyFile, mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { prepareArtwork } from "./artwork.mjs";
import motion from "../../lib/yo/onboarding/journalMotion.json" with { type: "json" };

const working = await mkdtemp(path.join(tmpdir(), "yoppo-journal-"));
const project = path.join(working, "rive");
const { width, height } = motion.stage;
const output = fileURLToPath(new URL("../../public/companion/travel/journal/", import.meta.url));
const rive = process.env.RIVE_BIN || "rive";
const fps = 30;
const assetNames = ["head", "body", "pencil-paw", "look-down", "lid-left", "lid-right", "scenery", "notes", "star"];
const art = (name) => "0:" + (100 + assetNames.indexOf(name));
const id = { body: 10, head: 11, paw: 12, gaze: 13, leftLid: 14, rightLid: 15,
  hairLeft: 16, hairRight: 17, ink: 18, star: 19, twinkle: 20 };
const image = (name, attributes) => `<Image name="${name}" assetId="${art(name)}" originX="0" originY="0" ${attributes}/>`;

// Keep contact with the paper in stage coordinates. The wrist and the hair lag the head.
const listen = {
  body: { scaleY: [[0,1],[33,1.013],[74,.996],[109,1.011],[156,1]] },
  head: { degrees: [[0,0],[16,-6],[34,-3],[59,2],[87,3],[111,-2],[140,1],[156,0]],
    y: [[0,247],[17,240],[38,245],[72,249],[110,243],[156,247]] },
  paw: { degrees: [[0,12],[18,24],[34,19],[57,11],[92,14],[123,7],[156,12]],
    y: [[0,309],[20,296],[47,305],[96,311],[120,304],[156,309]] },
  hair: [[0,0],[19,12],[37,-6],[60,3],[84,-7],[117,6],[141,-3],[156,0]],
  leftLid: { opacity: [[0,0],[46,0],[48,1],[50,0],[117,0],[119,1],[121,0],[156,0]] },
  rightLid: { opacity: [[0,0],[46,0],[48,1],[50,0],[117,0],[119,1],[121,0],[156,0]] },
};
const write = {
  body: { scaleY: [[0,1],[8,.988],[32,.98],[43,1.012],[54,1]] },
  head: { degrees: [[0,0],[6,-3],[13,-10],[31,-9],[41,5],[48,-2],[54,0]],
    x: [[0,470],[12,461],[32,460],[45,472],[54,470]],
    y: [[0,247],[6,245],[15,257],[33,256],[45,242],[54,247]] },
  gaze: { opacity: [[0,0],[4,0],[7,1],[32,1],[37,0],[54,0]] },
  paw: { degrees: [[0,12],[7,17],[12,11],[16,15],[20,9],[24,13],[28,8],[32,12],[40,24],[54,12]],
    x: [[0,428],[8,417],[13,421],[17,425],[21,432],[26,440],[31,448],[35,452],[45,434],[54,428]],
    y: [[0,309],[6,305],[10,318],[13,314],[15,319],[18,313],[20,317],[23,313],[25,316],[28,311],[30,314],[33,311],[41,298],[54,309]] },
  ink: { scaleX: [[0,0],[9,0],[33,1],[54,1]] },
  hair: [[0,0],[8,-9],[17,15],[28,5],[39,-12],[48,7],[54,0]],
  leftLid: { opacity: [[0,0],[35,0],[37,1],[39,0],[54,0]] },
  rightLid: { opacity: [[0,0],[35,0],[37,1],[39,0],[54,0]] },
};
const celebrate = {
  body: { y: [[0,385],[6,389],[15,367],[26,385],[32,382],[47,385],[66,385]],
    scaleY: [[0,1],[6,.954],[15,1.022],[25,.975],[34,1.01],[45,1],[66,1]],
    scaleX: [[0,1],[6,1.025],[16,.985],[26,1.015],[37,1],[66,1]] },
  head: { degrees: [[0,0],[7,-4],[18,7],[33,3],[46,-3],[66,0]] },
  paw: { degrees: [[0,12],[7,7],[17,33],[25,24],[32,28],[47,11],[66,12]],
    y: [[0,309],[6,313],[17,285],[28,289],[44,304],[66,309]] },
  leftLid: { opacity: [[0,0],[17,0],[20,1],[30,1],[33,0],[66,0]] },
  hair: [[0,0],[7,-9],[17,17],[27,-14],[37,8],[46,-4],[66,0]],
  star: { opacity: [[0,0],[11,0],[16,1],[35,1],[46,0],[66,0]],
    y: [[0,142],[12,142],[21,108],[44,90],[66,90]], degrees: [[0,-18],[25,12],[47,24],[66,24]] },
  twinkle: { opacity: [[0,0],[15,0],[22,1],[32,1],[43,0],[66,0]],
    y: [[0,153],[16,153],[27,130],[43,117],[66,117]] },
};
const scenes = { listen, write, celebrate };
const key = { x:13, y:14, degrees:15, scaleX:16, scaleY:17, opacity:18, vertexX:24 };

function tracks(target, properties) {
  return `<KeyedObject objectId="0:${id[target]}">${Object.entries(properties).map(([property, keys]) =>
    `<KeyedProperty propertyKey="${key[property]}">${keys.map(([frame, v]) =>
      `<KeyFrameDouble frame="${frame}" value="${property === "degrees" ? v * Math.PI / 180 : v}" interpolationType="cubic"><CubicEaseInterpolator x1=".36" y1="0" x2=".54" y2="1"/></KeyFrameDouble>`
    ).join("")}</KeyedProperty>`).join("")}</KeyedObject>`;
}

// The top row flexes. The middle row pins the base of the quills above the eyebrows.
function headMesh() {
  const vertices = [[0,0],[1,0],[1,.39],[1,1],[0,1],[0,.39]];
  const triangles = Buffer.from([0,1,2, 0,2,5, 5,2,3, 5,3,4]).toString("base64");
  return `<Image name="Quills and face" x="206" y="196" assetId="${art("head")}"><Mesh triangleIndexBytes="${triangles}">
    ${vertices.map(([u,v], i) => `<ContourMeshVertex x="${(u-.5)*412}" y="${(v-.5)*392}" u="${u}" v="${v}" ${i<2 ? `id="0:${i ? id.hairRight : id.hairLeft}"` : ""}/>`).join("")}
  </Mesh></Image>`;
}

function markup(name, { hair, ...joints }) {
  const frames = motion.frames[name] * fps / motion.fps;
  const keyed = Object.entries(joints).map(([target, props]) => tracks(target, props));
  for (const [target, neutral] of [["hairLeft",-206], ["hairRight",206]]) {
    keyed.push(tracks(target, { vertexX: hair.map(([f,offset]) => [f,neutral+offset]) }));
  }
  // Rive paints siblings from back to front in reverse declaration order.
  return `<Rive version="1" kind="fragment">
    ${assetNames.map(n => `<ImageAsset name="${n}" file="${n}.png" id="${art(n)}"/>`).join("\n")}
    <Artboard name="Yoppo ${name}" width="${width}" height="${height}" id="0:2">
      <StateMachine name="Journal" id="0:3"><StateMachineLayer name="Performance">
        <EntryState><StateTransition stateToId="0:4"/></EntryState><AnimationState animationId="0:5" id="0:4" x="180"/>
      </StateMachineLayer></StateMachine>
      <LinearAnimation name="${name}" id="0:5" fps="${fps}" duration="${frames}" loopValue="${name==="listen"?"loop":"oneShot"}">${keyed.join("\n")}</LinearAnimation>
      <Node x="630" y="142" opacity="0" id="0:19" name="Gold star">${image("star",'x="-22" y="-26"')}</Node>
      <Node x="653" y="153" opacity="0" id="0:20" name="Second glint">${image("star",'x="-9" y="-11" scaleX=".42" scaleY=".42"')}</Node>
      <Node x="27.84" y="19" scaleX=".94" scaleY=".94"><Node x="464" y="385" name="Weight and breath" id="0:10"><Node x="-464" y="-385">
        <Node x="428" y="309" rotation=".20944" name="Pencil tip" id="0:12">
          ${image("pencil-paw",'x="-3.8" y="-140.5" scaleX=".574" scaleY=".574"')}
        </Node>
        <Node x="470" y="247" name="Neck" id="0:11"><Node x="-139" y="-234" scaleX=".64" scaleY=".64">
          ${image("lid-left",'opacity="0" id="0:14"')}${image("lid-right",'opacity="0" id="0:15"')}
          ${image("look-down",'opacity="0" id="0:13"')}${headMesh()}
        </Node></Node>
        <Node x="417" y="310" name="Fresh ink" scaleX="1" id="0:18">${image("notes","")}</Node>
        ${image("body",'x="291" y="211" scaleX=".7" scaleY=".7"')}
      </Node></Node></Node>
      ${image("scenery","")}
    </Artboard></Rive>`;
}

async function renderGesture(name, pose) {
  const framesDir = path.join(working, name);
  await mkdir(framesDir);
  await writeFile(path.join(project, "scene.rml"), markup(name, pose));
  const frameCount = motion.frames[name];
  const framePath = (index) => path.join(framesDir, `frame-${index}.png`);
  const commands = Array.from({ length: frameCount }, (_, index) =>
    `screenshot ${framePath(index)}\nadvance ${60 / motion.fps}`).join("\n");
  const log = execFileSync(rive, [project, "--commands"], { input: commands + "\nquit\n", encoding: "utf8" });
  if (/^err /m.test(log)) throw new Error(log);

  const files = [];
  if (name === "listen") {
    const poster = "yoppo-listen.webp";
    await sharp(framePath(0)).webp({ quality: 92 }).toFile(path.join(working, poster));
    files.push(poster);
  }

  const { cell, crop, columns, framesPerSheet } = motion;
  for (let first = 0; first < frameCount; first += framesPerSheet) {
    const count = Math.min(framesPerSheet, frameCount - first);
    const tiles = [];
    for (let offset = 0; offset < count; offset++) {
      const tile = await sharp(framePath(first + offset))
        .extract({ left: crop.x, top: crop.y, width: crop.width, height: crop.height })
        .resize(cell.width, cell.height, { fit: "fill" }).png().toBuffer();
      tiles.push({ input: tile, left: (offset % columns) * cell.width, top: Math.floor(offset / columns) * cell.height });
    }
    const file = `yoppo-${name}-${first / framesPerSheet}.webp`;
    await sharp({ create: { width: columns * cell.width, height: Math.ceil(count / columns) * cell.height,
      channels: 3, background: "#dce4cc" } }).composite(tiles).webp({ quality: 82, effort: 5 }).toFile(path.join(working, file));
    files.push(file);
  }
  return files;
}

try {
  await mkdir(project);
  await prepareArtwork(path.join(output, "yoppo-journal.webp"), project);
  await writeFile(path.join(project, "rive.yaml"), `name: yoppo-journal\nartboard:\n  width: ${width}\n  height: ${height}\n`);
  const files = [];
  for (const [name, pose] of Object.entries(scenes)) files.push(...await renderGesture(name, pose));
  for (const file of files) await copyFile(path.join(working, file), path.join(output, file));
  console.log(`Rendered ${files.length} journal assets.`);
} finally {
  await rm(working, { recursive: true, force: true });
}
