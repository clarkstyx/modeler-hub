import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Part } from "../core/types";

interface Props {
  parts: Part[];
  bedSize: number;
  resetToken: number;
  /** The camera re-frames when this changes (a new size). */
  frameKey: string;
}

/** Live preview drawn from the exact meshes that are exported. */
export function Preview3D({ parts, bedSize, resetToken, frameKey }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const ref = useRef<{ camera: THREE.PerspectiveCamera; controls: OrbitControls; group: THREE.Group; bed: THREE.Group } | null>(null);

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#1b1d22");
    const camera = new THREE.PerspectiveCamera(35, 1, 1, 4000);
    camera.up.set(0, 0, 1);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.2));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(-120, -200, 260);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.6);
    rim.position.set(200, 150, 120);
    scene.add(rim);
    const group = new THREE.Group();
    const bed = new THREE.Group();
    scene.add(group, bed);
    ref.current = { camera, controls, group, bed };
    const resize = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();
    let raf = 0;
    const loop = () => { controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(loop); };
    loop();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); el.removeChild(renderer.domElement); };
  }, []);

  useEffect(() => {
    const s = ref.current;
    if (!s) return;
    s.bed.clear();
    const grid = new THREE.GridHelper(bedSize, bedSize / 10, 0x3a3f4a, 0x2a2e36);
    grid.rotation.x = Math.PI / 2;
    grid.position.set(bedSize / 2, bedSize / 2, -0.01);
    s.bed.add(grid);
  }, [bedSize]);

  useEffect(() => {
    const s = ref.current;
    if (!s) return;
    s.group.clear();
    for (const part of parts) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(Float32Array.from(part.mesh.positions), 3));
      g.setIndex(new THREE.Uint32BufferAttribute(part.mesh.indices, 1));
      // Smooth across the pleats, crisp at real edges (loop, waistband top, ribbon cuts).
      const shaded = toCreasedNormals(g, (35 * Math.PI) / 180);
      s.group.add(new THREE.Mesh(shaded, new THREE.MeshStandardMaterial({ color: new THREE.Color(part.hex), roughness: 0.45, metalness: 0.1 })));
    }
  }, [parts]);

  // Frame the model once per new size or "Reset view", after its parts have arrived.
  const framed = useRef("");
  useEffect(() => {
    const s = ref.current;
    if (!s || !parts.length) return;
    const want = `${frameKey}|${resetToken}`;
    if (framed.current === want) return;
    framed.current = want;
    const box = new THREE.Box3().setFromObject(s.group);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const r = Math.max(size.x, size.y, size.z) * 0.95 + 20;
    s.controls.target.copy(center);
    s.camera.position.set(center.x - r * 0.5, center.y - r * 1.7, center.z + r * 0.75);
    s.camera.updateProjectionMatrix();
    s.controls.update();
  }, [resetToken, frameKey, parts]);

  return <div ref={host} className="preview" />;
}
