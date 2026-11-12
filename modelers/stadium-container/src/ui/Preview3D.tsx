import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Part } from "../core/types";

export type ViewId = "iso" | "front" | "top" | "back";

interface Props {
  parts: Part[];
  bedSize: number;
  /** Changing this re-frames the model from the named angle. */
  view: { id: ViewId; token: number };
}

/** Live preview drawn from the exact meshes that are exported. The stadium is centred on the origin; the front faces −Y. */
export function Preview3D({ parts, bedSize, view }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const ref = useRef<{ camera: THREE.PerspectiveCamera; controls: OrbitControls; group: THREE.Group; bed: THREE.Group } | null>(null);

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#1b1d22");
    const camera = new THREE.PerspectiveCamera(32, 1, 1, 6000);
    camera.up.set(0, 0, 1);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a40, 1.0));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(-120, -220, 300);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(200, 120, 160);
    scene.add(fill);
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
    const grid = new THREE.GridHelper(bedSize, Math.round(bedSize / 10), 0x3a3f4a, 0x2a2e36);
    grid.rotation.x = Math.PI / 2;
    grid.position.set(0, 0, -0.02);
    s.bed.add(grid);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(bedSize, bedSize)), new THREE.LineBasicMaterial({ color: 0x5a6170 }));
    s.bed.add(edge);
  }, [bedSize]);

  useEffect(() => {
    const s = ref.current;
    if (!s) return;
    s.group.clear();
    for (const part of parts) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(Float32Array.from(part.mesh.positions), 3));
      g.setIndex(new THREE.Uint32BufferAttribute(part.mesh.indices, 1));
      g.computeVertexNormals();
      s.group.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: new THREE.Color(part.hex), roughness: 0.65, metalness: 0.02, flatShading: true })));
    }
  }, [parts]);

  // Frame the model from the requested angle.
  useEffect(() => {
    const s = ref.current;
    if (!s) return;
    const box = new THREE.Box3().setFromObject(s.group);
    if (box.isEmpty()) return;
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const r = Math.max(size.x, size.y, size.z * 1.2) * 0.9 + 20;
    s.controls.target.copy(c);
    if (view.id === "top") s.camera.position.set(c.x, c.y - 0.001, c.z + r * 1.6);
    else if (view.id === "front") s.camera.position.set(c.x, c.y - r * 1.7, c.z + r * 0.75);
    else if (view.id === "back") s.camera.position.set(c.x, c.y + r * 1.7, c.z + r * 0.75);
    else s.camera.position.set(c.x - r * 1.0, c.y - r * 1.25, c.z + r * 1.0);
    s.camera.far = r * 40;
    s.camera.updateProjectionMatrix();
    s.controls.update();
  }, [view.id, view.token, parts.length > 0]);

  return <div ref={host} className="preview" />;
}
