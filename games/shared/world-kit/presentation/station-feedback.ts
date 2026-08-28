import * as THREE from 'three';

import { worldEventTypes } from '../domain/registry.ts';
import type {
  WalkWorldState,
  WorldDomainEvent,
} from '../domain/types.ts';
import { createInteractionRing } from './models.ts';

const stationFeedbackTuning = {
  pulseDurationSeconds: 0.5,
  pulseScale: 0.16,
  activeRingSpin: 1.8,
  activeRingScale: 1.12,
  pulseFrequency: 5,
} as const;

export interface WorldStationVisual {
  readonly interactionId: string;
  readonly root: THREE.Object3D;
  readonly accentColor: number;
  readonly anchorHeight: number;
}

export class StationFeedbackController {
  private readonly stationVisuals = new Map<string, WorldStationVisual>();
  private readonly stationRings = new Map<string, THREE.Mesh>();
  private readonly pulseEnds = new Map<string, number>();
  private sceneTime = 0;

  public constructor(
    root: THREE.Group,
    stationVisuals: ReadonlyArray<WorldStationVisual>,
  ) {
    for (const station of stationVisuals) {
      this.stationVisuals.set(station.interactionId, station);
      root.add(station.root);
      const ring = createInteractionRing(station.accentColor);
      ring.position.x = station.root.position.x;
      ring.position.z = station.root.position.z;
      this.stationRings.set(station.interactionId, ring);
      root.add(ring);
    }
  }

  public update(state: WalkWorldState, deltaSeconds: number): void {
    this.sceneTime += Math.max(0, deltaSeconds);
    for (const [interactionId, station] of this.stationVisuals) {
      this.updateStation(interactionId, station, state, deltaSeconds);
    }
  }

  public markEvent(event: WorldDomainEvent): void {
    if (
      event.type !== worldEventTypes.interactionStarted
      && event.type !== worldEventTypes.interactionCompleted
      && event.type !== worldEventTypes.interactionBlocked
    ) {
      return;
    }
    this.pulseEnds.set(
      event.interactionId,
      this.sceneTime + stationFeedbackTuning.pulseDurationSeconds,
    );
  }

  public project(
    interactionId: string,
    camera: THREE.OrthographicCamera,
    canvas: HTMLCanvasElement,
  ): { x: number; y: number; visible: boolean } | null {
    const station = this.stationVisuals.get(interactionId);
    if (station === undefined) {
      return null;
    }
    const point = new THREE.Vector3(
      station.root.position.x,
      station.anchorHeight,
      station.root.position.z,
    );
    point.project(camera);
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + (point.x + 1) * rect.width / 2,
      y: rect.top + (1 - point.y) * rect.height / 2,
      visible: point.z >= -1 && point.z <= 1,
    };
  }

  private updateStation(
    interactionId: string,
    station: WorldStationVisual,
    state: WalkWorldState,
    deltaSeconds: number,
  ): void {
    const ring = this.stationRings.get(interactionId);
    const active = state.activeInteraction?.interactionId === interactionId;
    const nearby = state.proximityId === interactionId;
    if (ring !== undefined) {
      ring.visible = active || nearby;
      ring.rotation.z += active
        ? deltaSeconds * stationFeedbackTuning.activeRingSpin
        : 0;
      ring.scale.setScalar(active ? stationFeedbackTuning.activeRingScale : 1);
    }

    const pulseEnd = this.pulseEnds.get(interactionId) ?? 0;
    const pulse = pulseEnd > this.sceneTime
      ? 1 + Math.sin(
        (pulseEnd - this.sceneTime)
          * Math.PI
          * stationFeedbackTuning.pulseFrequency,
      ) * stationFeedbackTuning.pulseScale
      : 1;
    station.root.scale.setScalar(pulse);
  }
}
