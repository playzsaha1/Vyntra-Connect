import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const container = document.getElementById("globe-canvas");
if (container) {
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 9);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const globeGroup = new THREE.Group();
  scene.add(globeGroup);

  const RADIUS = 3;

  // Wireframe sphere
  const sphereGeo = new THREE.SphereGeometry(RADIUS, 48, 48);
  const sphereMat = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    wireframe: true,
    transparent: true,
    opacity: 0.18,
  });
  globeGroup.add(new THREE.Mesh(sphereGeo, sphereMat));

  // Inner solid sphere for depth
  const innerGeo = new THREE.SphereGeometry(RADIUS * 0.99, 48, 48);
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0x020617,
    transparent: true,
    opacity: 0.85,
  });
  globeGroup.add(new THREE.Mesh(innerGeo, innerMat));

  // Lat/long to 3D position
  function latLongToVec3(lat, lon, r) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
  }

  // Cities around the world
  const cities = [
    { name: "Sydney", lat: -33.87, lon: 151.21 },
    { name: "Tokyo", lat: 35.68, lon: 139.69 },
    { name: "Mumbai", lat: 19.08, lon: 72.88 },
    { name: "London", lat: 51.51, lon: -0.13 },
    { name: "New York", lat: 40.71, lon: -74.01 },
    { name: "São Paulo", lat: -23.55, lon: -46.63 },
    { name: "Cape Town", lat: -33.93, lon: 18.42 },
    { name: "Dubai", lat: 25.2, lon: 55.27 },
    { name: "Singapore", lat: 1.35, lon: 103.82 },
    { name: "Toronto", lat: 43.65, lon: -79.38 },
    { name: "Berlin", lat: 52.52, lon: 13.4 },
    { name: "Mexico City", lat: 19.43, lon: -99.13 },
  ];

  // City glow points
  const dotGroup = new THREE.Group();
  const dotGeo = new THREE.SphereGeometry(0.05, 12, 12);
  cities.forEach((city) => {
    const pos = latLongToVec3(city.lat, city.lon, RADIUS * 1.01);
    const mat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
    const dot = new THREE.Mesh(dotGeo, mat);
    dot.position.copy(pos);
    dotGroup.add(dot);

    // Outer glow
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.35,
    });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), glowMat);
    glow.position.copy(pos);
    dotGroup.add(glow);
  });
  globeGroup.add(dotGroup);

  // Connection arcs between random city pairs
  const arcGroup = new THREE.Group();
  const arcs = [];

  function createArc(start, end, color) {
    const mid = start.clone().lerp(end, 0.5);
    const dist = start.distanceTo(end);
    mid.normalize().multiplyScalar(RADIUS + dist * 0.35);

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const points = curve.getPoints(64);
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
    });
    const line = new THREE.Line(geo, mat);
    arcGroup.add(line);
    arcs.push({ line, mat, progress: Math.random(), speed: 0.004 + Math.random() * 0.006 });
  }

  const arcColors = [0x22d3ee, 0x3b82f6, 0x67e8f9];
  for (let i = 0; i < 8; i++) {
    const a = cities[Math.floor(Math.random() * cities.length)];
    let b = cities[Math.floor(Math.random() * cities.length)];
    while (b === a) b = cities[Math.floor(Math.random() * cities.length)];
    createArc(
      latLongToVec3(a.lat, a.lon, RADIUS * 1.01),
      latLongToVec3(b.lat, b.lon, RADIUS * 1.01),
      arcColors[i % arcColors.length]
    );
  }
  globeGroup.add(arcGroup);

  // Ambient star field
  const starGeo = new THREE.BufferGeometry();
  const starCount = 600;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 40 + Math.random() * 60;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = r * Math.cos(phi);
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.15,
    transparent: true,
    opacity: 0.5,
  });
  scene.add(new THREE.Points(starGeo, starMat));

  // Scroll-driven rotation
  let scrollProgress = 0;
  let targetRotY = 0;

  function updateScroll() {
    const section = document.getElementById("globe-section");
    if (!section) return;
    const rect = section.getBoundingClientRect();
    const viewH = window.innerHeight;
    // 0 when section enters bottom, 1 when it leaves top
    const total = rect.height + viewH;
    const passed = viewH - rect.top;
    scrollProgress = Math.max(0, Math.min(1, passed / total));
    targetRotY = scrollProgress * Math.PI * 2.2;
  }

  window.addEventListener("scroll", updateScroll, { passive: true });
  updateScroll();

  // Resize
  function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener("resize", onResize);

  // Animation loop
  let autoRot = 0;
  function animate() {
    requestAnimationFrame(animate);

    autoRot += 0.0015;
    globeGroup.rotation.y += (targetRotY + autoRot - globeGroup.rotation.y) * 0.05;
    globeGroup.rotation.x = -0.35 + scrollProgress * 0.3;

    // Animate arcs — fade in/out cycling
    arcs.forEach((arc) => {
      arc.progress += arc.speed;
      if (arc.progress > 1) arc.progress = 0;
      const phase = Math.sin(arc.progress * Math.PI);
      arc.mat.opacity = phase * 0.7;
    });

    renderer.render(scene, camera);
  }
  animate();
}
