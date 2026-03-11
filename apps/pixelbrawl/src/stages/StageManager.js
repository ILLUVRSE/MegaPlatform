import { neonDojo } from "./neonDojo.js";
import { streetAlley } from "./streetAlley.js";
import { temple } from "./temple.js";
import { octagon } from "./octagon.js";

const stages = [neonDojo, streetAlley, temple, octagon];

export class StageManager {
  static getAllStages() {
    return stages;
  }

  static getStageById(id) {
    return stages.find((s) => s.id === id) || neonDojo;
  }
}
