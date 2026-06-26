import * as THREE from 'three';
import { randF } from '../utils/helpers.js';

export const grassTimeUniform = { value: 0.0 };

// ── Blade geometry: 5-vertex tapered shape ───────────────────────────────────
function makeBladeGeometry() {
  const h = 1.0, bw = 0.062, mw = 0.030;
  // verts: base-L(0), base-R(1), mid-L(2), mid-R(3), tip(4)
  const pos = new Float32Array([
    -bw, 0,     0,
     bw, 0,     0,
    -mw, h*.54, 0.018,
     mw, h*.54, 0.018,
     0,  h,     0.036,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex([0,1,2, 1,3,2, 2,3,4]);
  geo.computeVertexNormals();
  return geo;
}

// ── Avoid zones (center x, center z, radius) – keeps grass off paths/structures
const AVOID = [
  [0,  0, 2.8], [0, 10, 1.5], [0, 20, 3.2],   // main path & torii
  [9, -6, 7.0],                                  // pond
  [-28,-32,16],                                  // lake
  [11,  4, 2.8],                                 // coffee stall
  [-3,  1, 3.8],                                 // reading table
  [-3, -3, 2.0],                                 // cherry tree
  [-15,-5, 6.0],                                 // bamboo grove
  [25, -10, 6.5],                                // river strip
];

function isClear(x, z) {
  for (const [ax, az, r] of AVOID) {
    const dx = x - ax, dz = z - az;
    if (dx*dx + dz*dz < r*r) return false;
  }
  if (Math.abs(x) < 1.6 && z > -14 && z < 22) return false; // stone path
  return true;
}

// ── Exported creator ─────────────────────────────────────────────────────────
export function createGrassSystem(scene) {
  const COUNT = 8000;
  const geo   = makeBladeGeometry();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x3c8020, roughness: 0.88, metalness: 0,
    side: THREE.DoubleSide, alphaTest: 0.04,
  });

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.u_gt = grassTimeUniform;

    // inject declarations before everything
    shader.vertexShader =
      'uniform float u_gt;\nvarying float vGH;\n' + shader.vertexShader;
    shader.fragmentShader =
      'varying float vGH;\n' + shader.fragmentShader;

    // wind + pass height varying
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       float _gh = clamp(position.y, 0.0, 1.0);  // 0 at base, 1 at tip
       vGH = _gh;
       float _wf = _gh * _gh;
       #ifdef USE_INSTANCING
         float _gx = instanceMatrix[3][0];
         float _gz = instanceMatrix[3][2];
       #else
         float _gx = 0.0; float _gz = 0.0;
       #endif
       transformed.x += sin(u_gt*1.85 + _gx*0.22 + _gz*0.17) * _wf * 0.44;
       transformed.z += cos(u_gt*1.62 + _gx*0.15 + _gz*0.26) * _wf * 0.18;
       // subtle vertical sway
       transformed.y += sin(u_gt*2.10 + _gx*0.30 + _gz*0.22) * _wf * 0.06;`
    );

    // colour gradient base → tip
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
       vec3 basCol = vec3(0.09, 0.24, 0.05);
       vec3 tipCol = vec3(0.40, 0.72, 0.15);
       diffuseColor.rgb = mix(basCol, tipCol, vGH * vGH);`
    );
  };

  const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
  mesh.castShadow    = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < COUNT; i++) {
    let x, z, ok = false, tries = 0;
    while (!ok && tries < 25) {
      x = (Math.random() - 0.5) * 130;
      z = (Math.random() - 0.5) * 160 + 10;
      ok = isClear(x, z);
      tries++;
    }
    const sc = randF(0.18, 0.58);
    dummy.position.set(x, 0, z);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    dummy.scale.set(sc, sc * randF(0.8, 1.5), sc);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
  return mesh;
}
