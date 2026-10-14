import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { GenerateResult } from "../pipeline/generate";

/** What the preview draws: the single box (a GenerateResult) or one batch plate. */
export type PreviewModel = Pick<GenerateResult, "parts" | "lidPrintOffset" | "lidClosedOffset"> & { kind: string };

export type ViewMode = "print" | "closed";

interface Props {
  result: PreviewModel | null;
  view: ViewMode;
  bedSize: number;
  resetToken: number;
  /** The camera re-frames when this changes (a new size, kind or plate). */
  frameKey: string;
}

/** Live preview built from the exact meshes that will be exported. */
export function Preview3D({ result, view, bedSize, resetToken, frameKey }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{ scene: THREE.Scene; camera: THREE.PerspectiveCamera; controls: OrbitControls; renderer: THREE.WebGLRenderer; group: THREE.Group; bed: THREE.Group } | null>(null);

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#1b1d22");
    const camera = new THREE.PerspectiveCamera(40, 1, 1, 3000);
    camera.up.set(0, 0, 1);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(120, -160, 220);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(-150, 120, 90);
    scene.add(fill);
    const group = new THREE.Group();
    const bed = new THREE.Group();
    scene.add(group, bed);
    sceneRef.current = { scene, camera, controls, renderer, group, bed };
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

  // Print bed
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.bed.clear();
    const grid = new THREE.GridHelper(bedSize, bedSize / 10, 0x3a3f4a, 0x2a2e36);
    grid.rotation.x = Math.PI / 2;
    grid.position.set(bedSize / 2, bedSize / 2, -0.01);
    s.bed.add(grid);
    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(bedSize, bedSize)),
      new THREE.LineBasicMaterial({ color: 0x5a6170 }),
    );
    outline.position.set(bedSize / 2, bedSize / 2, 0);
    s.bed.add(outline);
  }, [bedSize]);

  // Meshes
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.group.clear();
    if (!result) return;
    const [px, py, pz] = result.lidPrintOffset;
    const [cx, cy, cz] = result.lidClosedOffset;
    for (const part of result.parts) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(Float32Array.from(part.mesh.positions), 3));
      g.setIndex(new THREE.Uint32BufferAttribute(part.mesh.indices, 1));
      g.computeVertexNormals();
      const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(part.hex), roughness: 0.55, metalness: 0.05, flatShading: true });
      const mesh = new THREE.Mesh(g, mat);
      if (view === "closed" && part.object === "lid" && result.kind === "box") mesh.position.set(cx - px, cy - py, cz - pz);
      s.group.add(mesh);
    }
  }, [result, view]);

  // Frame the model
  useEffect(() => {
    const s = sceneRef.current;
    if (!s || !result) return;
    const box = new THREE.Box3().setFromObject(s.group);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) * 0.8 + 20;
    s.controls.target.copy(center);
    s.camera.position.set(center.x - radius * 0.9, center.y - radius * 1.3, center.z + radius * 1.0);
    s.camera.near = 1;
    s.camera.far = radius * 20;
    s.camera.updateProjectionMatrix();
    s.controls.update();
    // only re-frame when the model changes size or the user asks
  }, [resetToken, view, frameKey]);

  return <div ref={host} className="preview" />;
}
