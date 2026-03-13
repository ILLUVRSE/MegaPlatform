import type { MinigolfCourse } from '../../../src/games/minigolf/types';

export const minigolfReplayFixtureCourse: MinigolfCourse = {
  holes: [
    {
      id: 'fixture-bumper-bounce',
      name: 'Fixture Bumper Bounce',
      theme: 'classic',
      par: 3,
      bounds: { x: 0, y: 0, width: 320, height: 220 },
      start: { x: 44, y: 110 },
      cup: { x: 286, y: 110, radius: 16 },
      walls: [],
      bumpers: [{ kind: 'circle', x: 166, y: 110, radius: 22 }],
      hazards: {
        water: [],
        surfaces: [],
        slopes: []
      },
      movingObstacles: []
    },
    {
      id: 'fixture-water-lane',
      name: 'Fixture Water Lane',
      theme: 'classic',
      par: 3,
      bounds: { x: 0, y: 0, width: 320, height: 220 },
      start: { x: 40, y: 110 },
      cup: { x: 286, y: 110, radius: 16 },
      walls: [],
      bumpers: [],
      hazards: {
        water: [{ kind: 'rect', x: 150, y: 0, width: 70, height: 220 }],
        surfaces: [],
        slopes: []
      },
      movingObstacles: []
    },
    {
      id: 'fixture-sand-trap',
      name: 'Fixture Sand Trap',
      theme: 'classic',
      par: 3,
      bounds: { x: 0, y: 0, width: 320, height: 220 },
      start: { x: 40, y: 110 },
      cup: { x: 286, y: 110, radius: 16 },
      walls: [],
      bumpers: [],
      hazards: {
        water: [],
        surfaces: [{ kind: 'rect', x: 100, y: 40, width: 140, height: 120, material: 'sand' }],
        slopes: []
      },
      movingObstacles: []
    },
    {
      id: 'fixture-moving-gate',
      name: 'Fixture Moving Gate',
      theme: 'classic',
      par: 3,
      bounds: { x: 0, y: 0, width: 320, height: 220 },
      start: { x: 40, y: 110 },
      cup: { x: 286, y: 110, radius: 16 },
      walls: [],
      bumpers: [],
      hazards: {
        water: [],
        surfaces: [],
        slopes: []
      },
      movingObstacles: [
        {
          id: 'sweeper',
          kind: 'rect',
          x: 140,
          y: 76,
          width: 34,
          height: 68,
          axis: 'y',
          range: 20,
          speed: 2.4,
          phase: 0.45
        }
      ]
    }
  ]
};
