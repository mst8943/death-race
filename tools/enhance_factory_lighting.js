const fs = require('fs');
const path = require('path');

const GAME_JS = path.join(__dirname, '../js/game.js');
let code = fs.readFileSync(GAME_JS, 'utf8');

// Enhance lighting in createCoveredFactoryHangar
code = code.replace(
  "const warehouseLight = new T.PointLight('#ffaa44', 3.4, 38);",
  `const warehouseLight = new T.PointLight('#ffb355', 4.8, 45);
  // Yan duvar floresan aydınlatması
  for (let s of [-1, 1]) {
   const wallLamp = new T.PointLight('#ffa033', 2.6, 26);
   wallLamp.position.set(centerX + s * (width / 2 - 2.0), 4.5, tz);
   hangarGroup.add(wallLamp);
  }`
);

fs.writeFileSync(GAME_JS, code, 'utf8');
console.log('Factory lighting enhanced in js/game.js!');
