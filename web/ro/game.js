// COCKRO MAN — RO-style field prototype (phase 1)
// Offline/local prototype: progress and COCKRO coin are stored on this device only.
import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const MAP = 40; // half size of playable field
const SAVE_KEY = 'cockro_ro_v1';

// ---------------------------------------------------------------- data
const ITEMS = {
  red_potion: { name: 'ยาแดง', icon: 10, type: 'use', hp: 60, desc: 'ฟื้นฟู HP 60' },
  blue_potion: { name: 'ยาฟ้า', icon: 11, type: 'use', sp: 25, desc: 'ฟื้นฟู SP 25' },
  crystal: { name: 'ผลึกแสงทุ่ง', icon: 9, type: 'etc', desc: 'วัตถุดิบ ใช้ตีบวกและแลกของในเมือง (เร็ว ๆ นี้)' },
  novice_blade: { name: 'ดาบฝึกหัด', icon: 0, type: 'equip', slot: 'weapon', wtype: 'sword', atk: 8, jobs: ['novice', 'sword', 'thief', 'merchant'], desc: 'ATK +8' },
  fire_sword: { name: 'ดาบเพลิงอัศวิน', icon: 0, type: 'equip', slot: 'weapon', wtype: 'sword', atk: 32, jobs: ['sword'], desc: 'ATK +32 • นักดาบ' },
  twin_dagger: { name: 'มีดคู่พิษมรกต', icon: 1, type: 'equip', slot: 'weapon', wtype: 'dagger', atk: 24, aspd: 0.82, jobs: ['thief'], desc: 'ATK +24 • ตีเร็ว • โจร' },
  crystal_bow: { name: 'ธนูคริสตัล', icon: 2, type: 'equip', slot: 'weapon', wtype: 'bow', atk: 27, jobs: ['archer'], desc: 'ATK +27 • ระยะไกล • นักธนู' },
  gold_hammer: { name: 'ค้อนทองคำ', icon: 3, type: 'equip', slot: 'weapon', wtype: 'hammer', atk: 38, aspd: 1.15, jobs: ['merchant'], desc: 'ATK +38 • ตีช้าแต่แรง • พ่อค้า' },
  bug_helm: { name: 'หมวกเกราะแมลง', icon: 4, type: 'equip', slot: 'head', def: 3, desc: 'DEF +3' },
  red_armor: { name: 'เกราะแดงนักรบ', icon: 5, type: 'equip', slot: 'body', def: 7, desc: 'DEF +7' },
  swift_boots: { name: 'บูทสายลม', icon: 6, type: 'equip', slot: 'feet', def: 1, flee: 5, desc: 'DEF +1 • FLEE +5' },
  jet_wings: { name: 'ปีกเจ็ทจิ๋ว', icon: 7, type: 'equip', slot: 'acc', agi: 3, luk: 2, desc: 'AGI +3 • LUK +2 (หายาก)' },
};
const SLOTS = [['weapon', 'อาวุธ'], ['head', 'หัว'], ['body', 'เกราะ'], ['feet', 'เท้า'], ['acc', 'ประดับ']];

const JOBS = {
  novice: { name: 'Novice', th: 'โนวิส', hpF: 1, spF: 1, range: 1.6 },
  sword: { name: 'Swordman', th: 'นักดาบ', hpF: 1.7, spF: 1, range: 1.7, weapon: 'fire_sword', icon: 0, desc: 'HP สูง ทนทาน ตีแรงด้วยดาบ เหมาะกับผู้เริ่มต้น' },
  thief: { name: 'Thief', th: 'โจร', hpF: 1.25, spF: 1, range: 1.5, weapon: 'twin_dagger', icon: 1, desc: 'ตีเร็ว หลบเก่ง มีโอกาสตี 2 ครั้ง และวางพิษ' },
  archer: { name: 'Archer', th: 'นักธนู', hpF: 1.1, spF: 1.2, range: 8, weapon: 'crystal_bow', icon: 2, desc: 'ยิงไกล ใช้ DEX เป็นพลังโจมตี ยิงสองดอกและฝนธนู' },
  merchant: { name: 'Merchant', th: 'พ่อค้า', hpF: 1.45, spF: 1, range: 1.7, weapon: 'gold_hammer', icon: 3, desc: 'ค้อนหนัก ตีแรงเป็นวง และได้โอกาสดรอปของมากขึ้น' },
};

// Skills: kind 'target' | 'self' | 'aoeTarget'
const SKILLS = {
  first_aid: { name: 'ปฐมพยาบาล', short: 'รักษา', sp: 3, cd: 1.5, kind: 'self', heal: 18 },
  bash: { name: 'Bash', short: 'Bash', sp: 8, cd: 0.9, kind: 'target', mult: 3.0 },
  magnum: { name: 'Magnum Break', short: 'Magnum', sp: 15, cd: 2.5, kind: 'self', mult: 2.0, radius: 3.6 },
  double_strafe: { name: 'Double Strafe', short: 'D.Strafe', sp: 12, cd: 0.8, kind: 'target', mult: 1.9, hits: 2 },
  arrow_shower: { name: 'Arrow Shower', short: 'A.Shower', sp: 15, cd: 2.0, kind: 'aoeTarget', mult: 1.6, radius: 3.2 },
  envenom: { name: 'Envenom', short: 'Envenom', sp: 12, cd: 1.2, kind: 'target', mult: 1.6, poison: 6 },
  steal_coin: { name: 'ฉกเหรียญ', short: 'Steal', sp: 10, cd: 6, kind: 'target', mult: 0.5, steal: true },
  hammer_fall: { name: 'Hammer Fall', short: 'H.Fall', sp: 20, cd: 3, kind: 'self', mult: 1.8, radius: 3.4, stun: 2 },
  power_smash: { name: 'ทุ่มสุดแรง', short: 'Smash', sp: 15, cd: 1.4, kind: 'target', mult: 4.0 },
};
const JOB_SKILLS = {
  novice: ['first_aid'],
  sword: ['bash', 'magnum', 'first_aid'],
  thief: ['envenom', 'steal_coin', 'first_aid'],
  archer: ['double_strafe', 'arrow_shower', 'first_aid'],
  merchant: ['power_smash', 'hammer_fall', 'first_aid'],
};

// sheet: 'mobs' (alien-forest 3x4, column per species, rows = frames) | 'beasts' (4x5 single frames)
const MOBS = {
  lava: { name: 'ด้วงลาวาจิ๋ว', sheet: 'mobs', col: 0, size: 1.7, lv: 1, hp: 50, atk: [5, 8], def: 0, flee: 2, hit: 5, exp: 7, jexp: 6, speed: 1.6, delay: 1.6, aggro: false,
    drops: [['red_potion', 9], ['crystal', 4], ['novice_blade', 0.5]], coin: 1.5 },
  flower: { name: 'ดอกหนวดพราย', sheet: 'mobs', col: 2, size: 1.9, lv: 3, hp: 85, atk: [8, 12], def: 2, flee: 4, hit: 8, exp: 13, jexp: 11, speed: 0.9, delay: 1.8, aggro: false,
    drops: [['red_potion', 7], ['blue_potion', 5], ['crystal', 6]], coin: 1.5 },
  snail: { name: 'หอยทากมรกต', sheet: 'beasts', c: 0, r: 1, size: 1.8, lv: 4, hp: 130, atk: [9, 14], def: 8, flee: 1, hit: 8, exp: 17, jexp: 14, speed: 0.8, delay: 2.0, aggro: false,
    drops: [['red_potion', 7], ['swift_boots', 0.7]], coin: 2 },
  crab: { name: 'ปูผลึกส้ม', sheet: 'mobs', col: 1, size: 1.9, lv: 6, hp: 190, atk: [14, 20], def: 12, flee: 6, hit: 14, exp: 28, jexp: 22, speed: 1.4, delay: 1.7, aggro: false,
    drops: [['crystal', 12], ['bug_helm', 0.9]], coin: 2 },
  wasp: { name: 'แตนเหล็กไน', sheet: 'beasts', c: 2, r: 1, size: 1.8, lv: 9, hp: 180, atk: [19, 27], def: 4, flee: 28, hit: 30, exp: 42, jexp: 34, speed: 3.2, delay: 1.3, aggro: true, fly: true,
    drops: [['blue_potion', 7], ['jet_wings', 0.35]], coin: 2.5 },
  spider: { name: 'แมงมุมเลือด', sheet: 'beasts', c: 3, r: 0, size: 2.1, lv: 12, hp: 320, atk: [26, 36], def: 10, flee: 14, hit: 32, exp: 70, jexp: 55, speed: 2.4, delay: 1.5, aggro: true,
    drops: [['red_potion', 12], ['red_armor', 0.6]], coin: 3 },
  mvp: { name: 'ราชันย์ตะขาบเพลิง', sheet: 'beasts', c: 2, r: 4, size: 5.2, lv: 22, hp: 5200, atk: [55, 85], def: 22, flee: 20, hit: 60, exp: 1800, jexp: 1300, speed: 2.1, delay: 1.4, aggro: true, mvp: true,
    drops: [['red_armor', 35], ['jet_wings', 18], ['swift_boots', 40], ['red_potion', 100]], coin: 100, coinAmt: [6, 14] },
};
const SPAWNS = [['lava', 9], ['flower', 6], ['snail', 5], ['crab', 5], ['wasp', 4], ['spider', 3]];
const MVP_FIRST = 150, MVP_RESPAWN = 600; // seconds

// ---------------------------------------------------------------- formulas (RO-inspired)
const baseNeed = (lv) => Math.floor(11 * Math.pow(lv, 1.85) + 8);
const jobNeed = (jl, job) => job === 'novice' ? Math.floor(6 * Math.pow(jl, 1.45) + 8) : Math.floor(14 * Math.pow(jl, 1.75) + 20);
const jobCap = (job) => job === 'novice' ? 10 : 50;
const statCost = (v) => Math.floor((v - 1) / 10) + 2;
const ptsPerLevel = (lv) => Math.floor(lv / 5) + 3;

const S = {}; // player state
function freshSave() {
  return { v: 1, lv: 1, jlv: 1, exp: 0, jexp: 0, job: 'novice', pts: 30,
    st: { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 },
    inv: { red_potion: 5, blue_potion: 2 }, equip: { weapon: 'novice_blade' }, coin: 0, hp: 9999, sp: 9999, sound: true, auto: false, mvpAt: 0 };
}
function load() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { d = null; }
  Object.assign(S, freshSave(), d && d.v === 1 ? d : {});
  S.st = Object.assign(freshSave().st, S.st || {});
}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }

function eqSum(k) { let t = 0; for (const s in S.equip) { const it = ITEMS[S.equip[s]]; if (it && it[k]) t += it[k]; } return t; }
function stat(k) { return S.st[k] + eqSum(k); }
function D() { // derived stats
  const j = JOBS[S.job], w = ITEMS[S.equip.weapon];
  const str = stat('str'), agi = stat('agi'), vit = stat('vit'), int = stat('int'), dex = stat('dex'), luk = stat('luk');
  const bow = w && w.wtype === 'bow';
  const main = bow ? dex : str, sub = bow ? str : dex;
  const atk = main + Math.pow(Math.floor(main / 10), 2) + Math.floor(sub / 5) + Math.floor(luk / 5) + (w ? w.atk : 0);
  const maxHp = Math.round((40 + S.lv * 9 * j.hpF + S.lv * S.lv * 0.5 * j.hpF) * (1 + vit / 100));
  const maxSp = Math.round((20 + S.lv * 3 * j.spF) * (1 + int / 100));
  const delay = Math.max(0.32, (1.3 - agi * 0.011 - dex * 0.003) * (w && w.aspd || 1));
  return { atk, maxHp, maxSp, def: eqSum('def') + Math.floor(vit / 2), hit: S.lv + dex + 10, flee: S.lv + agi + eqSum('flee'),
    crit: 1 + luk * 0.3, delay, aspd: (200 - delay * 50).toFixed(0), range: j.range, speed: 5.2 + agi * 0.015, matk: int };
}

// ---------------------------------------------------------------- renderer / scene
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9cc8ff);
scene.fog = new THREE.Fog(0xa9d2ff, 34, 70);
const camera = new THREE.PerspectiveCamera(32, 1, 0.5, 200);
let camDist = 26;
const CAM_DIR = new THREE.Vector3(0, 0.80, 0.60).normalize();

scene.add(new THREE.HemisphereLight(0xdff0ff, 0x5b6b2a, 1.15));
const sun = new THREE.DirectionalLight(0xfff1d6, 2.1);
sun.position.set(-14, 26, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 80 });
sun.shadow.bias = -0.0015;
scene.add(sun, sun.target);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camDist = w < h ? 34 : 26;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- assets
const texLoader = new THREE.TextureLoader();
const TEX = {};
function loadTex(key, url) {
  return new Promise((res) => texLoader.load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; TEX[key] = t; res(); }, undefined, () => res()));
}
const AUD = {};
let actx = null, master = null, bgmEl = null;
async function loadAudio(key) {
  try { const r = await fetch(`audio/${key}.mp3`); AUD[key] = await r.arrayBuffer(); } catch (e) { /* optional */ }
}
async function decodeAll() {
  for (const k in AUD) {
    if (AUD[k] instanceof ArrayBuffer) { try { AUD[k] = await actx.decodeAudioData(AUD[k]); } catch (e) { delete AUD[k]; } }
  }
}
function sfx(key, vol = 0.6, rate = 1) {
  if (!S.sound || !actx || !(AUD[key] instanceof AudioBuffer)) return;
  const src = actx.createBufferSource(); src.buffer = AUD[key]; src.playbackRate.value = rate * rand(0.94, 1.06);
  const g = actx.createGain(); g.gain.value = vol; src.connect(g).connect(master); src.start();
}
function tone(freqs, dur = 0.12, type = 'triangle', vol = 0.18) {
  if (!S.sound || !actx) return;
  let t = actx.currentTime;
  for (const f of freqs) {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.02); t += dur * 0.6;
  }
}
const coinSound = () => tone([1318, 1760, 2637], 0.14, 'square', 0.07);
const pickSound = () => tone([880, 1175], 0.08, 'triangle', 0.12);
const hitThud = () => tone([110, 70], 0.07, 'sine', 0.25);
function startBgm() {
  if (bgmEl) return;
  bgmEl = new Audio('audio/world-loop.mp3'); bgmEl.loop = true; bgmEl.volume = 0.32;
  if (S.sound) bgmEl.play().catch(() => {});
}

// procedural textures
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const shadowTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 2, 32, 32, 31); r.addColorStop(0, 'rgba(0,0,0,.55)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
const ringTex = canvasTex(128, 128, (g) => { g.strokeStyle = '#fff'; g.lineWidth = 7; g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.stroke(); g.lineWidth = 3; g.globalAlpha = .6; g.beginPath(); g.arc(64, 64, 40, 0, Math.PI * 2); g.stroke(); });
const slashTex = canvasTex(256, 256, (g) => {
  const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.6, 'rgba(255,245,200,.95)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = gr; g.beginPath(); g.arc(128, 150, 110, Math.PI * 1.05, Math.PI * 1.95); g.arc(128, 175, 92, Math.PI * 1.9, Math.PI * 1.1, true); g.closePath(); g.fill();
});
const glowTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.35, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
const pillarTex = canvasTex(64, 256, (g) => { const r = g.createLinearGradient(0, 256, 0, 0); r.addColorStop(0, 'rgba(255,230,140,.95)'); r.addColorStop(1, 'rgba(255,230,140,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 256); });
const portalTex = canvasTex(128, 128, (g) => { for (let i = 0; i < 5; i++) { g.strokeStyle = `rgba(${120 + i * 20},${200},255,${0.9 - i * 0.15})`; g.lineWidth = 6; g.beginPath(); g.arc(64, 64, 18 + i * 9, i, i + 4.4); g.stroke(); } });

// ---------------------------------------------------------------- world build
const props = []; // collision circles {x,z,r}
function buildWorld() {
  const gt = TEX.ground; gt.wrapS = gt.wrapT = THREE.MirroredRepeatWrapping; gt.repeat.set(4, 4);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(MAP * 2 + 40, MAP * 2 + 40), new THREE.MeshLambertMaterial({ map: gt }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  // low-poly trees & rocks around and inside the field
  const trunkM = new THREE.MeshLambertMaterial({ color: 0x6b4426 });
  const leafMs = [0x4f9a3a, 0x3f8a3f, 0x6aae3c, 0x2f7a46].map((c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
  const rockM = new THREE.MeshLambertMaterial({ color: 0x9aa0a8, flatShading: true });
  const flowerMs = [0xff7fb0, 0xfff07a, 0xffffff, 0xb08cff].map((c) => new THREE.MeshBasicMaterial({ color: c }));
  const tree = (x, z, s) => {
    const g = new THREE.Group();
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * s, 0.28 * s, 1.6 * s, 6), trunkM); tr.position.y = 0.8 * s; tr.castShadow = true; g.add(tr);
    const lm = leafMs[randi(0, 3)];
    for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry((1.15 - i * 0.22) * s, 0), lm); l.position.set(rand(-.2, .2) * s, (1.9 + i * 0.75) * s, rand(-.2, .2) * s); l.castShadow = true; g.add(l); }
    g.position.set(x, 0, z); g.rotation.y = rand(0, 6); scene.add(g); props.push({ x, z, r: 0.55 * s });
  };
  const rock = (x, z, s) => { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockM); m.position.set(x, s * 0.45, z); m.scale.y = 0.65; m.rotation.set(rand(0, 3), rand(0, 3), 0); m.castShadow = true; m.receiveShadow = true; scene.add(m); props.push({ x, z, r: s * 0.9 }); };
  for (let i = 0; i < 70; i++) { // border forest
    const a = (i / 70) * Math.PI * 2, d = MAP + rand(1.5, 7);
    tree(Math.cos(a) * d * 1.02, Math.sin(a) * d, rand(1.1, 1.8));
  }
  for (let i = 0; i < 16; i++) { const x = rand(-MAP + 4, MAP - 4), z = rand(-MAP + 4, MAP - 4); if (Math.hypot(x, z) > 7) tree(x, z, rand(0.9, 1.4)); }
  for (let i = 0; i < 14; i++) { const x = rand(-MAP + 3, MAP - 3), z = rand(-MAP + 3, MAP - 3); if (Math.hypot(x, z) > 6) rock(x, z, rand(0.5, 1.1)); }
  const fg = new THREE.CircleGeometry(0.09, 5);
  for (let i = 0; i < 260; i++) { const f = new THREE.Mesh(fg, flowerMs[randi(0, 3)]); f.rotation.x = -Math.PI / 2; f.position.set(rand(-MAP, MAP), 0.02, rand(-MAP, MAP)); scene.add(f); }
  // warp portal to town (phase 2)
  const pm = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ map: portalTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pm.rotation.x = -Math.PI / 2; pm.position.set(0, 0.05, -MAP + 3); scene.add(pm); portal.mesh = pm;
  const pg = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x7fd0ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  pg.scale.set(3, 3.6, 1); pg.position.set(0, 1.3, -MAP + 3); scene.add(pg);
  // target ring + click marker
  targetRing.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ringTex, color: 0xff5050, transparent: true, depthWrite: false }));
  targetRing.mesh.rotation.x = -Math.PI / 2; targetRing.mesh.visible = false; scene.add(targetRing.mesh);
  clickMark.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ringTex, color: 0xfff27a, transparent: true, depthWrite: false }));
  clickMark.mesh.rotation.x = -Math.PI / 2; clickMark.mesh.visible = false; scene.add(clickMark.mesh);
}
const portal = { x: 0, z: -MAP + 3, mesh: null };
const targetRing = { mesh: null };
const clickMark = { mesh: null, t: 0 };

// ---------------------------------------------------------------- sprites
function frameTex(base, cols, rows) {
  const t = base.clone(); t.repeat.set(1 / cols, 1 / rows); t.userData = { cols, rows }; return t;
}
function setFrame(t, c, r, flip) {
  const { cols, rows } = t.userData;
  t.repeat.x = (flip ? -1 : 1) / cols; t.offset.x = (flip ? c + 1 : c) / cols; t.offset.y = 1 - (r + 1) / rows;
}
function makeShadow(s) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s * 0.6), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.03; scene.add(m); return m;
}

// ---------------------------------------------------------------- entities
const P = { x: 0, z: 2, face: 1, state: 'idle', anim: 0, atkT: 0, target: null, dest: null, pendingSkill: null, sit: false, hurtT: 0, dead: false, cds: {}, regenT: 0, autoT: 0, lastHitBy: 0 };
let heroSprite, heroShadow;
const mobs = [];
const drops = [];
const fx = [];

function spawnHero() {
  const t = frameTex(TEX.hero, 4, 4);
  heroSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, alphaTest: 0.05 }));
  heroSprite.center.set(0.5, 0.04); heroSprite.scale.set(2.7, 2.7, 1); scene.add(heroSprite);
  heroShadow = makeShadow(1.6);
}

function spawnMob(key, at) {
  const def = MOBS[key];
  let t, cols, rows;
  if (def.sheet === 'mobs') { cols = 3; rows = 4; } else { cols = 4; rows = 5; }
  t = frameTex(TEX[def.sheet], cols, rows);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, alphaTest: 0.05 }));
  const aspect = def.sheet === 'mobs' ? 256 / 192 : 192 / 230.4;
  sp.center.set(0.5, def.sheet === 'mobs' ? 0.02 : 0.06); sp.scale.set(def.size * aspect, def.size, 1); scene.add(sp);
  let x, z;
  if (at) { x = at.x; z = at.z; } else {
    do { x = rand(-MAP + 3, MAP - 3); z = rand(-MAP + 3, MAP - 3); } while (Math.hypot(x - P.x, z - P.z) < 12 || Math.hypot(x, z - 2) < 8);
  }
  const m = { key, def, sp, t, sh: makeShadow(def.size * 0.9), x, z, hx: x, hz: z, hp: def.hp, face: 1, anim: rand(0, 4), atkT: rand(0.5, 1.5), wanderT: rand(0, 3), dest: null,
    aggroOn: false, flash: 0, kb: null, poison: 0, poisonT: 0, stun: 0, dead: false, deadT: 0, ui: null, hitStop: 0, bob: rand(0, 6) };
  if (def.sheet === 'mobs') setFrame(t, def.col, 0, false); else setFrame(t, def.c, def.r, false);
  mobs.push(m); return m;
}

function removeMob(m) {
  scene.remove(m.sp); scene.remove(m.sh); m.sp.material.dispose(); m.t.dispose(); if (m.ui) m.ui.remove();
  mobs.splice(mobs.indexOf(m), 1);
}

// ---------------------------------------------------------------- UI helpers
const ftxt = $('ftxt');
const floats = [];
const tmpV = new THREE.Vector3();
function toScreen(x, y, z) { tmpV.set(x, y, z).project(camera); return { x: (tmpV.x * 0.5 + 0.5) * innerWidth, y: (-tmpV.y * 0.5 + 0.5) * innerHeight, vis: tmpV.z < 1 }; }
function floatText(text, cls, x, y, z, opts = {}) {
  const el = document.createElement('div'); el.className = 'ft ' + cls; el.textContent = text; ftxt.appendChild(el);
  floats.push({ el, x, y, z, t: 0, life: opts.life || 0.95, vx: opts.vx != null ? opts.vx : rand(-28, 28), rise: opts.rise || 70 });
}
function updateFloats(dt) {
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i]; f.t += dt; const k = f.t / f.life;
    if (k >= 1) { f.el.remove(); floats.splice(i, 1); continue; }
    const p = toScreen(f.x, f.y, f.z);
    const bounce = Math.sin(Math.min(1, k * 2.2) * Math.PI) * 26;
    const sc = k < 0.12 ? 0.6 + k / 0.12 * 0.7 : 1.3 - Math.min(0.3, (k - 0.12) * 1.5);
    f.el.style.transform = `translate(-50%,-50%) translate(${p.x + f.vx * k}px,${p.y - f.rise * k - bounce}px) scale(${sc})`;
    f.el.style.opacity = k > 0.7 ? (1 - k) / 0.3 : 1;
  }
}
const chatEl = $('chat');
function chat(msg, cls = 'sys') {
  const d = document.createElement('div'); d.className = cls; d.textContent = msg; chatEl.appendChild(d);
  while (chatEl.children.length > 7) chatEl.firstChild.remove();
}
let toastT = 0;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.style.display = 'block'; toastT = 2.2; }
let bannerT = 0;
function banner(msg) { const b = $('banner'); b.innerHTML = msg; b.style.opacity = 1; bannerT = 2.6; }

// ---------------------------------------------------------------- combat
function hitChance(hit, flee) { return clamp(80 + hit - flee, 5, 95) / 100; }
function playerAttackDamage(m, mult = 1, forceHit = false) {
  const d = D();
  const crit = !forceHit && Math.random() * 100 < d.crit;
  if (!crit && !forceHit && Math.random() > hitChance(d.hit, m.def.flee + m.def.lv)) return { miss: true };
  let dmg = d.atk * rand(0.9, 1.1) * mult * (crit ? 1.4 : 1);
  if (!crit) dmg *= 1 - Math.min(0.6, m.def.def / 100);
  return { dmg: Math.max(1, Math.round(dmg)), crit };
}
function damageMob(m, res, opts = {}) {
  if (m.dead) return;
  const yTop = m.def.size * 0.95;
  if (res.miss) { floatText('Miss', 'miss', m.x, yTop, m.z); return; }
  m.hp -= res.dmg; m.flash = 0.12; m.hitStop = opts.heavy ? 0.09 : 0.05; m.aggroOn = true;
  const dx = m.x - P.x, dz = m.z - P.z, l = Math.hypot(dx, dz) || 1;
  if (!m.def.mvp) m.kb = { x: dx / l * (opts.heavy ? 0.9 : 0.35), z: dz / l * (opts.heavy ? 0.9 : 0.35), t: 0.12 };
  floatText(res.crit ? res.dmg + '!' : String(res.dmg), res.crit ? 'crit' : 'dmg', m.x, yTop, m.z);
  sparks(m.x, m.def.size * 0.5, m.z, res.crit ? 0xffe14d : 0xffffff, res.crit ? 10 : 6);
  if (res.crit || opts.heavy) shake(res.crit ? 0.18 : 0.12);
  sfx('hit-soft', res.crit ? 0.8 : 0.55, res.crit ? 0.85 : 1); hitThud();
  if (m.hp <= 0) killMob(m);
}
function killMob(m) {
  m.dead = true; m.deadT = 0; m.hp = 0;
  if (P.target === m) P.target = null;
  const def = m.def;
  addExp(def.exp, def.jexp);
  // drops — merchant gets slightly better item luck; coin stays rare for everyone
  const luck = 1 + (S.job === 'merchant' ? 0.25 : 0) + stat('luk') * 0.004;
  let n = 0;
  for (const [id, ch] of def.drops) {
    if (Math.random() * 100 < ch * (def.mvp ? 1 : luck)) { dropItem(id, def.mvp && id === 'red_potion' ? 5 : 1, m.x, m.z, n++); }
  }
  if (Math.random() * 100 < def.coin) {
    const amt = def.coinAmt ? randi(def.coinAmt[0], def.coinAmt[1]) : 1;
    dropItem('coin', amt, m.x, m.z, n++);
  }
  if (def.mvp) {
    banner(`👑 MVP! โค่น ${def.name} สำเร็จ`); chat(`[MVP] คุณโค่น ${def.name}! ได้รับ EXP MVP`, 'mvp');
    S.mvpAt = now + MVP_RESPAWN; sfx('upgrade-success', 0.7); shake(0.4);
  }
  sfx('skill-dash', 0.35, 1.4);
  if (!def.mvp) setTimeout(() => { if (running) spawnMob(m.key); }, rand(7000, 13000));
}
function mobAttack(m) {
  const d = D();
  if (Math.random() > hitChance(m.def.hit + m.def.lv, d.flee)) { floatText('Miss', 'miss', P.x, 2.6, P.z); return; }
  let dmg = rand(m.def.atk[0], m.def.atk[1]) * (1 - Math.min(0.5, eqSum('def') / 100)) - stat('vit') * 0.5;
  dmg = Math.max(1, Math.round(dmg));
  S.hp -= dmg; P.hurtT = 0.22; P.lastHitBy = now;
  if (P.sit) P.sit = false;
  floatText(String(dmg), 'hurt', P.x, 2.6, P.z);
  shake(m.def.mvp ? 0.25 : 0.07); sfx('hit-soft', 0.45, 0.7);
  if (S.hp <= 0) die();
}
function die() {
  S.hp = 0; P.dead = true; P.target = null; P.dest = null; P.state = 'dead';
  const loss = S.lv > 1 ? Math.floor(baseNeed(S.lv) * 0.01) : 0;
  S.exp = Math.max(0, S.exp - loss);
  chat(`คุณพ่ายแพ้... เสีย EXP ${loss}`, 'warn');
  $('dead').style.display = 'flex';
}
function respawn() {
  const d = D(); P.dead = false; P.x = 0; P.z = 2; S.hp = Math.round(d.maxHp * 0.5); S.sp = Math.round(d.maxSp * 0.5);
  P.state = 'idle'; $('dead').style.display = 'none'; for (const m of mobs) m.aggroOn = false; save();
}

function addExp(be, je) {
  S.exp += be; let up = false;
  while (S.exp >= baseNeed(S.lv) && S.lv < 99) { S.exp -= baseNeed(S.lv); S.lv++; S.pts += ptsPerLevel(S.lv); up = true; }
  if (up) {
    const d = D(); S.hp = d.maxHp; S.sp = d.maxSp;
    floatText('LEVEL UP', 'lvl', P.x, 3.2, P.z, { life: 1.6, vx: 0, rise: 50 });
    chat(`เลเวลอัป! Base Lv. ${S.lv} • ได้แต้มสถานะเพิ่ม`, 'lv'); pillar(0xffe08a); sfx('level-up', 0.7);
  }
  if (S.jlv < jobCap(S.job)) {
    S.jexp += je; let jup = false;
    while (S.jlv < jobCap(S.job) && S.jexp >= jobNeed(S.jlv, S.job)) { S.jexp -= jobNeed(S.jlv, S.job); S.jlv++; jup = true; }
    if (S.jlv >= jobCap(S.job)) S.jexp = 0;
    if (jup) {
      chat(`Job Lv. ${S.jlv}!`, 'lv'); if (!up) { pillar(0xc79bff); sfx('level-up', 0.5, 1.2); }
      if (S.job === 'novice' && S.jlv >= 10) { banner('Job Lv.10 — เปลี่ยนอาชีพได้แล้ว!'); chat('กดปุ่ม "อาชีพ" เพื่อเลือกอาชีพแรก', 'lv'); }
    }
  }
  refreshHud(true);
}

function dropItem(id, count, x, z, idx) {
  const isCoin = id === 'coin';
  let sp;
  if (isCoin) sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.coin, transparent: true }));
  else { const t = frameTex(TEX.loot, 4, 3); const ic = ITEMS[id].icon; setFrame(t, ic % 4, Math.floor(ic / 4), false); sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true })); }
  sp.scale.set(isCoin ? 0.85 : 0.95, isCoin ? 0.85 : 0.95, 1); sp.center.set(0.5, 0.2);
  const a = idx * 2.2 + rand(0, 1), r = 0.6 + idx * 0.25;
  const d = { id, count, x: x + Math.cos(a) * r, z: z + Math.sin(a) * r, sx: x, sz: z, sp, t: 0, life: 60, glow: null };
  sp.position.set(d.x, 0, d.z); scene.add(sp);
  if (isCoin || (ITEMS[id] && ITEMS[id].type === 'equip')) {
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: isCoin ? 0xffd34d : 0x9fd8ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    gl.scale.set(2, 2, 1); scene.add(gl); d.glow = gl;
    if (isCoin) { chat(`★ ${count} COCKRO coin ตกจากมอนสเตอร์!`, 'coin'); coinSound(); }
    else chat(`ไอเทมหายาก: ${ITEMS[id].name} ตกลงพื้น!`, 'coin');
  }
  drops.push(d);
}
function pickDrop(d) {
  scene.remove(d.sp); if (d.glow) scene.remove(d.glow); d.sp.material.dispose();
  drops.splice(drops.indexOf(d), 1);
  if (d.id === 'coin') {
    S.coin += d.count; floatText(`+${d.count} COCKRO`, 'coin', P.x, 2.9, P.z, { vx: 0 }); coinSound();
    chat(`ได้รับ ${d.count} COCKRO coin`, 'coin');
  } else {
    S.inv[d.id] = (S.inv[d.id] || 0) + d.count; pickSound(); chat(`ได้รับ ${ITEMS[d.id].name} (${d.count})`, 'drop');
  }
  refreshHud(true); save();
}

// ---------------------------------------------------------------- skills
function jobSkills() { return JOB_SKILLS[S.job]; }
function useSkill(id) {
  if (P.dead) return;
  const sk = SKILLS[id]; if (!sk) return;
  if ((P.cds[id] || 0) > 0) return;
  if (S.sp < sk.sp) { toast('SP ไม่พอ'); return; }
  if (sk.kind === 'self') return castSkill(id, null);
  let tgt = P.target && !P.target.dead ? P.target : nearestMob(12);
  if (!tgt) { toast('ไม่มีเป้าหมายในระยะ'); return; }
  P.target = tgt; P.pendingSkill = id; P.dest = null; P.sit = false;
}
function castSkill(id, tgt) {
  const sk = SKILLS[id]; const d = D();
  S.sp -= sk.sp; P.cds[id] = sk.cd; P.state = 'cast'; P.anim = 0; P.atkT = Math.max(P.atkT, 0.35);
  floatText(sk.name + '!', 'sk', P.x, 3.3, P.z, { vx: 0, rise: 30, life: 0.8 });
  if (id === 'first_aid') { const h = sk.heal + Math.floor(S.lv * 1.2); S.hp = Math.min(d.maxHp, S.hp + h); floatText('+' + h, 'heal', P.x, 2.6, P.z); sfx('ui-confirm', 0.5); }
  else if (sk.radius && sk.kind === 'self') {
    ringFx(P.x, P.z, sk.radius, id === 'magnum' ? 0xff7a2a : 0xffd36b); shake(0.22); sfx(id === 'magnum' ? 'skill-wave' : 'skill-bolt', 0.7, 0.8);
    for (const m of [...mobs]) if (!m.dead && Math.hypot(m.x - P.x, m.z - P.z) <= sk.radius + m.def.size * 0.3) {
      damageMob(m, playerAttackDamage(m, sk.mult, true), { heavy: true });
      if (sk.stun && !m.dead && !m.def.mvp && Math.random() < 0.5) { m.stun = sk.stun; floatText('มึน', 'miss', m.x, m.def.size, m.z); }
    }
  } else if (sk.kind === 'aoeTarget') {
    const cx = tgt.x, cz = tgt.z; sfx('skill-bolt', 0.6);
    for (let i = 0; i < 9; i++) setTimeout(() => arrowFx(cx + rand(-sk.radius, sk.radius) * 0.7, cz + rand(-sk.radius, sk.radius) * 0.7, true), i * 35);
    setTimeout(() => { ringFx(cx, cz, sk.radius, 0x9fe0ff); for (const m of [...mobs]) if (!m.dead && Math.hypot(m.x - cx, m.z - cz) <= sk.radius) damageMob(m, playerAttackDamage(m, sk.mult, true)); }, 330);
  } else {
    face(tgt.x);
    const hits = sk.hits || 1;
    for (let i = 0; i < hits; i++) {
      setTimeout(() => {
        if (tgt.dead) return;
        if (S.job === 'archer') arrowFx(tgt.x, tgt.z, false, tgt);
        else slashFx(tgt, id === 'bash' || id === 'power_smash' ? 0xffb347 : id === 'envenom' ? 0x7dff6a : 0xffffff, 1.4);
        damageMob(tgt, playerAttackDamage(tgt, sk.mult, true), { heavy: true });
        if (sk.poison && !tgt.dead) { tgt.poison = 6; tgt.poisonDmg = sk.poison + Math.floor(stat('dex') / 4); }
        if (sk.steal && !tgt.dead) {
          // RO "steal" flavour: tiny chance for 1 coin, otherwise a common item. Still rare by design.
          if (Math.random() < 0.012) { S.coin += 1; floatText('+1 COCKRO', 'coin', P.x, 2.9, P.z); coinSound(); chat('ฉกได้ 1 COCKRO coin!', 'coin'); }
          else if (Math.random() < 0.35) { const id2 = tgt.def.drops[0][0]; S.inv[id2] = (S.inv[id2] || 0) + 1; chat(`ฉกได้ ${ITEMS[id2].name}`, 'drop'); pickSound(); }
          else floatText('ฉกพลาด', 'miss', tgt.x, tgt.def.size, tgt.z);
        }
      }, i * 160);
    }
    sfx(id === 'bash' || id === 'power_smash' ? 'skill-dash' : 'skill-bolt', 0.6, 0.9);
  }
  refreshHud(true);
}
function basicAttack(m) {
  const d = D();
  P.state = 'attack'; P.anim = 0; P.atkT = d.delay; face(m.x);
  if (S.job === 'archer' && ITEMS[S.equip.weapon] && ITEMS[S.equip.weapon].wtype === 'bow') {
    setTimeout(() => { if (!m.dead) { arrowFx(m.x, m.z, false, m); setTimeout(() => damageMob(m, playerAttackDamage(m)), 140); } }, 110);
    sfx('skill-dash', 0.35, 1.6);
    return;
  }
  setTimeout(() => {
    if (m.dead) return;
    slashFx(m, 0xffffff, 1);
    damageMob(m, playerAttackDamage(m));
    if (S.job === 'thief' && !m.dead && Math.random() < 0.3) setTimeout(() => { if (!m.dead) { slashFx(m, 0x9dffb0, 0.9); damageMob(m, playerAttackDamage(m)); } }, 110);
  }, 120);
  sfx('skill-dash', 0.3, 1.3);
}
function face(x) { if (Math.abs(x - P.x) > 0.05) P.face = x > P.x ? 1 : -1; }
function autoTarget() { // prefer monsters near the player's level, like a sensible RO bot path
  let best = null, bs = 1e9;
  for (const m of mobs) {
    if (m.dead || m.def.mvp && S.lv < 15) continue;
    const dist = Math.hypot(m.x - P.x, m.z - P.z); if (dist > 26) continue;
    const gap = m.def.lv - S.lv; const score = dist + (gap > 3 ? gap * 8 : 0) + (m.aggroOn ? -10 : 0);
    if (score < bs) { bs = score; best = m; }
  }
  return best;
}
function nearestMob(maxD) {
  let best = null, bd = maxD;
  for (const m of mobs) { if (m.dead) continue; const d = Math.hypot(m.x - P.x, m.z - P.z); if (d < bd) { bd = d; best = m; } }
  return best;
}

// ---------------------------------------------------------------- fx
function sparks(x, y, z, color, n) {
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.setScalar(rand(0.25, 0.5)); s.position.set(x, y, z); scene.add(s);
    fx.push({ o: s, t: 0, life: rand(0.25, 0.45), v: new THREE.Vector3(rand(-5, 5), rand(1, 6), rand(-5, 5)), g: 14, fade: true });
  }
}
function slashFx(m, color, s) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: slashTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, rotation: rand(-0.8, 0.8) + (P.face < 0 ? Math.PI : 0) }));
  sp.position.set(m.x, m.def.size * 0.5, m.z); sp.scale.setScalar(1.9 * s); scene.add(sp);
  fx.push({ o: sp, t: 0, life: 0.2, grow: 1.6, fade: true });
}
function ringFx(x, z, r, color) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: ringTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.1, z); scene.add(m);
  fx.push({ o: m, t: 0, life: 0.45, ring: r * 2.2, fade: true });
  sparks(x, 0.4, z, color, 14);
}
function arrowFx(tx, tz, rain, tgt) {
  const geo = new THREE.CylinderGeometry(0.03, 0.03, 0.9, 4); geo.rotateZ(Math.PI / 2);
  const a = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xbff4ff }));
  const sx = rain ? tx - 2 : P.x, sy = rain ? 7 : 1.4, sz = rain ? tz - 1 : P.z;
  a.position.set(sx, sy, sz); scene.add(a);
  const ty = rain ? 0.2 : (tgt ? tgt.def.size * 0.5 : 0.8);
  const dir = new THREE.Vector3(tx - sx, ty - sy, tz - sz); a.lookAt(tx, ty, tz); a.rotateY(Math.PI / 2);
  fx.push({ o: a, t: 0, life: rain ? 0.3 : 0.14, v: dir.multiplyScalar(1 / (rain ? 0.3 : 0.14)), hitSpark: true });
}
function pillar(color) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 9, 20, 1, true), new THREE.MeshBasicMaterial({ map: pillarTex, color, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  m.position.set(P.x, 4.5, P.z); scene.add(m); fx.push({ o: m, t: 0, life: 1.4, follow: true, fade: true });
  for (let i = 0; i < 18; i++) setTimeout(() => sparks(P.x + rand(-1, 1), rand(0.5, 3), P.z + rand(-1, 1), color, 1), i * 50);
}
let shakeT = 0, shakeA = 0;
function shake(a) { shakeA = Math.max(shakeA, a); shakeT = 0.25; }
function updateFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i]; f.t += dt; const k = f.t / f.life;
    if (k >= 1) {
      if (f.hitSpark) sparks(f.o.position.x, f.o.position.y, f.o.position.z, 0xbff4ff, 3);
      scene.remove(f.o); f.o.geometry && f.o.geometry !== undefined && f.o.type === 'Mesh' && f.o.geometry.dispose(); f.o.material.dispose(); fx.splice(i, 1); continue;
    }
    if (f.v) { f.o.position.addScaledVector(f.v, dt); if (f.g) f.v.y -= f.g * dt; }
    if (f.grow) f.o.scale.multiplyScalar(1 + f.grow * dt);
    if (f.ring) { const s = 0.4 + f.ring * Math.sqrt(k); f.o.scale.set(s, s, 1); }
    if (f.follow) f.o.position.set(P.x, 4.5, P.z);
    if (f.fade) f.o.material.opacity = 1 - k;
  }
}

// ---------------------------------------------------------------- input
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
let pinch = null;
const pointers = new Map();
canvas.addEventListener('pointerdown', (e) => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cd: camDist }; return; }
  if (!running || P.dead) return;
  tap(e.clientX, e.clientY);
});
canvas.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return; pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch && pointers.size === 2) { const [a, b] = [...pointers.values()]; camDist = clamp(pinch.cd * pinch.d / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), 16, 40); }
});
const endPtr = (e) => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; };
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('wheel', (e) => { camDist = clamp(camDist + e.deltaY * 0.02, 16, 40); }, { passive: true });

function tap(sx, sy) {
  // forgiving touch picking: nearest mob/drop on screen
  let best = null, bd = 9999;
  for (const m of mobs) {
    if (m.dead) continue;
    const p = toScreen(m.x, m.def.size * 0.45, m.z); const r = Math.max(38, m.def.size * 22);
    const d = Math.hypot(p.x - sx, p.y - sy); if (d < r && d < bd) { bd = d; best = { m }; }
  }
  for (const dr of drops) { const p = toScreen(dr.x, 0.4, dr.z); const d = Math.hypot(p.x - sx, p.y - sy); if (d < 34 && d < bd) { bd = d; best = { dr }; } }
  P.sit = false; P.pendingSkill = null;
  if (best && best.m) { P.target = best.m; P.dest = null; return; }
  ndc.set(sx / innerWidth * 2 - 1, -(sy / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const hit = new THREE.Vector3(); if (!ray.ray.intersectPlane(groundPlane, hit)) return;
  P.target = null;
  if (best && best.dr) { P.dest = { x: best.dr.x, z: best.dr.z }; } else P.dest = { x: clamp(hit.x, -MAP, MAP), z: clamp(hit.z, -MAP, MAP) };
  clickMark.mesh.position.set(P.dest.x, 0.06, P.dest.z); clickMark.mesh.visible = true; clickMark.t = 0;
  if (Math.hypot(P.dest.x - portal.x, P.dest.z - portal.z) < 2.5) toast('วาร์ปเข้าเมือง — เปิดในเฟสถัดไป');
}

// ---------------------------------------------------------------- update loop
let now = 0, running = false, last = 0, hudT = 0, saveT = 0, miniT = 0;
function update(dt) {
  now += dt;
  const d = D();
  // cooldowns & regen
  for (const k in P.cds) P.cds[k] = Math.max(0, P.cds[k] - dt);
  P.atkT -= dt; P.hurtT -= dt;
  P.regenT += dt;
  if (P.regenT >= 3 && !P.dead) {
    P.regenT = 0; const mul = P.sit ? 2.5 : (now - P.lastHitBy > 5 ? 1 : 0.5);
    S.hp = Math.min(d.maxHp, S.hp + Math.max(1, Math.floor((d.maxHp / 120 + stat('vit') / 4) * mul)));
    S.sp = Math.min(d.maxSp, S.sp + Math.max(1, Math.floor((d.maxSp / 90 + stat('int') / 5) * mul)));
  }
  S.hp = Math.min(S.hp, d.maxHp); S.sp = Math.min(S.sp, d.maxSp);

  if (!P.dead) {
    // auto hunt (mobile convenience): pick nearest target, auto potion
    if (S.auto) {
      P.autoT -= dt;
      if ((!P.target || P.target.dead) && !P.dest && P.autoT <= 0) { P.target = autoTarget(); P.autoT = 0.4; }
      if (S.hp < d.maxHp * 0.35 && (S.inv.red_potion || 0) > 0 && P.atkT < 0.2) usePotion('red_potion');
      if (P.target && !P.target.dead && S.sp >= 30 && jobSkills()[0] !== 'first_aid') { const sk = jobSkills()[0]; if (!P.cds[sk] && !P.pendingSkill) useSkill(sk); }
    }
    let moving = false;
    const tgt = P.target && !P.target.dead ? P.target : null;
    if (!tgt) P.target = null;
    let goal = null;
    if (tgt) {
      const skill = P.pendingSkill ? SKILLS[P.pendingSkill] : null;
      const range = (skill && S.job !== 'archer' ? d.range : d.range) + tgt.def.size * 0.25;
      const dist = Math.hypot(tgt.x - P.x, tgt.z - P.z);
      if (dist > range) goal = tgt;
      else {
        face(tgt.x);
        if (P.pendingSkill) { const id = P.pendingSkill; P.pendingSkill = null; if (S.sp >= SKILLS[id].sp && !(P.cds[id] > 0)) castSkill(id, tgt); }
        else if (P.atkT <= 0) basicAttack(tgt);
      }
    } else if (P.dest) goal = P.dest;
    if (goal) {
      const dx = goal.x - P.x, dz = goal.z - P.z, l = Math.hypot(dx, dz);
      if (l < 0.15 && goal === P.dest) { P.dest = null; clickMark.mesh.visible = false; }
      else { const sp = Math.min(l, d.speed * dt); P.x += dx / l * sp; P.z += dz / l * sp; face(goal.x); moving = true; P.sit = false; }
    }
    // collisions with props
    for (const pr of props) { const dx = P.x - pr.x, dz = P.z - pr.z, l = Math.hypot(dx, dz); if (l < pr.r + 0.35 && l > 0) { P.x = pr.x + dx / l * (pr.r + 0.35); P.z = pr.z + dz / l * (pr.r + 0.35); } }
    P.x = clamp(P.x, -MAP, MAP); P.z = clamp(P.z, -MAP, MAP);
    // pick up drops underfoot
    for (const dr of [...drops]) if (dr.t > 0.45 && Math.hypot(dr.x - P.x, dr.z - P.z) < 1.0) pickDrop(dr);
    if (S.auto && !P.target && !P.dest) { const near = drops.find((dr) => Math.hypot(dr.x - P.x, dr.z - P.z) < 9); if (near) P.dest = { x: near.x, z: near.z }; }
    // animation state
    if (P.state === 'attack' || P.state === 'cast') { if (P.anim > 0.34) P.state = 'idle'; }
    else P.state = P.hurtT > 0 ? 'hurt' : moving ? 'walk' : P.sit ? 'sit' : 'idle';
  }
  P.anim += dt;
  animateHero();

  // mobs
  for (const m of [...mobs]) updateMob(m, dt, d);
  // MVP schedule
  if (!mobs.some((m) => m.def.mvp)) {
    if (!S.mvpAt || S.mvpAt > now + MVP_RESPAWN + 5) S.mvpAt = now + MVP_FIRST;
    if (now >= S.mvpAt) {
      const m = spawnMob('mvp', { x: rand(-20, 20), z: rand(-28, -12) }); S.mvpAt = 0;
      banner('⚠ MVP ปรากฏตัว!<br><span style="font-size:.6em">ราชันย์ตะขาบเพลิง Lv.22</span>'); chat('[MVP] ราชันย์ตะขาบเพลิง ปรากฏตัวที่ทุ่งกุลา!', 'mvp'); sfx('skill-wave', 0.7, 0.6); m.aggroOn = false;
    }
  }
  // drops anim
  for (const dr of [...drops]) {
    dr.t += dt; const k = Math.min(1, dr.t / 0.45);
    const x = dr.sx + (dr.x - dr.sx) * k, z = dr.sz + (dr.z - dr.sz) * k, y = Math.sin(k * Math.PI) * 1.4 + (k >= 1 ? 0.12 + Math.sin(dr.t * 3) * 0.08 : 0);
    dr.sp.position.set(x, y, z); if (dr.glow) { dr.glow.position.set(x, y + 0.3, z); dr.glow.material.opacity = 0.55 + Math.sin(dr.t * 5) * 0.25; }
    if (dr.t > dr.life) { scene.remove(dr.sp); if (dr.glow) scene.remove(dr.glow); drops.splice(drops.indexOf(dr), 1); }
  }
  updateFx(dt);
  // rings
  const t = P.target && !P.target.dead ? P.target : null;
  targetRing.mesh.visible = !!t;
  if (t) { const s = t.def.size * 0.9 + Math.sin(now * 6) * 0.08; targetRing.mesh.scale.set(s, s, 1); targetRing.mesh.position.set(t.x, 0.05, t.z); }
  if (clickMark.mesh.visible) { clickMark.t += dt; const s = 0.9 - (clickMark.t % 0.6); clickMark.mesh.scale.set(s, s, 1); if (clickMark.t > 3) clickMark.mesh.visible = false; }
  portal.mesh.rotation.z += dt * 1.5;
  // camera
  const cx = P.x, cz = P.z;
  camera.position.set(cx + CAM_DIR.x * camDist, CAM_DIR.y * camDist, cz + CAM_DIR.z * camDist);
  if (shakeT > 0) { shakeT -= dt; camera.position.x += rand(-1, 1) * shakeA; camera.position.y += rand(-1, 1) * shakeA; if (shakeT <= 0) shakeA = 0; }
  camera.lookAt(cx, 0.8, cz);
  sun.position.set(cx - 14, 26, cz + 10); sun.target.position.set(cx, 0, cz);
  // ui
  updateFloats(dt);
  updateMobUi();
  hudT += dt; if (hudT > 0.12) { hudT = 0; refreshHud(); }
  miniT += dt; if (miniT > 0.25) { miniT = 0; drawMini(); }
  saveT += dt; if (saveT > 5) { saveT = 0; save(); }
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').style.display = 'none'; }
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').style.opacity = 0; }
}

function animateHero() {
  const t = heroSprite.material.map; const flip = P.face < 0;
  let c = 0, r = 0, sy = 1;
  switch (P.state) {
    case 'walk': c = Math.floor(P.anim * 9) % 4; r = 0; break;
    case 'attack': c = Math.min(3, Math.floor(P.anim / 0.085)); r = 2; break;
    case 'cast': c = 1; r = 3; break;
    case 'hurt': c = 2; r = 3; break;
    case 'dead': c = 3; r = 3; break;
    case 'sit': c = 0; r = 3; sy = 0.82; break;
    default: c = 0; r = 3; sy = 1 + Math.sin(P.anim * 3) * 0.015;
  }
  setFrame(t, c, r, flip);
  heroSprite.scale.set(2.7, 2.7 * sy, 1);
  heroSprite.position.set(P.x, 0, P.z); heroShadow.position.set(P.x, 0.03, P.z);
  heroSprite.material.color.setScalar(P.hurtT > 0 ? 1.6 : 1);
  if (P.hurtT > 0) heroSprite.material.color.setRGB(1.6, 0.7, 0.7);
}

function updateMob(m, dt, d) {
  const def = m.def;
  if (m.dead) {
    m.deadT += dt; m.sp.material.opacity = 1 - m.deadT / 0.6; m.sp.material.transparent = true;
    m.sp.position.y = m.deadT * 0.4; m.sp.scale.y = def.size * (1 - m.deadT * 0.5);
    if (m.deadT > 0.6) removeMob(m);
    return;
  }
  if (m.hitStop > 0) { m.hitStop -= dt; dt *= 0.05; }
  m.anim += dt; m.flash -= dt; m.atkT -= dt;
  if (m.poison > 0) { m.poison -= dt; m.poisonT += dt; if (m.poisonT >= 1) { m.poisonT = 0; m.hp -= m.poisonDmg; floatText(String(m.poisonDmg), 'heal', m.x, def.size, m.z, { rise: 40 }); if (m.hp <= 0) { killMob(m); return; } } }
  if (m.kb) { m.x += m.kb.x * dt / 0.12; m.z += m.kb.z * dt / 0.12; m.kb.t -= dt; if (m.kb.t <= 0) m.kb = null; }
  const distP = Math.hypot(P.x - m.x, P.z - m.z);
  if (def.aggro && !P.dead && distP < (def.mvp ? 9 : 6.5)) m.aggroOn = true;
  if (P.dead || distP > 24) m.aggroOn = false;
  let moving = false;
  if (m.stun > 0) m.stun -= dt;
  else if (m.aggroOn && !P.dead) {
    const reach = 1.1 + def.size * 0.3;
    if (distP > reach) { const sp = def.speed * (def.mvp ? 1.1 : 1.25) * dt; m.x += (P.x - m.x) / distP * sp; m.z += (P.z - m.z) / distP * sp; moving = true; m.face = P.x > m.x ? 1 : -1; }
    else if (m.atkT <= 0) {
      m.atkT = def.delay; m.lunge = 0.18; m.face = P.x > m.x ? 1 : -1; mobAttack(m);
      if (def.mvp && Math.random() < 0.3) { ringFx(m.x, m.z, 4, 0xff4a2a); if (distP < 4.5) { mobAttack(m); } }
    }
  } else {
    m.wanderT -= dt;
    if (m.wanderT <= 0) { m.wanderT = rand(2.5, 6); m.dest = Math.random() < 0.6 ? { x: clamp(m.hx + rand(-6, 6), -MAP + 2, MAP - 2), z: clamp(m.hz + rand(-6, 6), -MAP + 2, MAP - 2) } : null; }
    if (m.dest) { const dx = m.dest.x - m.x, dz = m.dest.z - m.z, l = Math.hypot(dx, dz); if (l < 0.2) m.dest = null; else { const sp = def.speed * 0.55 * dt; m.x += dx / l * sp; m.z += dz / l * sp; moving = true; m.face = dx > 0 ? 1 : -1; } }
  }
  // separation
  for (const o of mobs) { if (o === m || o.dead) continue; const dx = m.x - o.x, dz = m.z - o.z, l = Math.hypot(dx, dz), min = (def.size + o.def.size) * 0.28; if (l < min && l > 0.001) { m.x += dx / l * (min - l) * 0.5; m.z += dz / l * (min - l) * 0.5; } }
  m.x = clamp(m.x, -MAP, MAP); m.z = clamp(m.z, -MAP, MAP);
  // render
  const flip = m.face > 0;
  if (def.sheet === 'mobs') setFrame(m.t, def.col, Math.floor(m.anim * (moving ? 8 : 4)) % 4, flip);
  else setFrame(m.t, def.c, def.r, flip);
  let sy = 1, sx = 1, y = 0;
  if (def.sheet === 'beasts') { const w = Math.sin(m.anim * (moving ? 12 : 4)); sy = 1 + w * (moving ? 0.06 : 0.03); sx = 1 - w * 0.03; if (def.fly) y = 0.5 + Math.sin(m.anim * 6) * 0.2; }
  if (m.lunge > 0) { m.lunge -= dt; sx *= 1.12; sy *= 0.9; }
  const aspect = def.sheet === 'mobs' ? 256 / 192 : 192 / 230.4;
  m.sp.scale.set(def.size * aspect * sx, def.size * sy, 1);
  m.sp.position.set(m.x, y, m.z); m.sh.position.set(m.x, 0.03, m.z);
  if (m.flash > 0) m.sp.material.color.setScalar(3); else if (m.poison > 0) m.sp.material.color.setRGB(0.7, 1.2, 0.7); else if (m.stun > 0) m.sp.material.color.setRGB(0.8, 0.8, 1.3); else m.sp.material.color.setScalar(1);
}

function updateMobUi() {
  for (const m of mobs) {
    const show = !m.dead && (m.hp < m.def.hp || P.target === m || m.def.mvp);
    if (!show) { if (m.ui) m.ui.style.display = 'none'; continue; }
    if (!m.ui) { m.ui = document.createElement('div'); m.ui.className = 'mhp' + (m.def.mvp ? ' mvp' : ''); m.ui.innerHTML = `<div>${m.def.name} <span style="opacity:.75">Lv.${m.def.lv}</span></div><div class="b"><i></i></div>`; ftxt.appendChild(m.ui); }
    const p = toScreen(m.x, m.def.size * 1.02 + (m.def.fly ? 0.6 : 0), m.z);
    m.ui.style.display = p.vis ? 'block' : 'none';
    m.ui.style.left = p.x + 'px'; m.ui.style.top = (p.y - 30) + 'px';
    m.ui.lastChild.firstChild.style.width = Math.max(0, m.hp / m.def.hp * 100) + '%';
  }
}

// ---------------------------------------------------------------- HUD
const miniC = $('miniC'), mctx = miniC.getContext('2d');
function drawMini() {
  const W = miniC.width, k = W / (MAP * 2);
  mctx.fillStyle = '#5f9b3c'; mctx.fillRect(0, 0, W, W);
  mctx.fillStyle = 'rgba(214,176,108,.55)'; mctx.fillRect(W / 2 - 6, 0, 12, W);
  mctx.fillStyle = '#7fd0ff'; mctx.beginPath(); mctx.arc((portal.x + MAP) * k, (portal.z + MAP) * k, 6, 0, 7); mctx.fill();
  for (const m of mobs) { if (m.dead) continue; mctx.fillStyle = m.def.mvp ? '#ff4dff' : m.def.aggro ? '#ff5050' : '#ffb347'; const r = m.def.mvp ? 8 : 3.5; mctx.beginPath(); mctx.arc((m.x + MAP) * k, (m.z + MAP) * k, r, 0, 7); mctx.fill(); }
  for (const dr of drops) { if (dr.id === 'coin') { mctx.fillStyle = '#ffd34d'; mctx.fillRect((dr.x + MAP) * k - 3, (dr.z + MAP) * k - 3, 6, 6); } }
  mctx.fillStyle = '#fff'; mctx.strokeStyle = '#000'; mctx.lineWidth = 2; mctx.beginPath(); mctx.arc((P.x + MAP) * k, (P.z + MAP) * k, 6, 0, 7); mctx.fill(); mctx.stroke();
}
let lastHudKey = '';
function refreshHud(force) {
  const d = D();
  const key = [S.hp, S.sp, S.exp, S.jexp, S.lv, S.jlv, S.coin, S.job, S.pts, S.inv.red_potion, S.inv.blue_potion, Object.values(P.cds).map((v) => v > 0 ? v.toFixed(1) : 0).join()].join('|');
  if (!force && key === lastHudKey) return; lastHudKey = key;
  $('hpI').style.width = (S.hp / d.maxHp * 100) + '%'; $('hpT').textContent = `HP ${Math.max(0, Math.round(S.hp))} / ${d.maxHp}`;
  $('spI').style.width = (S.sp / d.maxSp * 100) + '%'; $('spT').textContent = `SP ${Math.round(S.sp)} / ${d.maxSp}`;
  const bp = S.lv >= 99 ? 100 : S.exp / baseNeed(S.lv) * 100, jp = S.jlv >= jobCap(S.job) ? 100 : S.jexp / jobNeed(S.jlv, S.job) * 100;
  $('blv').textContent = `Base Lv. ${S.lv}`; $('bexp').textContent = bp.toFixed(1) + '%'; $('expI').style.width = bp + '%';
  $('jlv').textContent = `Job Lv. ${S.jlv}${S.jlv >= jobCap(S.job) ? ' (MAX)' : ''}`; $('jexp').textContent = jp.toFixed(1) + '%'; $('jexpI').style.width = jp + '%';
  $('coinT').textContent = S.coin.toLocaleString(); $('jobName').textContent = JOBS[S.job].th;
  $('hpCnt').textContent = S.inv.red_potion || 0; $('spCnt').textContent = S.inv.blue_potion || 0;
  $('bStat').classList.toggle('alert', S.pts > 0 && canRaiseAny());
  $('bJob').classList.toggle('alert', S.job === 'novice' && S.jlv >= 10);
  const sk = jobSkills();
  [['aS1', 's1', 0], ['aS2', 's2', 1], ['aS3', 's3', 2]].forEach(([bid, p, i]) => {
    const id = sk[i], btn = $(bid);
    btn.style.display = id ? 'flex' : 'none'; if (!id) return;
    $(p + 'n').textContent = SKILLS[id].short; $(p + 'l').textContent = `SP ${SKILLS[id].sp}`;
    const cd = P.cds[id] || 0; btn.querySelector('.cd').style.setProperty('--p', (cd / SKILLS[id].cd * 100) + '%');
    btn.style.opacity = S.sp >= SKILLS[id].sp ? 1 : 0.55; btn.style.fontSize = SKILLS[id].short.length > 6 ? '10.5px' : '13px';
  });
  $('bAuto').classList.toggle('on', !!S.auto); $('bSnd').textContent = S.sound ? '🔊' : '🔇';
  if ($('wStat').classList.contains('show')) renderStats();
}
function canRaiseAny() { return Object.values(S.st).some((v) => v < 99 && statCost(v) <= S.pts); }

function renderStats() {
  const g = $('statGrid'); $('ptsT').textContent = S.pts;
  g.innerHTML = '';
  for (const k of ['str', 'agi', 'vit', 'int', 'dex', 'luk']) {
    const v = S.st[k], c = statCost(v), bonus = eqSum(k);
    const row = document.createElement('div'); row.className = 'srow';
    row.innerHTML = `<b>${k.toUpperCase()}</b><span>${v}${bonus ? `<em> +${bonus}</em>` : ''}</span><em>ใช้ ${c}</em>`;
    const b = document.createElement('button'); b.textContent = '+'; b.disabled = c > S.pts || v >= 99;
    b.onclick = () => { if (statCost(S.st[k]) <= S.pts) { S.pts -= statCost(S.st[k]); S.st[k]++; sfx('ui-tap', 0.5); refreshHud(true); save(); } };
    row.appendChild(b); g.appendChild(row);
  }
  const d = D();
  $('derived').innerHTML = `<div>ATK<b>${d.atk}</b></div><div>DEF<b>${d.def}</b></div><div>HIT<b>${d.hit}</b></div><div>FLEE<b>${d.flee}</b></div><div>CRI<b>${d.crit.toFixed(1)}%</b></div><div>ASPD<b>${d.aspd}</b></div>`;
}
function iconHtml(id, cls = 'ic') { const ic = ITEMS[id].icon; return `<i class="${cls}" style="background-position:${(ic % 4) / 3 * 100}% ${Math.floor(ic / 4) / 2 * 100}%"></i>`; }
let invSel = null;
function renderInv() {
  const er = $('eqRow'); er.innerHTML = '';
  for (const [s, lab] of SLOTS) {
    const id = S.equip[s]; const el = document.createElement('div'); el.className = 'slot' + (id ? ' eq' : '');
    el.innerHTML = `<span class="lab">${lab}</span>` + (id ? iconHtml(id) : '');
    el.onclick = () => { if (id) { invSel = { id, eq: s }; showDetail(); } };
    er.appendChild(el);
  }
  const g = $('invGrid'); g.innerHTML = '';
  for (const id of Object.keys(S.inv)) {
    if (!S.inv[id]) continue;
    const el = document.createElement('div'); el.className = 'slot';
    el.innerHTML = iconHtml(id) + `<span class="n">${S.inv[id]}</span>`;
    el.onclick = () => { invSel = { id }; showDetail(); };
    g.appendChild(el);
  }
  showDetail();
}
function showDetail() {
  const box = $('invDetail');
  if (!invSel || (!invSel.eq && !S.inv[invSel.id])) { box.textContent = 'แตะไอเทมเพื่อดูรายละเอียด'; return; }
  const it = ITEMS[invSel.id];
  box.innerHTML = `<b style="color:#ffe18a">${it.name}</b><div style="margin:3px 0 7px">${it.desc}</div>`;
  const btn = document.createElement('button'); btn.className = 'btn';
  if (invSel.eq) { btn.textContent = 'ถอด'; btn.onclick = () => { if (invSel.eq === 'weapon') { toast('ต้องมีอาวุธติดตัวเสมอ'); return; } S.inv[invSel.id] = (S.inv[invSel.id] || 0) + 1; delete S.equip[invSel.eq]; invSel = null; afterInv(); }; }
  else if (it.type === 'use') { btn.textContent = 'ใช้'; btn.onclick = () => { usePotion(invSel.id); afterInv(); }; }
  else if (it.type === 'equip') {
    const ok = !it.jobs || it.jobs.includes(S.job);
    btn.textContent = ok ? 'สวมใส่' : `อาชีพนี้ใช้ไม่ได้`; btn.disabled = !ok;
    btn.onclick = () => { const old = S.equip[it.slot]; S.equip[it.slot] = invSel.id; S.inv[invSel.id]--; if (old) S.inv[old] = (S.inv[old] || 0) + 1; sfx('ui-confirm', 0.5); chat(`สวมใส่ ${it.name}`, 'sys'); invSel = null; afterInv(); };
  } else { btn.textContent = 'เก็บไว้'; btn.disabled = true; }
  box.appendChild(btn);
}
function afterInv() { for (const k in S.inv) if (!S.inv[k]) delete S.inv[k]; renderInv(); refreshHud(true); save(); }
function usePotion(id) {
  if (P.dead || !(S.inv[id] > 0)) { if (!(S.inv[id] > 0)) toast(`${ITEMS[id].name} หมดแล้ว`); return; }
  const it = ITEMS[id], d = D();
  S.inv[id]--; if (it.hp) { S.hp = Math.min(d.maxHp, S.hp + it.hp); floatText('+' + it.hp, 'heal', P.x, 2.6, P.z); }
  if (it.sp) { S.sp = Math.min(d.maxSp, S.sp + it.sp); floatText('+' + it.sp + ' SP', 'heal', P.x, 2.6, P.z); }
  sparks(P.x, 1.2, P.z, it.hp ? 0xff6b6b : 0x6bb6ff, 8); tone([660, 990], 0.1, 'sine', 0.12); refreshHud(true);
}
function renderJobs() {
  const info = $('jobInfo'), g = $('jobGrid'); g.innerHTML = '';
  if (S.job !== 'novice') { info.innerHTML = `อาชีพปัจจุบัน: <b style="color:#ffe18a">${JOBS[S.job].th} (${JOBS[S.job].name})</b><br>อาชีพขั้นที่ 2 จะเปิดในเฟสถัดไป`; return; }
  const ready = S.jlv >= 10;
  info.innerHTML = ready ? 'Job Lv.10 แล้ว! เลือกอาชีพแรก (เลือกแล้วเปลี่ยนไม่ได้)' : `ต้องการ Job Lv.10 (ตอนนี้ ${S.jlv}) — ล่ามอนสเตอร์เพื่อเก็บ Job EXP`;
  for (const k of ['sword', 'thief', 'archer', 'merchant']) {
    const j = JOBS[k]; const el = document.createElement('div'); el.className = 'job';
    el.innerHTML = `${iconHtml(j.weapon)}<b>${j.th}</b><div style="font-size:11px;color:#9fb4d9">${j.name}</div><p>${j.desc}</p>`;
    const b = document.createElement('button'); b.className = 'btn'; b.textContent = 'เลือก'; b.disabled = !ready;
    b.onclick = () => changeJob(k); el.appendChild(b); g.appendChild(el);
  }
}
function changeJob(k) {
  if (S.job !== 'novice' || S.jlv < 10) return;
  S.job = k; S.jlv = 1; S.jexp = 0;
  const old = S.equip.weapon; if (old) S.inv[old] = (S.inv[old] || 0) + 1;
  S.equip.weapon = JOBS[k].weapon; S.inv.red_potion = (S.inv.red_potion || 0) + 10;
  const d = D(); S.hp = d.maxHp; S.sp = d.maxSp;
  closeWins(); banner(`เปลี่ยนอาชีพเป็น ${JOBS[k].th}!`); chat(`ยินดีด้วย! คุณเป็น ${JOBS[k].th} แล้ว ได้รับ ${ITEMS[JOBS[k].weapon].name} + ยาแดง 10`, 'lv');
  pillar(0x9fe0ff); sfx('upgrade-success', 0.7); refreshHud(true); save();
}

function openWin(id) { closeWins(); $(id).classList.add('show'); if (id === 'wStat') renderStats(); if (id === 'wInv') { invSel = null; renderInv(); } if (id === 'wJob') renderJobs(); sfx('ui-tap', 0.4); }
function closeWins() { document.querySelectorAll('.win').forEach((w) => w.classList.remove('show')); }
document.querySelectorAll('[data-close]').forEach((b) => b.onclick = closeWins);
const bind = (id, fn) => $(id).addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
bind('bStat', () => openWin('wStat'));
bind('bInv', () => openWin('wInv'));
bind('bJob', () => openWin('wJob'));
bind('bAuto', () => { S.auto = !S.auto; toast(S.auto ? 'ล่าอัตโนมัติ: เปิด' : 'ล่าอัตโนมัติ: ปิด'); if (!S.auto) P.target = null; refreshHud(true); });
bind('bSnd', () => { S.sound = !S.sound; if (bgmEl) { if (S.sound) bgmEl.play().catch(() => {}); else bgmEl.pause(); } refreshHud(true); save(); });
bind('aAtk', () => { if (P.dead) return; const m = P.target && !P.target.dead ? P.target : nearestMob(16); if (m) { P.target = m; P.dest = null; P.sit = false; } else toast('ไม่มีมอนสเตอร์ใกล้ ๆ'); });
bind('aS1', () => useSkill(jobSkills()[0]));
bind('aS2', () => useSkill(jobSkills()[1]));
bind('aS3', () => useSkill(jobSkills()[2]));
bind('aHP', () => usePotion('red_potion'));
bind('aSP', () => usePotion('blue_potion'));
bind('aSit', () => { if (P.dead) return; P.sit = !P.sit; P.target = null; P.dest = null; toast(P.sit ? 'นั่งพัก — ฟื้นฟูเร็วขึ้น' : 'ลุกขึ้น'); });
bind('respawn', respawn);
window.addEventListener('keydown', (e) => {
  if (!running) return;
  if (e.key === '1') useSkill(jobSkills()[0]); if (e.key === '2') useSkill(jobSkills()[1]); if (e.key === '3') useSkill(jobSkills()[2]);
  if (e.key === 'q') usePotion('red_potion'); if (e.key === 'w') usePotion('blue_potion');
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { save(); if (bgmEl) bgmEl.pause(); } else if (bgmEl && S.sound && running) bgmEl.play().catch(() => {}); });

// ---------------------------------------------------------------- boot
function frame(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000 || 0); last = ts;
  if (running) update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
async function boot() {
  load();
  const tasks = [['hero', 'img/hero.webp'], ['mobs', 'img/mobs.webp'], ['beasts', 'img/beasts.webp'], ['loot', 'img/loot.webp'], ['coin', 'img/coin.webp'], ['ground', 'img/ground.webp']];
  let done = 0; const total = tasks.length + 8;
  const tick = () => { done++; $('load').textContent = `โหลด ${Math.round(done / total * 100)}%`; };
  await Promise.all([
    ...tasks.map(([k, u]) => loadTex(k, u).then(tick)),
    ...['hit-soft', 'level-up', 'skill-bolt', 'skill-dash', 'skill-wave', 'ui-tap', 'upgrade-success', 'ui-confirm'].map((k) => loadAudio(k).then(tick)),
  ]);
  buildWorld(); spawnHero();
  for (const [k, n] of SPAWNS) for (let i = 0; i < n; i++) spawnMob(k);
  const d = D(); S.hp = Math.min(S.hp, d.maxHp); S.sp = Math.min(S.sp, d.maxSp); if (S.hp <= 0) S.hp = d.maxHp;
  S.mvpAt = 0;
  camera.position.set(P.x, 20, P.z + 15); camera.lookAt(P.x, 0, P.z);
  refreshHud(true); drawMini();
  requestAnimationFrame(frame);
  const st = $('start'); st.disabled = false; st.textContent = 'เริ่มผจญภัย';
  st.onclick = async () => {
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); master = actx.createGain(); master.gain.value = 0.9; master.connect(actx.destination); await actx.resume(); await decodeAll(); } catch (e) { actx = null; }
    startBgm(); $('title').style.display = 'none'; running = true;
    chat('ยินดีต้อนรับสู่ทุ่งกุลา! แตะมอนสเตอร์เพื่อโจมตี', 'sys');
    if (S.pts > 0) chat(`คุณมีแต้มสถานะ ${S.pts} แต้ม — กดปุ่ม "สถานะ" เพื่ออัป`, 'lv');
    chat('COCKRO coin ดรอปยาก (1.5–3%) — MVP ดรอปแน่นอน!', 'coin');
  };
}
boot();
if (new URLSearchParams(location.search).has('debug')) window.__ro = { S, P, mobs, drops, addExp, changeJob, useSkill, D, spawnMob, get now() { return now; } };
