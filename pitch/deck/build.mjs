// Assembles src/ and slides/NN.html + NN.css into a single index.html. Run: node build.mjs
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";

const dir = new URL(".", import.meta.url);
const read = p => readFileSync(new URL(p, dir), "utf8");
const names = readdirSync(new URL("slides/", dir)).filter(f => /^\d\d\.html$/.test(f)).sort();

const html = names.map(f => read("slides/" + f)).join("\n");
const css = names.map(f => f.replace(".html", ".css")).filter(f => existsSync(new URL("slides/" + f, dir))).map(f => read("slides/" + f)).join("\n");
const js = names.map(f => f.replace(".html", ".js")).filter(f => existsSync(new URL("slides/" + f, dir))).map(f => read("slides/" + f)).join("\n");

const plate = `<svg viewBox="-60 -60 120 120" aria-hidden="true"><g class="fan" fill="#fff" fill-opacity=".09">
${[-24, -12, 0, 14, 28].map((r, i) => `<rect x="-36" y="-36" width="72" height="72" rx="13" style="--i:${i}" transform="rotate(${r}) translate(${(i - 2) * 6} ${(i % 3 - 1) * 6})"/>`).join("")}
</g><circle r="56" fill="none" stroke="#fff" stroke-width=".9"/></svg>`;

writeFileSync(new URL("index.html", dir), `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Full4Less Pitch</title>
<link rel="icon" href="assets/f4l-icon.svg">
<style>
${read("src/deck.css")}
${css}
</style>
</head>
<body>
<div id="stage">
<div id="plate">${plate}</div>
${html}
<div id="progress"><img src="assets/f4l-icon.svg" alt=""><span class="count"></span><span class="track"><span class="fill" style="display:block"></span></span></div>
</div>
<div id="notes"></div>
<script>
${js}
${read("src/deck.js")}
</script>
</body>
</html>
`);
console.log("built", names.length, "slides");
