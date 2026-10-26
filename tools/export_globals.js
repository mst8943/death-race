const fs = require('fs');
let code = fs.readFileSync('js/game.js', 'utf8');

const exportsCode = `
window.world = world;
window.camera = camera;
window.chassisBody = chassisBody;
window.carGroup = carGroup;
window.targets = targets;
window.activeTrackRamps = activeTrackRamps;
window.updateCamera = updateCamera;
window.updateRollOverRecovery = updateRollOverRecovery;
`;

if (!code.includes('window.activeTrackRamps = activeTrackRamps;')) {
  code = code.replace(/window\.__DBG = \{/, exportsCode + '\nwindow.__DBG = {');
  fs.writeFileSync('js/game.js', code, 'utf8');
  console.log('Exported globals to window.');
} else {
  console.log('Already exported.');
}
