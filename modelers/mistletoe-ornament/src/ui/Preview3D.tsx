import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { Part } from "../core/types";

interface Props {
  parts: Part[];
  resetToken: number;
}

/** Live preview drawn from the exact meshes that are exported. */
export function Preview3D({ parts, resetToken }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const ref = useRef<{ camera: THREE.PerspectiveCamera; controls: OrbitControls; group: THREE.Group } | null>(null);

  useEffect(() => {
    const el = host.current!;
    // preserveDrawingBuffer so a screenshot of the canvas (the craft-show order button) shows the model.
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#1b1d22");
    const camera = new THREE.PerspectiveCamera(35, 1, 1, 4000);
    camera.up.set(0, 0, 1);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(60, -120, 220);
    scene.add(key);
    const group = new THREE.Group();
    scene.add(group);
    const grid = new THREE.GridHelper(200, 20, 0x3a3f4a, 0x2a2e36);
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -0.05;
    scene.add(grid);
    ref.current = { camera, controls, group };
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
    s.group.clear();
    for (const part of parts) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(Float32Array.from(part.mesh.positions), 3));
      g.setIndex(new THREE.Uint32BufferAttribute(part.mesh.indices, 1));
      g.computeVertexNormals();
      s.group.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: new THREE.Color(part.hex), roughness: 0.55, flatShading: true })));
    }
  }, [parts]);

  // Frame the ornament from the front, a little above.
  useEffect(() => {
    const s = ref.current;
    if (!s || !parts.length) return;
    const box = new THREE.Box3().setFromObject(s.group);
    if (box.isEmpty()) return;
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const r = Math.max(size.x, size.y) * 0.8 + 10;
    s.controls.target.copy(c);
    s.camera.position.set(c.x, c.y - r * 0.9, c.z + r * 1.5);
    s.camera.far = r * 30;
    s.camera.updateProjectionMatrix();
    s.controls.update();
  }, [resetToken, parts.length > 0]);

  return <div ref={host} className="preview" />;
}
