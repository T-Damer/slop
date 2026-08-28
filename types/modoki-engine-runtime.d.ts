declare module '@modoki/engine/runtime' {
  export interface Vector3Value {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  }

  export interface GameConfig {
    readonly world: {
      readonly gravity: Vector3Value;
      readonly bounds: {
        readonly min: Vector3Value;
        readonly max: Vector3Value;
      };
    };
    readonly scene: string;
  }

  export interface GameDefinition {
    readonly id: string;
    readonly name: string;
    readonly loadConfig: () => Promise<GameConfig>;
    readonly registerSystems: () => void | Promise<void>;
    readonly unregisterSystems: () => void | Promise<void>;
  }
}
