import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { islandArt } from './art-direction.ts';

/** HDR bloom before output conversion; quality changes never affect simulation. */
export class IslandRendering {
  public readonly renderer: THREE.WebGLRenderer;
  private readonly sun: THREE.DirectionalLight;
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly renderPass: RenderPass;
  private readonly output = new OutputPass();
  private width = 1;
  private height = 1;
  private slowFrames = 0;
  private lowQuality = false;
  public constructor(canvas: HTMLCanvasElement, scene: THREE.Scene, camera: THREE.Camera) {
    const settings = islandArt.render;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = settings.exposure;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.info.autoReset = false;
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(scene, camera);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), settings.bloomStrength,
      settings.bloomRadius, settings.bloomThreshold);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.output);
    const hemisphere = new THREE.HemisphereLight(0xfff8ec, settings.groundLight, settings.skyIntensity);
    const sun = this.sun = new THREE.DirectionalLight(settings.sun, settings.sunIntensity);
    sun.position.set(-9, 16, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(settings.shadowSize, settings.shadowSize);
    Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 40 });
    sun.shadow.bias = settings.shadowBias;
    sun.shadow.normalBias = settings.normalBias;
    scene.add(hemisphere, sun);
  }
  public resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    const cap = this.lowQuality ? 0.85 : width < islandArt.render.mobileWidth
      ? islandArt.render.mobilePixelRatio : islandArt.render.pixelRatio;
    const ratio = Math.min(window.devicePixelRatio || 1, cap);
    this.renderer.setPixelRatio(ratio);
    this.renderer.setSize(this.width, this.height, false);
    this.composer.setPixelRatio(ratio);
    this.composer.setSize(this.width, this.height);
  }
  public draw(delta: number): void {
    if (delta * 1000 > islandArt.render.slowFrameMs) this.slowFrames += 1;
    else this.slowFrames = Math.max(0, this.slowFrames - 1);
    if (!this.lowQuality && this.slowFrames >= islandArt.render.slowFrames) {
      this.lowQuality = true;
      this.bloom.enabled = false;
      this.resize(this.width, this.height);
    }
    this.renderer.info.reset();
    this.composer.render(delta);
  }
  public snapshot() {
    return { calls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles,
      bloom: this.bloom.enabled, quality: this.lowQuality ? 'economy' : 'balanced',
      pixelRatio: this.renderer.getPixelRatio() };
  }
  public dispose(): void {
    this.renderPass.dispose();
    this.bloom.dispose();
    this.output.dispose();
    this.composer.dispose();
    this.sun.shadow.dispose();
    this.renderer.dispose();
  }
}
