import { Enemy } from './Enemy';

export class PrismWardenBoss extends Enemy {
  public phaseTimer = 0;
  public beamAngle = -Math.PI * 0.75;
  public beamTelegraph = 0;
  public beamActive = 0;
  public droneSpawnTimer = 3;
  public volleyTimer = 2.2;

  resetBoss(): void {
    this.phaseTimer = 0;
    this.beamAngle = -Math.PI * 0.75;
    this.beamTelegraph = 2;
    this.beamActive = 0;
    this.droneSpawnTimer = 3;
    this.volleyTimer = 1.8;
  }
}
