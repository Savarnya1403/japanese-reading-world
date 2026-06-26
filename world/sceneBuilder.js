import * as THREE from 'three';
import { randF, randI } from '../utils/helpers.js';
import { createGrassSystem, grassTimeUniform } from './GrassSystem.js';

// ── Procedural texture generators ────────────────────────────────────────────

function makeWoodTexture(w = 512) {
  const c = document.createElement('canvas'); c.width = c.height = w;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0,'#7a4a28');g.addColorStop(.35,'#6b3d1e');
  g.addColorStop(.7,'#8c5030');g.addColorStop(1,'#6b3d1e');
  ctx.fillStyle = g; ctx.fillRect(0,0,w,w);
  for(let i=0;i<40;i++){
    const y=Math.random()*w;
    ctx.beginPath();
    ctx.strokeStyle=`rgba(${Math.random()>.5?'0,0,0':'200,120,40'},${.06+Math.random()*.1})`;
    ctx.lineWidth=Math.random()*1.5+.3; ctx.moveTo(0,y);
    for(let x=0;x<w;x+=6) ctx.lineTo(x,y+Math.sin(x*.025+i)*9+Math.random()*2);
    ctx.stroke();
  }
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; return t;
}

function makeGrassTexture(w = 512) {
  const c=document.createElement('canvas'); c.width=c.height=w;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#2d5018'; ctx.fillRect(0,0,w,w);
  for(let i=0;i<3000;i++){
    const x=Math.random()*w,y=Math.random()*w,l=10+Math.random()*20;
    const hue=95+Math.random()*30,light=12+Math.random()*12;
    ctx.strokeStyle=`hsl(${hue},55%,${light}%)`;
    ctx.lineWidth=Math.random()*1.2+.3;
    ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+(Math.random()-.5)*4,y-l); ctx.stroke();
  }
  for(let i=0;i<8;i++){
    const cx=Math.random()*w,cy=Math.random()*w,r=20+Math.random()*40;
    const gr=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
    gr.addColorStop(0,'rgba(20,40,10,.4)'); gr.addColorStop(1,'rgba(20,40,10,0)');
    ctx.fillStyle=gr; ctx.fillRect(0,0,w,w);
  }
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(8,8); return t;
}

function makeStoneTexture(w = 256) {
  const c=document.createElement('canvas'); c.width=c.height=w;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#6a5c4a'; ctx.fillRect(0,0,w,w);
  for(let i=0;i<80;i++){
    const x=Math.random()*w,y=Math.random()*w,r=2+Math.random()*4;
    const b=Math.random()>.5?255:0;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fillStyle=`rgba(${b},${b},${b},.08)`; ctx.fill();
  }
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; return t;
}

function makeBarkTexture(w = 256) {
  const c=document.createElement('canvas'); c.width=c.height=w;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#3d2010'; ctx.fillRect(0,0,w,w);
  for(let i=0;i<60;i++){
    const y=Math.random()*w;
    ctx.strokeStyle=`rgba(0,0,0,${.15+Math.random()*.2})`;
    ctx.lineWidth=Math.random()*3+1; ctx.beginPath(); ctx.moveTo(0,y);
    for(let x=0;x<w;x+=4) ctx.lineTo(x,y+Math.sin(x*.04)*12+(Math.random()-.5)*3);
    ctx.stroke();
  }
  const t=new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(2,4); return t;
}

function makePaperTexture(w = 128) {
  const c=document.createElement('canvas'); c.width=c.height=w;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#f5ecd7'; ctx.fillRect(0,0,w,w);
  for(let i=0;i<200;i++){
    ctx.fillStyle=`rgba(${Math.random()>.5?0:255},${Math.random()>.5?0:255},0,.03)`;
    ctx.fillRect(Math.random()*w,Math.random()*w,2,2);
  }
  return new THREE.CanvasTexture(c);
}

function makeCloudTexture() {
  const c=document.createElement('canvas'); c.width=256; c.height=128;
  const ctx=c.getContext('2d');
  [[128,64,65],[75,70,48],[185,60,52],[108,50,40],[160,76,44],[140,88,35]].forEach(([cx,cy,r])=>{
    const g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
    g.addColorStop(0,'rgba(255,255,255,.92)');
    g.addColorStop(.5,'rgba(240,242,255,.5)');
    g.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=g; ctx.fillRect(0,0,256,128);
  });
  return new THREE.CanvasTexture(c);
}

// ── Water shader uniforms (exported so main loop can update time) ─────────────
export const waterUniforms = { time: { value: 0.0 } };

// ── Sky shader uniforms (exported so TimeOfDay can update them) ──────────────
export const skyUniforms = {
  u_zenith:     { value: new THREE.Color(0x1565c0) },
  u_mid:        { value: new THREE.Color(0x42a5f5) },
  u_horizon:    { value: new THREE.Color(0xffe0b2) },
  u_low:        { value: new THREE.Color(0xfff8e1) },
  u_sunDir:     { value: new THREE.Vector3(0.6, 0.55, -0.5).normalize() },
  u_nightBlend: { value: 0.0 },
  u_overcast:   { value: 0.0 },
  u_rainBlend:  { value: 0.0 },
};

// ── Build scene ──────────────────────────────────────────────────────────────
export function buildScene(scene) {
  const collidables = [];

  _addSky(scene);
  _addFog(scene);
  const lights = _addLights(scene);
  _addGround(scene);
  _addPath(scene);
  _addMountains(scene);
  _addForest(scene);
  _addLake(scene);
  _addRiver(scene);
  const clouds = _addClouds(scene);
  createGrassSystem(scene);
  // Main cherry blossom near table
  _addCherryBlossomTree(scene, new THREE.Vector3(-3,0,-3), collidables);
  // Additional cherry trees scattered around
  _addCherryBlossomTree(scene, new THREE.Vector3(6,0,-16), collidables);
  _addCherryBlossomTree(scene, new THREE.Vector3(-12,0,9), collidables);
  _addCherryBlossomTree(scene, new THREE.Vector3(3,0,-22), collidables);
  _addCherryBlossomTree(scene, new THREE.Vector3(-20,0,-14), collidables);
  _addCherryBlossomTree(scene, new THREE.Vector3(16,0,12), collidables);
  const tablePos = _addReadingTable(scene, new THREE.Vector3(-3,0,1));
  _addPond(scene, new THREE.Vector3(9,0,-6));
  _addBridge(scene, new THREE.Vector3(9,0,-6), collidables);
  _addToriiGate(scene, new THREE.Vector3(0,0,20), collidables);
  _addBambooGrove(scene, new THREE.Vector3(-15,0,-5), collidables);
  _addLanterns(scene, lights);
  const stallPos = _addCoffeeStall(scene, new THREE.Vector3(11,0,4), collidables);
  _addExtras(scene);

  return { lights, collidables, tablePos, stallPos, clouds };
}

// ── Sky ──────────────────────────────────────────────────────────────────────
function _addSky(scene) {
  const geo = new THREE.SphereGeometry(260, 48, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: skyUniforms,
    vertexShader: `
      varying vec3 vWorldPos;
      void main(){
        vWorldPos=(modelMatrix*vec4(position,1.0)).xyz;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }`,
    fragmentShader: `
      uniform vec3  u_zenith, u_mid, u_horizon, u_low, u_sunDir;
      uniform float u_nightBlend, u_overcast, u_rainBlend;
      varying vec3 vWorldPos;
      float hash(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5); }
      void main(){
        vec3 dir=normalize(vWorldPos);
        float h=dir.y;

        // Sky gradient
        vec3 sky;
        if(h>0.38)        sky=mix(u_mid,    u_zenith, smoothstep(0.38,0.85,h));
        else if(h>-0.02)  sky=mix(u_horizon,u_mid,    smoothstep(-0.02,0.38,h));
        else              sky=mix(u_low,    u_horizon, smoothstep(-0.25,-0.02,h));

        // Horizon atmospheric scatter
        float hg=exp(-abs(h)*6.5)*0.55;
        sky+=hg*u_low*0.5;

        // Sun
        vec3 sd3=normalize(u_sunDir);
        float sd=dot(dir,sd3);
        sky+=smoothstep(0.9992,1.0,sd)*vec3(2.2,1.9,1.0);
        sky+=pow(max(0.0,sd),6.0)*u_low*0.55;
        sky+=pow(max(0.0,sd),24.0)*u_low*0.3;

        // Stars (evening)
        float sv=smoothstep(0.1,0.6,h)*u_nightBlend;
        float st=step(0.979,hash(floor(dir*380.0)));
        sky+=st*sv*vec3(0.7,0.8,1.0)*0.8;

        // Moon (evening)
        vec3 md3=normalize(vec3(-0.55,0.72,-0.42));
        float md=dot(dir,md3);
        sky+=smoothstep(0.9993,1.0,md)*vec3(0.95,0.95,1.10)*1.8*u_nightBlend;
        sky+=pow(max(0.0,md),14.0)*vec3(0.5,0.5,0.75)*0.25*u_nightBlend;

        // Rain/overcast
        sky=mix(sky,sky*vec3(0.4,0.45,0.5),u_overcast*0.6);
        sky=mix(sky,sky*0.55,u_rainBlend*0.5);

        gl_FragColor=vec4(sky,1.0);
      }`,
  });
  scene.add(new THREE.Mesh(geo, mat));
}

// ── Fog ──────────────────────────────────────────────────────────────────────
function _addFog(scene) {
  scene.fog = new THREE.FogExp2(0xadd8f5, 0.008);
}

// ── Lights ───────────────────────────────────────────────────────────────────
function _addLights(scene) {
  const lights = {};

  lights.hemi = new THREE.HemisphereLight(0x7ac0ff, 0x3a5020, 0.7);
  scene.add(lights.hemi);

  lights.sun = new THREE.DirectionalLight(0xfff3e0, 2.2);
  lights.sun.position.set(48, 60, -40);
  lights.sun.castShadow = true;
  lights.sun.shadow.mapSize.set(4096, 4096);
  lights.sun.shadow.camera.near = 1;
  lights.sun.shadow.camera.far  = 160;
  const sc = lights.sun.shadow.camera;
  sc.left = sc.bottom = -65; sc.right = sc.top = 65;
  lights.sun.shadow.bias   = -0.0007;
  lights.sun.shadow.radius = 2;
  scene.add(lights.sun);

  lights.rim = new THREE.DirectionalLight(0x4466bb, 0.4);
  lights.rim.position.set(-30, 20, 20);
  scene.add(lights.rim);

  lights.tableSpot = new THREE.SpotLight(0xffcc88, 1.4, 10, Math.PI/4, 0.6);
  lights.tableSpot.position.set(-3, 6, 1);
  lights.tableSpot.target.position.set(-3, 0, 1);
  scene.add(lights.tableSpot); scene.add(lights.tableSpot.target);

  lights.lanternLights = [];
  return lights;
}

// ── Ground ───────────────────────────────────────────────────────────────────
function _addGround(scene) {
  const grassTex = makeGrassTexture();
  const geo = new THREE.PlaneGeometry(250, 250, 100, 100);
  const pos = geo.attributes.position;
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),z=pos.getY(i);
    if(Math.sqrt(x*x+z*z)>5){
      pos.setZ(i,
        Math.sin(x*.22)*.35+Math.cos(z*.28)*.28+Math.sin((x+z)*.15)*.18
      );
    }
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    map: grassTex, roughness: 0.95, metalness: 0, color: 0x3a6020,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI/2; mesh.receiveShadow = true;
  scene.add(mesh);
}

// ── Stone path ───────────────────────────────────────────────────────────────
function _addPath(scene) {
  const stoneTex = makeStoneTexture();
  const mat = new THREE.MeshStandardMaterial({
    map: stoneTex, roughness: 0.9, metalness: 0, color: 0x8a7a66,
  });
  for(let z=-12;z<22;z+=1.55){
    const stone = new THREE.Mesh(
      new THREE.CylinderGeometry(randF(.3,.48),randF(.32,.5),.1,randI(6,10)), mat
    );
    stone.position.set(randF(-.3,.3),.05,z);
    stone.rotation.y=randF(0,Math.PI);
    stone.receiveShadow=true; scene.add(stone);
  }
}

// ── Mountains (3 layered ranges) ─────────────────────────────────────────────
function _addMountains(scene) {
  const layers = [
    { z:-95, w:350, d:70, res:55, hScale:55, color:0x1a1230 },
    { z:-62, w:280, d:55, res:45, hScale:36, color:0x1a2840 },
    { z:-40, w:220, d:45, res:38, hScale:22, color:0x1a3a20 },
  ];

  layers.forEach(({ z, w, d, res, hScale, color }) => {
    const geo = new THREE.PlaneGeometry(w, d, res, Math.floor(res/2));
    const pos = geo.attributes.position;

    for(let i=0;i<pos.count;i++){
      const x = pos.getX(i);
      const y = pos.getY(i);  // depth in local plane space

      let h = 0;
      h += Math.sin(x*.025+1.3)*Math.cos(y*.03)*.38;
      h += Math.sin(x*.05+2.1) *Math.cos(y*.06+1.2)*.26;
      h += Math.sin(x*.1+3.0)  *Math.cos(y*.12+2.5)*.18;
      h += Math.sin(x*.2+.5)   *Math.cos(y*.2+.8)  *.11;
      h += Math.abs(Math.sin(x*.035+.7))*.26;
      h += Math.abs(Math.sin(x*.06+1.5))*.16;
      h += Math.abs(Math.sin(x*.12+.4)) *.10;

      const relY  = y / (d/2);
      const falloff = Math.max(0, 1 - relY*relY*1.4);
      pos.setZ(i, Math.max(0, h*hScale*falloff));
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.96, metalness: 0, fog: true });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI/2;
    mesh.position.set(0, 0, z);
    scene.add(mesh);

    // Snow caps on far mountains
    if(hScale > 35){
      const snowMat = new THREE.MeshStandardMaterial({ color:0xe8eeff, roughness:0.8, fog:true });
      const snowGeo = new THREE.PlaneGeometry(w, d, res, Math.floor(res/2));
      const sp = snowGeo.attributes.position;
      for(let i=0;i<sp.count;i++){
        const x=sp.getX(i), y=sp.getY(i);
        let h=0;
        h+=Math.sin(x*.025+1.3)*Math.cos(y*.03)*.38;
        h+=Math.sin(x*.05+2.1)*Math.cos(y*.06+1.2)*.26;
        h+=Math.sin(x*.1+3.0)*Math.cos(y*.12+2.5)*.18;
        h+=Math.abs(Math.sin(x*.035+.7))*.26;
        h+=Math.abs(Math.sin(x*.06+1.5))*.16;
        const relY=y/(d/2), fo=Math.max(0,1-relY*relY*1.4);
        const ht=Math.max(0,h*hScale*fo);
        sp.setZ(i, ht > hScale*0.62 ? ht + 0.3 : -100); // hide below snow line
      }
      snowGeo.computeVertexNormals();
      const snowMesh = new THREE.Mesh(snowGeo, snowMat);
      snowMesh.rotation.x=-Math.PI/2; snowMesh.position.set(0,0.3,z);
      scene.add(snowMesh);
    }
  });
}

// ── Instanced Pine Forest ────────────────────────────────────────────────────
function _addForest(scene) {
  const COUNT  = 200;
  const dummy  = new THREE.Object3D();

  const trunkGeo  = new THREE.CylinderGeometry(.08,.16,2.2,6);
  const c1Geo     = new THREE.ConeGeometry(2.0,2.8,7);
  const c2Geo     = new THREE.ConeGeometry(1.5,2.2,7);
  const c3Geo     = new THREE.ConeGeometry(0.9,1.6,7);
  const broadGeo  = new THREE.SphereGeometry(1,6,5);

  const trunkMat  = new THREE.MeshStandardMaterial({ color:0x3a1a08, roughness:.9 });
  const pineMat   = new THREE.MeshStandardMaterial({ color:0x1a4a1a, roughness:.85 });
  const broadMat  = new THREE.MeshStandardMaterial({ color:0x2e6020, roughness:.85 });

  const trunkM = new THREE.InstancedMesh(trunkGeo, trunkMat, COUNT);
  const c1M    = new THREE.InstancedMesh(c1Geo, pineMat, COUNT);
  const c2M    = new THREE.InstancedMesh(c2Geo, pineMat, COUNT);
  const c3M    = new THREE.InstancedMesh(c3Geo, pineMat, COUNT);
  const brdM   = new THREE.InstancedMesh(broadGeo, broadMat, COUNT);

  for(let i=0;i<COUNT;i++){
    let x, z;
    const side = i % 4;
    const sc   = randF(.7, 1.9);

    if(side===0){ x=randF(-80,80); z=randF(-130,-28); }
    else if(side===1){ x=randF(22,72); z=randF(-55,35); }
    else if(side===2){ x=randF(-72,-22); z=randF(-55,35); }
    else { x=randF(-80,80); z=randF(30,90); }

    const useBroad = Math.random() < 0.25;
    dummy.rotation.y = randF(0, Math.PI*2);

    // Trunk
    dummy.position.set(x, sc, z);
    dummy.scale.set(sc, sc, sc);
    dummy.updateMatrix();
    trunkM.setMatrixAt(i, dummy.matrix);

    if(useBroad){
      // Broad leaf tree
      dummy.position.set(x, sc*2.8, z);
      dummy.scale.set(sc*1.2, sc*.9, sc*1.2);
      dummy.updateMatrix(); brdM.setMatrixAt(i, dummy.matrix);
      // Hide pine layers
      dummy.position.set(x,-999,z); dummy.scale.setScalar(.001);
      dummy.updateMatrix();
      c1M.setMatrixAt(i,dummy.matrix); c2M.setMatrixAt(i,dummy.matrix); c3M.setMatrixAt(i,dummy.matrix);
    } else {
      dummy.scale.set(sc,sc,sc);
      dummy.position.set(x, sc*2.2+.4, z); dummy.updateMatrix(); c1M.setMatrixAt(i,dummy.matrix);
      dummy.position.set(x, sc*3.4+.4, z); dummy.updateMatrix(); c2M.setMatrixAt(i,dummy.matrix);
      dummy.position.set(x, sc*4.4+.4, z); dummy.updateMatrix(); c3M.setMatrixAt(i,dummy.matrix);
      dummy.position.set(x,-999,z); dummy.scale.setScalar(.001);
      dummy.updateMatrix(); brdM.setMatrixAt(i,dummy.matrix);
    }
  }

  [trunkM,c1M,c2M,c3M,brdM].forEach(m=>{
    m.instanceMatrix.needsUpdate=true;
    m.castShadow=true;
    scene.add(m);
  });
}

// ── Large Lake ───────────────────────────────────────────────────────────────
function _addLake(scene) {
  // Basin
  const basinMat = new THREE.MeshStandardMaterial({ color:0x080e18, roughness:.9 });
  const basin = new THREE.Mesh(new THREE.PlaneGeometry(38,28), basinMat);
  basin.rotation.x=-Math.PI/2; basin.position.set(-28,-0.15,-32); scene.add(basin);

  // Shoreline dirt
  const shoreMat = new THREE.MeshStandardMaterial({ color:0x3a2e1e, roughness:.9 });
  const shore = new THREE.Mesh(new THREE.PlaneGeometry(42,32), shoreMat);
  shore.rotation.x=-Math.PI/2; shore.position.set(-28,-0.06,-32); scene.add(shore);

  // Water
  const wGeo = new THREE.PlaneGeometry(36, 26, 40, 30);
  const wMat = new THREE.ShaderMaterial({
    uniforms:{
      ...waterUniforms,
      waterColor:{value:new THREE.Color(0x0d4a6a)},
      deepColor: {value:new THREE.Color(0x040d1a)},
    },
    transparent:true, side:THREE.DoubleSide,
    vertexShader:`
      uniform float time; varying vec2 vUv; varying float vWave;
      void main(){
        vUv=uv; vec3 p=position;
        float w=sin(p.x*1.5+time*1.4)*.06+sin(p.y*2.0+time*1.8)*.05+cos((p.x+p.y)*1.2+time)*.035;
        p.z+=w; vWave=w;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
      }`,
    fragmentShader:`
      uniform float time; uniform vec3 waterColor,deepColor;
      varying vec2 vUv; varying float vWave;
      void main(){
        vec2 uv=vUv; float d=length(uv-.5);
        float c1=sin(uv.x*12.+time*2.)*sin(uv.y*10.+time*1.6);
        float c2=cos(uv.x*8.-time*1.8)*cos(uv.y*9.+time*2.2);
        float caustic=(c1+c2)*.5*.5+.5;
        vec3 col=mix(deepColor,waterColor,caustic*.35+.25);
        col+=smoothstep(.46,.5,d)*.12;
        float sp=step(.94,sin(uv.x*50.+time*5.)*sin(uv.y*45.+time*3.5)*.5+.5);
        col+=sp*vec3(.5,.75,1.)*.35;
        gl_FragColor=vec4(col,.8);
      }`,
  });
  const water = new THREE.Mesh(wGeo, wMat);
  water.rotation.x=-Math.PI/2; water.position.set(-28,0.02,-32); scene.add(water);

  // Lily pads on lake
  const padMat=new THREE.MeshStandardMaterial({color:0x2d5e1a,roughness:.9,side:THREE.DoubleSide});
  for(let i=0;i<12;i++){
    const a=Math.random()*Math.PI*2, r=randF(2,15);
    const pad=new THREE.Mesh(new THREE.CircleGeometry(randF(.3,.6),10),padMat);
    pad.rotation.x=-Math.PI/2;
    pad.position.set(-28+Math.cos(a)*r,.03,-32+Math.sin(a)*r);
    scene.add(pad);
  }
}

// ── Clouds ───────────────────────────────────────────────────────────────────
function _addClouds(scene) {
  const cloudTex = makeCloudTexture();
  const clouds   = [];

  for(let i=0;i<16;i++){
    const mat = new THREE.SpriteMaterial({
      map:cloudTex, transparent:true, opacity:randF(.45,.75),
      depthWrite:false, fog:false,
    });
    const s = new THREE.Sprite(mat);
    const scX = randF(20,55), scY = randF(9,22);
    s.scale.set(scX, scY, 1);
    s.position.set(randF(-110,110), randF(22,55), randF(-120,5));
    scene.add(s);
    clouds.push({ sprite:s, speed:randF(.4,1.6) });
  }
  return clouds;
}

// ── Cherry Blossom Tree ───────────────────────────────────────────────────────
function _addCherryBlossomTree(scene, pos, collidables) {
  const group = new THREE.Group(); group.position.copy(pos);
  const barkTex = makeBarkTexture();
  const trunkMat = new THREE.MeshStandardMaterial({map:barkTex,roughness:.9,metalness:0,color:0x4a2e18});

  [[1.5,.04,.0],[3.5,-.06,.03],[5.0,.05,-.04]].forEach(([y,rx,rz])=>{
    const r1=[.32,.22,.14][Math.round((y-1.5)/1.5)];
    const r2=[.42,.30,.22][Math.round((y-1.5)/1.5)];
    const h= [3.0,2.5,2.0][Math.round((y-1.5)/1.5)];
    const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,10),trunkMat);
    m.position.y=y; m.rotation.x=rx; m.rotation.z=rz;
    m.castShadow=true; group.add(m);
  });

  [[1.4,5.2,.6,.1,.15,2.5],[-1.2,5.5,.4,.09,.13,2.2],[.5,5.,-1.3,.09,.13,2.4],
   [-.8,5.8,1.1,.07,.10,2.0],[1.8,4.8,-.5,.07,.10,1.8]].forEach(([x,y,z,r1,r2,l])=>{
    const b=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,l,7),trunkMat);
    b.position.set(x*.4,y,z*.4); b.lookAt(new THREE.Vector3(x,y+.2,z));
    b.rotateX(Math.PI/2); b.castShadow=true; group.add(b);
  });

  const petalMat = new THREE.MeshStandardMaterial({
    color:0xffb7c5,emissive:0xff7a90,emissiveIntensity:.12,
    roughness:.8,metalness:0,transparent:true,opacity:.88,side:THREE.DoubleSide,
  });
  [[0,7.8,0,2.8],[-2.2,7.0,.5,2.0],[1.8,7.2,-.6,2.1],[.6,6.2,1.8,1.8],
   [-1.8,6.0,-1.2,1.9],[0,9.0,0,1.8],[1.0,8.4,1.2,1.5],[-.8,8.5,-.8,1.6],
   [2.2,6.8,.8,1.4],[-.4,6.5,2.4,1.5],[1.5,5.8,-1.5,1.4],[-2.0,8.0,1.0,1.3]
  ].forEach(([x,y,z,r])=>{
    const m=new THREE.Mesh(new THREE.IcosahedronGeometry(r,2),petalMat);
    m.position.set(x,y,z); m.rotation.set(randF(0,1),randF(0,1),randF(0,1));
    m.castShadow=true; group.add(m);
  });
  const glow=new THREE.PointLight(0xff88aa,.8,8); glow.position.set(0,6.5,0); group.add(glow);
  scene.add(group);
  collidables.push({pos:new THREE.Vector3(pos.x,0,pos.z),radius:.8});
}

// ── Reading Table ─────────────────────────────────────────────────────────────
function _addReadingTable(scene, pos) {
  const group=new THREE.Group(); group.position.copy(pos);
  const woodTex=makeWoodTexture();
  const wood    =new THREE.MeshStandardMaterial({map:woodTex,roughness:.8,metalness:0,color:0x8b5e3c});
  const darkWood=new THREE.MeshStandardMaterial({map:woodTex,roughness:.9,metalness:0,color:0x5a3a18});

  const top=new THREE.Mesh(new THREE.BoxGeometry(2.4,.1,1.5),wood);
  top.position.y=.38; top.castShadow=true; top.receiveShadow=true; group.add(top);
  const trim=new THREE.Mesh(new THREE.BoxGeometry(2.5,.04,1.6),darkWood);
  trim.position.y=.32; group.add(trim);

  [[-.95,-.62],[-.95,.62],[.95,-.62],[.95,.62]].forEach(([x,z])=>{
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.36,6),darkWood);
    leg.position.set(x,.18,z); group.add(leg);
  });

  const cushMat=new THREE.MeshStandardMaterial({color:0xb02a20,roughness:.85});
  const cush=new THREE.Mesh(new THREE.BoxGeometry(1.1,.1,1.0),cushMat);
  cush.position.set(0,.05,1.0); group.add(cush);
  const tuffMat=new THREE.MeshStandardMaterial({color:0x7a1a10});
  [[-.3,.5],[.3,.5],[-.3,1.5],[.3,1.5]].forEach(([x,z])=>{
    const t=new THREE.Mesh(new THREE.SphereGeometry(.03,6,4),tuffMat);
    t.position.set(x,.1,z); group.add(t);
  });

  _makeTableLantern(group, new THREE.Vector3(.75,.43,0));
  _makeBook(group, new THREE.Vector3(-.4,.44,0));
  scene.add(group);
  return pos.clone();
}

function _makeTableLantern(parent, pos) {
  const g=new THREE.Group(); g.position.copy(pos);
  const paperTex=makePaperTexture();
  const mat=new THREE.MeshStandardMaterial({map:paperTex,color:0xff5500,emissive:0xff2200,emissiveIntensity:.6,transparent:true,opacity:.75,roughness:.7});
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,.24,10),mat));
  const capMat=new THREE.MeshStandardMaterial({color:0x2c1400,roughness:.9});
  [.14,-.14].forEach(y=>{
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(.13,.08,.04,10),capMat);
    cap.position.y=y; g.add(cap);
  });
  const pl=new THREE.PointLight(0xff8833,.9,4); g.add(pl);
  parent.add(g);
}

function _makeBook(parent, pos) {
  const g=new THREE.Group(); g.position.copy(pos);
  const coverMat=new THREE.MeshStandardMaterial({color:0x2c3e6e,roughness:.7});
  const pageMat =new THREE.MeshStandardMaterial({color:0xf8f0e0,roughness:.9});
  g.add(new THREE.Mesh(new THREE.BoxGeometry(.55,.04,.75),coverMat));
  const pages=new THREE.Mesh(new THREE.BoxGeometry(.5,.03,.7),pageMat);
  pages.position.y=.035; g.add(pages);
  parent.add(g);
}

// ── Pond & Water ─────────────────────────────────────────────────────────────
function _addPond(scene, center) {
  const basinMat=new THREE.MeshStandardMaterial({color:0x1a2e22,roughness:.8});
  const basin=new THREE.Mesh(new THREE.CylinderGeometry(5.8,5.2,.5,40),basinMat);
  basin.position.copy(center); basin.position.y=-.25;
  basin.receiveShadow=true; scene.add(basin);

  const wGeo=new THREE.CircleGeometry(5.2,48);
  const wMat=new THREE.ShaderMaterial({
    uniforms:{...waterUniforms,waterColor:{value:new THREE.Color(0x1a6a8a)},deepColor:{value:new THREE.Color(0x0a2535)}},
    transparent:true, side:THREE.DoubleSide,
    vertexShader:`
      uniform float time; varying vec2 vUv; varying float vWave;
      void main(){
        vUv=uv; vec3 p=position;
        float w=sin(p.x*2.2+time*1.8)*.04+sin(p.y*3.1+time*2.4)*.03+cos((p.x+p.y)*1.6+time)*.025;
        p.z+=w; vWave=w; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
      }`,
    fragmentShader:`
      uniform float time; uniform vec3 waterColor,deepColor;
      varying vec2 vUv; varying float vWave;
      void main(){
        vec2 uv=vUv; float d=length(uv-.5);
        float c1=sin(uv.x*14.+time*2.2)*sin(uv.y*12.+time*1.7);
        float c2=cos(uv.x*9.-time*1.9)*cos(uv.y*11.+time*2.5);
        float caustic=(c1+c2)*.5*.5+.5;
        vec3 col=mix(deepColor,waterColor,caustic*.4+.3);
        col+=smoothstep(.45,.5,d)*.15;
        float sp=step(.93,sin(uv.x*60.+time*6.)*sin(uv.y*55.+time*4.)*.5+.5);
        col+=sp*vec3(.6,.8,1.)*.4;
        gl_FragColor=vec4(col,.78);
      }`,
  });
  const water=new THREE.Mesh(wGeo,wMat);
  water.rotation.x=-Math.PI/2; water.position.copy(center); water.position.y=.01; scene.add(water);

  const padMat=new THREE.MeshStandardMaterial({color:0x2d5e1a,roughness:.9,side:THREE.DoubleSide});
  const flowerMat=new THREE.MeshStandardMaterial({color:0xffccdd,emissive:0xff88aa,emissiveIntensity:.3});
  for(let i=0;i<8;i++){
    const a=(i/8)*Math.PI*2, r=randF(1.5,4.2);
    const pad=new THREE.Mesh(new THREE.CircleGeometry(randF(.22,.42),10),padMat);
    pad.rotation.x=-Math.PI/2;
    pad.position.set(center.x+Math.cos(a)*r,.025,center.z+Math.sin(a)*r);
    scene.add(pad);
    if(Math.random()>.5){
      const flower=new THREE.Mesh(new THREE.SphereGeometry(.06,6,4),flowerMat);
      flower.position.set(center.x+Math.cos(a)*r,.07,center.z+Math.sin(a)*r);
      scene.add(flower);
    }
  }
}

// ── Bridge ────────────────────────────────────────────────────────────────────
function _addBridge(scene, pondCenter, collidables) {
  const woodTex=makeWoodTexture();
  const wood =new THREE.MeshStandardMaterial({map:woodTex,color:0x7a4a20,roughness:.85});
  const railMat=new THREE.MeshStandardMaterial({color:0x9b2020,roughness:.7});
  const group=new THREE.Group();
  const bx=pondCenter.x+6.5;

  for(let i=-4;i<=4;i++){
    const plank=new THREE.Mesh(new THREE.BoxGeometry(1.9,.09,.34),wood);
    plank.position.set(bx,.52+Math.sin((i+4)/8*Math.PI)*.3,pondCenter.z+i*.35);
    plank.castShadow=true; plank.receiveShadow=true; group.add(plank);
  }
  [-.88,.88].forEach(x=>{
    const rail=new THREE.Mesh(new THREE.BoxGeometry(.07,.5,3.1),railMat);
    rail.position.set(bx+x,.88,pondCenter.z); group.add(rail);
    [-1.5,0,1.5].forEach(z=>{
      const post=new THREE.Mesh(new THREE.BoxGeometry(.09,.62,.09),railMat);
      post.position.set(bx+x,.85,pondCenter.z+z); group.add(post);
    });
  });
  scene.add(group);
  collidables.push({pos:new THREE.Vector3(bx,0,pondCenter.z),radius:1.1});
}

// ── Torii Gate ────────────────────────────────────────────────────────────────
function _addToriiGate(scene, pos, collidables) {
  const mat    =new THREE.MeshStandardMaterial({color:0xcc2200,roughness:.55,metalness:.08});
  const darkMat=new THREE.MeshStandardMaterial({color:0x1a0800,roughness:.8});

  [-1.7,1.7].forEach(x=>{
    const p=new THREE.Mesh(new THREE.CylinderGeometry(.2,.24,6.5,12),mat);
    p.position.set(pos.x+x,3.25,pos.z); p.castShadow=true; scene.add(p);
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.4,.45,.3,8),darkMat);
    base.position.set(pos.x+x,.15,pos.z); scene.add(base);
    collidables.push({pos:new THREE.Vector3(pos.x+x,0,pos.z),radius:.35});
  });

  const kasagi=new THREE.Mesh(new THREE.BoxGeometry(4.6,.3,.38),mat);
  kasagi.position.set(pos.x,6.45,pos.z); scene.add(kasagi);
  [-1,1].forEach(s=>{
    const cap=new THREE.Mesh(new THREE.BoxGeometry(.38,.14,.38),mat);
    cap.position.set(pos.x+s*2.25,6.52,pos.z); scene.add(cap);
  });
  scene.add(new THREE.Mesh(new THREE.BoxGeometry(4.8,.12,.42),
    new THREE.MeshStandardMaterial({color:0x1a0800,roughness:.8})
  )).position.set?scene.children[scene.children.length-1].position.set(pos.x,6.78,pos.z):null;

  const shimagi=new THREE.Mesh(new THREE.BoxGeometry(4.8,.12,.42),darkMat);
  shimagi.position.set(pos.x,6.78,pos.z); scene.add(shimagi);
  const nuki=new THREE.Mesh(new THREE.BoxGeometry(3.7,.22,.3),mat);
  nuki.position.set(pos.x,5.2,pos.z); scene.add(nuki);

  const stoneMat=new THREE.MeshStandardMaterial({color:0x888888,roughness:.95});
  [-.6,.6].forEach(x=>{
    const stone=new THREE.Mesh(new THREE.BoxGeometry(.4,.3,.3),stoneMat);
    stone.position.set(pos.x+x*2.5,.15,pos.z+.5); scene.add(stone);
  });
}

// ── Bamboo Grove ──────────────────────────────────────────────────────────────
function _addBambooGrove(scene, pos, collidables) {
  const stalkMat=new THREE.MeshStandardMaterial({color:0x4a8034,roughness:.7});
  const nodeMat =new THREE.MeshStandardMaterial({color:0x3a6528,roughness:.8});
  const leafMat =new THREE.MeshStandardMaterial({color:0x5aaa38,roughness:.8,transparent:true,opacity:.85,side:THREE.DoubleSide});

  for(let i=0;i<22;i++){
    const ox=pos.x+randF(-5.5,5.5), oz=pos.z+randF(-5.5,5.5);
    const h=randF(5,10);
    const stalk=new THREE.Mesh(new THREE.CylinderGeometry(.075,.1,h,8),stalkMat);
    stalk.position.set(ox,h/2,oz);
    stalk.rotation.z=randF(-.08,.08); stalk.rotation.x=randF(-.08,.08);
    stalk.castShadow=true; scene.add(stalk);
    for(let n=.6;n<h;n+=randF(.65,.9)){
      const node=new THREE.Mesh(new THREE.CylinderGeometry(.082,.082,.07,8),nodeMat);
      node.position.set(ox,n,oz); scene.add(node);
    }
    for(let l=0;l<4;l++){
      const lf=new THREE.Mesh(new THREE.SphereGeometry(randF(.3,.65),5,3),leafMat);
      lf.scale.y=.28;
      lf.position.set(ox+randF(-.7,.7),h+randF(-.7,.2),oz+randF(-.7,.7));
      scene.add(lf);
    }
    if(i<14) collidables.push({pos:new THREE.Vector3(ox,0,oz),radius:.22});
  }
}

// ── Lanterns ─────────────────────────────────────────────────────────────────
function _addLanterns(scene, lights) {
  const paperTex=makePaperTexture(), woodTex=makeWoodTexture();

  const positions=[[-2.2,0,5],[2.2,0,8.5],[-2.2,0,11.5],[2.2,0,14.5],[0,0,17.5]];
  positions.forEach(([x,,z],idx)=>{
    const g=new THREE.Group(); g.position.set(x,0,z);
    const poleMat=new THREE.MeshStandardMaterial({map:woodTex,color:0x3a2010,roughness:.9});
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.045,.06,3.2,8),poleMat);
    pole.position.y=1.6; pole.castShadow=true; g.add(pole);

    const lanMat=new THREE.MeshStandardMaterial({map:paperTex,color:0xff4400,emissive:0xff2200,emissiveIntensity:.7,transparent:true,opacity:.72,roughness:.6});
    const body=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.45,8),lanMat);
    body.position.y=3.08; g.add(body);

    for(let r=0;r<4;r++){
      const rib=new THREE.Mesh(new THREE.BoxGeometry(.012,.46,.012),new THREE.MeshStandardMaterial({color:0x8b3000,roughness:.9}));
      rib.position.y=3.08; rib.rotation.y=r*Math.PI/4;
      rib.position.x=Math.cos(r*Math.PI/4)*.21; rib.position.z=Math.sin(r*Math.PI/4)*.21;
      g.add(rib);
    }

    const capMat=new THREE.MeshStandardMaterial({color:0x1a0800,roughness:.85});
    [2.87,3.32].forEach(y=>{
      const cap=new THREE.Mesh(new THREE.CylinderGeometry(.26,.18,.09,8),capMat);
      cap.position.y=y; g.add(cap);
    });

    const tassel=new THREE.Mesh(new THREE.CylinderGeometry(.012,.004,.2,5),new THREE.MeshStandardMaterial({color:0xcc2200,roughness:.9}));
    tassel.position.y=2.72; g.add(tassel);
    scene.add(g);

    const pl=new THREE.PointLight(0xff8833,2.0,7.0,2);
    pl.position.set(x,3.1,z); scene.add(pl);
    lights.lanternLights.push({light:pl,phase:idx*1.3});
  });
}

// ── Coffee Stall ──────────────────────────────────────────────────────────────
function _addCoffeeStall(scene, pos, collidables) {
  const group=new THREE.Group(); group.position.copy(pos);
  const woodTex=makeWoodTexture();
  const wood    =new THREE.MeshStandardMaterial({map:woodTex,color:0x6b3d1e,roughness:.85});
  const darkWood=new THREE.MeshStandardMaterial({map:woodTex,color:0x2c1a0e,roughness:.9});
  const clothMat=new THREE.MeshStandardMaterial({color:0xcc2200,roughness:.9});

  const base=new THREE.Mesh(new THREE.BoxGeometry(4.0,1.1,2.0),wood);
  base.position.y=.55; base.castShadow=true; base.receiveShadow=true; group.add(base);
  const counter=new THREE.Mesh(new THREE.BoxGeometry(4.1,.09,2.1),darkWood);
  counter.position.y=1.14; group.add(counter);

  [[-1.8,-.9],[1.8,-.9]].forEach(([x,z])=>{
    const post=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,3.0,7),darkWood);
    post.position.set(x,1.5,z); group.add(post);
  });

  const awning=new THREE.Mesh(new THREE.BoxGeometry(4.1,.07,1.6),clothMat);
  awning.position.set(0,3.02,-.15); awning.rotation.x=-.18; group.add(awning);

  const stripeMat=new THREE.MeshStandardMaterial({color:0xf5ecd7,roughness:.9});
  for(let i=-1.6;i<=1.6;i+=.5){
    const s=new THREE.Mesh(new THREE.BoxGeometry(.09,.08,1.6),stripeMat);
    s.position.set(i,3.03,-.15); s.rotation.x=-.18; group.add(s);
  }

  const wall=new THREE.Mesh(new THREE.BoxGeometry(4.0,2.2,.1),darkWood);
  wall.position.set(0,1.1,-1.05); group.add(wall);

  const signMat=new THREE.MeshStandardMaterial({color:0xf0e0b8,roughness:.8});
  const sign=new THREE.Mesh(new THREE.BoxGeometry(1.2,.55,.05),signMat);
  sign.position.set(0,2.1,-1.07); group.add(sign);

  const potMat=new THREE.MeshStandardMaterial({color:0x222222,roughness:.4,metalness:.7});
  const pot=new THREE.Mesh(new THREE.CylinderGeometry(.16,.19,.42,12),potMat);
  pot.position.set(-1.0,1.38,0); group.add(pot);
  const spout=new THREE.Mesh(new THREE.CylinderGeometry(.022,.04,.32,8),potMat);
  spout.position.set(-1.18,1.54,0); spout.rotation.z=-.55; group.add(spout);
  const lidMat=new THREE.MeshStandardMaterial({color:0x888888,roughness:.3,metalness:.8});
  const lid=new THREE.Mesh(new THREE.CylinderGeometry(.1,.16,.06,10),lidMat);
  lid.position.set(-1.0,1.63,0); group.add(lid);

  const cupMat=new THREE.MeshStandardMaterial({color:0xf0e8d0,roughness:.6});
  [.4,.85,1.3].forEach(x=>{
    const cup=new THREE.Mesh(new THREE.CylinderGeometry(.08,.06,.14,10),cupMat);
    cup.position.set(x,1.26,.3); group.add(cup);
  });

  scene.add(group);
  collidables.push({pos:pos.clone(),radius:2.2});
  return pos.clone().add(new THREE.Vector3(-1.8,1.1,0));
}

// ── Flowing River ─────────────────────────────────────────────────────────────
function _addRiver(scene) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(28, 0, -60),
    new THREE.Vector3(24, 0, -42),
    new THREE.Vector3(28, 0, -26),
    new THREE.Vector3(22, 0, -10),
    new THREE.Vector3(26, 0,  4),
    new THREE.Vector3(24, 0, 20),
    new THREE.Vector3(28, 0, 38),
  ]);

  const SEGS = 130, WIDTH = 6.8;
  const pts  = curve.getPoints(SEGS);

  function buildStrip(widthScale, yOffset) {
    const pos = [], uvs = [], idx = [];
    for (let i = 0; i <= SEGS; i++) {
      const t    = i / SEGS;
      const next = Math.min(i + 1, SEGS);
      const tang = pts[next].clone().sub(pts[i]).normalize();
      if (tang.length() === 0) tang.set(0,0,1);
      const perp = new THREE.Vector3(-tang.z, 0, tang.x).normalize();
      const L = pts[i].clone().addScaledVector(perp, -WIDTH * widthScale * 0.5);
      const R = pts[i].clone().addScaledVector(perp,  WIDTH * widthScale * 0.5);
      L.y = R.y = yOffset;
      pos.push(L.x,L.y,L.z, R.x,R.y,R.z);
      uvs.push(0,t*30, 1,t*30);
      if (i < SEGS) { const b=i*2; idx.push(b,b+2,b+1, b+1,b+2,b+3); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos),3));
    geo.setAttribute('uv',       new THREE.BufferAttribute(new Float32Array(uvs),2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }

  // Bed (deep dark gravel)
  scene.add(new THREE.Mesh(buildStrip(1.05, -0.18),
    new THREE.MeshStandardMaterial({ color:0x1e1810, roughness:0.95 })
  ));

  // Banks (sandy soil wider strip)
  scene.add(new THREE.Mesh(buildStrip(2.2, -0.10),
    new THREE.MeshStandardMaterial({ color:0x4a3a26, roughness:0.95 })
  ));

  // Water surface — flowing shader
  const wGeo = buildStrip(1.0, 0.02);
  const wMat = new THREE.ShaderMaterial({
    uniforms: {
      time:       waterUniforms.time,
      deepCol:    { value: new THREE.Color(0x0a2535) },
      shallowCol: { value: new THREE.Color(0x1a5a7a) },
      foamCol:    { value: new THREE.Color(0x8ac8e0) },
    },
    transparent: true, side: THREE.DoubleSide,
    vertexShader: `
      varying vec2 vUv; varying vec3 vPos;
      void main(){
        vUv=uv; vPos=position;
        gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
      }`,
    fragmentShader: `
      uniform float time; uniform vec3 deepCol,shallowCol,foamCol;
      varying vec2 vUv; varying vec3 vPos;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
      void main(){
        vec2 fuv = vUv; fuv.y -= time*0.28;
        float c1=sin(fuv.x*14.+fuv.y*9.+time*2.2)*0.5+0.5;
        float c2=cos(fuv.x*9.-fuv.y*13.+time*1.7)*0.5+0.5;
        float caustic=c1*c2;
        vec3 col=mix(deepCol,shallowCol,caustic*0.55+0.15);
        // Edge foam
        float edge=smoothstep(0.38,0.50,abs(vUv.x-0.5)*2.0);
        col=mix(col,foamCol,edge*0.55);
        // Surface sparkles
        float sp=step(0.93,hash(floor(fuv*55.)));
        col+=sp*vec3(0.6,0.9,1.)*0.45;
        // Depth darkening in center
        float depth=1.0-smoothstep(0.0,0.45,abs(vUv.x-0.5)*2.0);
        col*=0.68+0.32*depth;
        gl_FragColor=vec4(col,0.84);
      }`,
  });
  scene.add(new THREE.Mesh(wGeo, wMat));

  // Rocks along banks
  const rMat = new THREE.MeshStandardMaterial({ color:0x5a5040, roughness:0.95 });
  for (let i=0; i<35; i++) {
    const t    = Math.random();
    const pt   = curve.getPoint(t);
    const tang = curve.getTangent(t).normalize();
    const perp = new THREE.Vector3(-tang.z,0,tang.x).normalize();
    const side = Math.random() > 0.5 ? 1 : -1;
    const off  = WIDTH * 0.52 + Math.random() * 2.8;
    const rp   = pt.clone().addScaledVector(perp, side * off);
    const r    = 0.10 + Math.random() * 0.38;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rMat);
    rock.position.set(rp.x, r*0.3, rp.z);
    rock.rotation.set(Math.random(),Math.random(),Math.random());
    rock.castShadow = true; scene.add(rock);
  }

  // Reeds / tall grass near banks
  const reedMat = new THREE.MeshStandardMaterial({ color:0x4a6a20, roughness:0.85, side:THREE.DoubleSide });
  for (let i=0; i<25; i++) {
    const t    = Math.random();
    const pt   = curve.getPoint(t);
    const tang = curve.getTangent(t).normalize();
    const perp = new THREE.Vector3(-tang.z,0,tang.x).normalize();
    const side = Math.random()>0.5?1:-1;
    const off  = WIDTH * 0.55 + Math.random() * 1.5;
    const rp   = pt.clone().addScaledVector(perp, side * off);
    const h    = 0.8 + Math.random() * 1.4;
    const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, h, 4), reedMat);
    reed.position.set(rp.x, h/2, rp.z);
    reed.rotation.set(randF(-.1,.1), Math.random()*Math.PI, randF(-.1,.1));
    scene.add(reed);
  }
}

// ── Extra world props ─────────────────────────────────────────────────────────
function _addExtras(scene) {
  const stoneMat=new THREE.MeshStandardMaterial({color:0x5a5040,roughness:.95});
  const mossMat =new THREE.MeshStandardMaterial({color:0x2a4a1a,roughness:.9});

  // Moss rocks
  [[6,0,4],[8,0,2],[-8,0,-1],[-6,0,3],[4,0,-8],[-4,0,-10],[10,0,-10],[-10,0,8]].forEach(([x,y,z])=>{
    const r=randF(.3,.8);
    const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(r,0),stoneMat);
    rock.position.set(x,r*.3,z); rock.rotation.set(randF(0,2),randF(0,2),randF(0,2));
    rock.castShadow=true; scene.add(rock);
    if(Math.random()>.4){
      const moss=new THREE.Mesh(new THREE.SphereGeometry(r*.55,5,4),mossMat);
      moss.position.set(x,r*.7,z); moss.scale.set(1,.4,1); scene.add(moss);
    }
  });

  // Extra stone lanterns off path
  const woodTex=makeWoodTexture(), paperTex=makePaperTexture();
  [[-5,0,-8],[12,0,0],[-12,0,12],[5,0,16]].forEach(([x,,z])=>{
    const g=new THREE.Group(); g.position.set(x,0,z);
    const poleMat=new THREE.MeshStandardMaterial({map:woodTex,color:0x3a2010,roughness:.9});
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(.04,.05,2.4,8),poleMat)).position.y=1.2;
    const lanMat=new THREE.MeshStandardMaterial({map:paperTex,color:0xff4400,emissive:0xff2200,emissiveIntensity:.55,transparent:true,opacity:.7});
    const body=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.34,8),lanMat);
    body.position.y=2.5; g.add(body);
    const capMat=new THREE.MeshStandardMaterial({color:0x1a0800,roughness:.85});
    [2.35,2.70].forEach(y=>{
      const cap=new THREE.Mesh(new THREE.CylinderGeometry(.20,.14,.07,8),capMat);
      cap.position.y=y; g.add(cap);
    });
    const pl=new THREE.PointLight(0xff8833,1.5,5.5,2); pl.position.set(x,2.5,z);
    scene.add(g); scene.add(pl);
  });

  // Small flowers near cherry tree
  const flMat=new THREE.MeshStandardMaterial({color:0xffddee,emissive:0xff88aa,emissiveIntensity:.2});
  for(let i=0;i<18;i++){
    const a=Math.random()*Math.PI*2, r=randF(1,4);
    const fl=new THREE.Mesh(new THREE.SphereGeometry(.06,5,4),flMat);
    fl.position.set(-3+Math.cos(a)*r,.05,-3+Math.sin(a)*r); scene.add(fl);
  }
}

// ── Per-frame world animation ─────────────────────────────────────────────────
export function animateWorld(lights, elapsed, delta, clouds) {
  lights.lanternLights.forEach(({light,phase})=>{
    light.intensity=1.7+.35*Math.sin(elapsed*2.2+phase)+.15*Math.sin(elapsed*5.5+phase*2);
  });
  waterUniforms.time.value   = elapsed;
  grassTimeUniform.value     = elapsed;  // drives grass wind shader

  if(clouds && delta){
    clouds.forEach(({sprite,speed})=>{
      sprite.position.x+=speed*delta;
      if(sprite.position.x>120) sprite.position.x=-120;
    });
  }
}
