const fs = require('fs');
const path = require('path');

const gameJsPath = path.join(__dirname, '..', 'js', 'game.js');
let src = fs.readFileSync(gameJsPath, 'utf8');

// 1. Wheel options refinement (Eliminate rotational skid snaps & improve suspension damping)
const oldWheelOpts = `const wheelOptions = {
 radius: 0.38,
 directionLocal: new CANNON.Vec3(0, -1, 0),
 suspensionStiffness: 38,
 suspensionRestLength: 0.42,
 maxSuspensionTravel: 0.28,
 frictionSlip: 2.6,
 dampingRelaxation: 2.6,
 dampingCompression: 4.6,
 maxSuspensionForce: 100000,
 rollInfluence: 0.05,
 axleLocal: new CANNON.Vec3(-1, 0, 0),
 chassisConnectionPointLocal: new CANNON.Vec3(),
 customSlidingRotationalSpeed: -40,
 useCustomSlidingRotationalSpeed: true,
};`;

const newWheelOpts = `const wheelOptions = {
 radius: 0.38,
 directionLocal: new CANNON.Vec3(0, -1, 0),
 suspensionStiffness: 42,
 suspensionRestLength: 0.40,
 maxSuspensionTravel: 0.25,
 frictionSlip: 2.8,
 dampingRelaxation: 3.2,
 dampingCompression: 5.0,
 maxSuspensionForce: 100000,
 rollInfluence: 0.03,
 axleLocal: new CANNON.Vec3(-1, 0, 0),
 chassisConnectionPointLocal: new CANNON.Vec3(),
 useCustomSlidingRotationalSpeed: false,
};`;

if (src.includes(oldWheelOpts)) {
  src = src.replace(oldWheelOpts, newWheelOpts);
  console.log("Updated wheelOptions: disabled custom sliding rotational snaps and tuned suspension damping!");
} else {
  console.log("Could not find oldWheelOpts!");
}

// 2. Initial spawn height: spawn directly near resting ride height (0.85) instead of 1.8m or 2.0m freefall
src = src.replace(
  "const { chassisBody, vehicle } = createVehiclePhysics([0, 1.8, 0], 0);",
  "const { chassisBody, vehicle } = createVehiclePhysics([0, 0.85, 0], 0);"
);

src = src.replace(
  "chassisBody.position.set(0, 2, 0);",
  "chassisBody.position.set(0, 0.85, 0);"
);

// AI start positions spawn height
src = src.replace(
  "startPos: [-4.2, 1.8, 22]",
  "startPos: [-4.2, 0.85, 22]"
);
src = src.replace(
  "startPos: [4.2, 1.8, 22]",
  "startPos: [4.2, 0.85, 22]"
);
src = src.replace(
  "startPos: [-4.2, 1.8, -22]",
  "startPos: [-4.2, 0.85, -22]"
);
src = src.replace(
  "startPos: [4.2, 1.8, -22]",
  "startPos: [4.2, 0.85, -22]"
);

fs.writeFileSync(gameJsPath, src, 'utf8');
console.log("Finished wheel and spawn refinement.");
