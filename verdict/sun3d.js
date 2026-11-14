/* Verdict annonce — vue 3D soleil et ombres (three.js, chargé à la demande) */
window.VA = window.VA || {};
window.VA.sun3d = async function (container, P, S, getState, onReady) {
  const THREE = await import('three');
  const {OrbitControls} = await import('three/addons/controls/OrbitControls.js');
  const B = P.carte.bati || []; const bS = VA.sujet(P);
  const W = container.clientWidth || 800, H = Math.max(380, Math.round(W * 0.62));
  const renderer = new THREE.WebGLRenderer({antialias: true, alpha: false});
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(W, H);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.innerHTML = ''; container.appendChild(renderer.domElement); renderer.domElement.style.borderRadius = '10px'; renderer.domElement.style.display = 'block';
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xeaf2fb); scene.fog = new THREE.Fog(0xeaf2fb, 700, 1400);
  const camera = new THREE.PerspectiveCamera(42, W / H, 1, 3000);
  // relief : altitude du sol interpolée à partir des bâtiments (zs)
  const zPts = B.filter(b => b.zs != null).map(b => ({x: b.c[0], y: b.c[1], z: b.zs}));
  const z0 = zPts.length ? (bS && bS.zs != null ? bS.zs : zPts.reduce((a, p) => a + p.z, 0) / zPts.length) : 0;
  const zAt = (x, y) => { if (!zPts.length) return 0; let num = 0, den = 0; for (const p of zPts) { const d2 = (p.x - x) ** 2 + (p.y - y) ** 2; if (d2 < 1) return p.z - z0; const w = 1 / (d2 * Math.sqrt(d2)); num += w * p.z; den += w; } return num / den - z0; };
  const R = 330, step = 12; const n = Math.round(2 * R / step);
  const geo = new THREE.PlaneGeometry(2 * R, 2 * R, n, n); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), zz = pos.getZ(i); pos.setY(i, zAt(x, -zz) - 0.3); } geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({color: 0xd9dccf})); ground.receiveShadow = true; scene.add(ground);
  // parcelle du bien, en orange léger au sol
  const pb = VA.parcelleDe(P, bS); if (pb && pb.g && pb.g.length) { const r = VA.geo.closed(pb.g[0]); const sh = new THREE.Shape(r.map(p => new THREE.Vector2(p[0], p[1]))); const pg = new THREE.ShapeGeometry(sh); pg.rotateX(-Math.PI / 2); const pp = pg.attributes.position; for (let i = 0; i < pp.count; i++) pp.setY(i, zAt(pp.getX(i), -pp.getZ(i)) + 0.15); const pm = new THREE.Mesh(pg, new THREE.MeshLambertMaterial({color: 0xf3c3a3, transparent: true, opacity: .55})); pm.receiveShadow = true; scene.add(pm); }
  // bâtiments
  const matOther = new THREE.MeshLambertMaterial({color: 0xf4f4f0}), matImm = new THREE.MeshLambertMaterial({color: 0xd4d7df}), matSub = new THREE.MeshLambertMaterial({color: 0xE8641B});
  B.forEach(b => { const h = Math.max(2.5, b.h || 3); b.g.forEach((r0, i) => { if (i > 0) return; const r = VA.geo.closed(r0); if (r.length < 3) return; try { const sh = new THREE.Shape(r.map(p => new THREE.Vector2(p[0], p[1]))); const g = new THREE.ExtrudeGeometry(sh, {depth: h, bevelEnabled: false}); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, b === bS ? matSub : b.nl > 2 ? matImm : matOther); const base = (b.zs != null ? b.zs - z0 : zAt(b.c[0], b.c[1])); m.position.y = base; m.castShadow = true; m.receiveShadow = true; scene.add(m); } catch (e) {} }); });
  // repère du bien et nord
  if (bS) { const ring = new THREE.Mesh(new THREE.RingGeometry(9, 11, 48), new THREE.MeshBasicMaterial({color: 0xE8641B, side: THREE.DoubleSide})); ring.rotation.x = -Math.PI / 2; ring.position.set(bS.c[0], zAt(bS.c[0], bS.c[1]) + 0.4, -bS.c[1]); scene.add(ring); }
  const north = new THREE.Mesh(new THREE.ConeGeometry(6, 18, 12), new THREE.MeshBasicMaterial({color: 0x15171c})); north.position.set(0, zAt(0, 300) + 10, -300); scene.add(north);
  // lumières
  scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x9a8f7a, 0.55));
  const amb = new THREE.AmbientLight(0xffffff, 0.25); scene.add(amb);
  const sun = new THREE.DirectionalLight(0xfff2d6, 1.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera; sc.left = -360; sc.right = 360; sc.top = 360; sc.bottom = -360; sc.near = 50; sc.far = 2200; sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.6;
  const target = new THREE.Object3D(); target.position.set(bS ? bS.c[0] : 0, 0, bS ? -bS.c[1] : 0); scene.add(target); sun.target = target; scene.add(sun);
  const sunBall = new THREE.Mesh(new THREE.SphereGeometry(14, 16, 16), new THREE.MeshBasicMaterial({color: 0xf2b705})); scene.add(sunBall);
  // caméra et contrôles
  const cx = bS ? bS.c[0] : 0, cz = bS ? -bS.c[1] : 0, cy = zAt(cx, -cz);
  camera.position.set(cx + 190, cy + 160, cz + 230); const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(cx, cy + 4, cz); controls.maxPolarAngle = Math.PI / 2 - 0.03; controls.minDistance = 40; controls.maxDistance = 900; controls.enableDamping = true; controls.dampingFactor = 0.08; controls.update();
  const rad = Math.PI / 180;
  const setSun = (az, el) => { const e = Math.max(el, 0.5) * rad, a = az * rad; const d = 900; sun.position.set(cx + d * Math.cos(e) * Math.sin(a), cy + d * Math.sin(e), cz - d * Math.cos(e) * Math.cos(a)); sunBall.position.copy(sun.position).sub(new THREE.Vector3(cx, cy, cz)).multiplyScalar(0.6).add(new THREE.Vector3(cx, cy, cz)); sun.intensity = el <= 0 ? 0 : 1.1 + 0.6 * Math.min(1, el / 40); sunBall.visible = el > 0; amb.intensity = el <= 0 ? 0.08 : 0.22 + 0.1 * Math.min(1, el / 30); };
  let frame; const loop = () => { frame = requestAnimationFrame(loop); const st = getState(); const x = S.solar(S.SEASONS[st.season].doy, S.SEASONS[st.season].tz, st.hour); setSun(x.az, x.el); controls.update(); renderer.render(scene, camera); };
  loop();
  const ro = new ResizeObserver(() => { const w = container.clientWidth; if (!w) return; const h = Math.max(380, Math.round(w * 0.62)); renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }); ro.observe(container);
  onReady && onReady();
  return {dispose() { cancelAnimationFrame(frame); ro.disconnect(); renderer.dispose(); }};
};
