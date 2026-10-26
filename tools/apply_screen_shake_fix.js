const fs = require('fs');
const path = require('path');

const gameJsPath = path.join(__dirname, '..', 'js', 'game.js');
let src = fs.readFileSync(gameJsPath, 'utf8');

// 1. Update playHydraulicSlam
const oldPlay = " playHydraulicSlam() {\n  this.init();\n  if (!this.ctx) return;";
const newPlay = " playHydraulicSlam(vol = 1.0) {\n  this.init();\n  if (!this.ctx || vol <= 0.01) return;";

if (src.includes(oldPlay)) {
  src = src.replace(oldPlay, newPlay);
  src = src.replace(
    "g.gain.setValueAtTime(0.9, now);",
    "g.gain.setValueAtTime(0.9 * vol, now);"
  );
  src = src.replace(
    "ng.gain.setValueAtTime(0.6, now);",
    "ng.gain.setValueAtTime(0.6 * vol, now);"
  );
  console.log("Updated playHydraulicSlam with volume parameter.");
} else {
  console.log("Could not find playHydraulicSlam signature!");
}

// 2. Update slam trigger in updateHangarCrushers
const oldSlam = `   if (cycle >= 2.6 && (time - c.lastSlamTime > 1.5)) {
    c.lastSlamTime = time;
    Snd.playHydraulicSlam();
    spawnSparks(new T.Vector3(c.pos.x, 0.2, c.pos.z), new T.Vector3(0, 1, 0), 25);
    cameraShake = Math.max(cameraShake, 0.4);

    const distToCar = Math.hypot(pPos.x - c.pos.x, pPos.z - c.pos.z);`;

const newSlam = `   if (cycle >= 2.6 && (time - c.lastSlamTime > 1.5)) {
    c.lastSlamTime = time;
    const distToCar = Math.hypot(pPos.x - c.pos.x, pPos.z - c.pos.z);

    // Sadece prese çok yaklaşınca (16m altı) çok hafif zemin titreşimi ve ses
    if (distToCar < 16.0) {
     const proximity = Math.max(0, 1 - distToCar / 16.0);
     Snd.playHydraulicSlam(proximity * 0.65);
     spawnSparks(new T.Vector3(c.pos.x, 0.2, c.pos.z), new T.Vector3(0, 1, 0), 18);
     cameraShake = Math.max(cameraShake, 0.04 * proximity); // Sadece çok hafif zemin sarsıntısı
    }`;

if (src.includes(oldSlam)) {
  src = src.replace(oldSlam, newSlam);
  console.log("Updated slam trigger: ZERO global screen shake, ZERO global sound!");
} else {
  console.log("Could not find oldSlam block!");
}

fs.writeFileSync(gameJsPath, src, 'utf8');
console.log("Finished patching screen shake.");
