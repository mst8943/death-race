const fs = require('fs');

// Test how long script components take in Node
console.log("Reading game.js...");
const code = fs.readFileSync('js/game.js', 'utf8');
console.log("game.js size:", code.length, "bytes");

// Check synchronous loops in game.js:
// 1. BARRIER_STEPS = 750
// 2. NUM_TRACK_STEPS = 1200
// 3. Grandstands, Factory Hangar, Container Crane, Debris
