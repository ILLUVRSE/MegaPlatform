import type { EnemyArchetype } from './starlightTypes';

export const ENEMIES: EnemyArchetype[] = [
  { id: 'scout', hp: 34, speed: 95, fireRate: 0.7, bulletSpeed: 190, damageType: 'Kinetic', score: 80, contactDamage: 12, resistances: { Kinetic: 1, Thermal: 1.05 } },
  { id: 'dart', hp: 24, speed: 150, fireRate: 0.35, bulletSpeed: 230, damageType: 'Thermal', score: 92, contactDamage: 10, resistances: { EM: 1.1, Thermal: 0.85 } },
  { id: 'turret', hp: 78, speed: 50, fireRate: 1.2, bulletSpeed: 150, damageType: 'EM', score: 120, contactDamage: 14, resistances: { EM: 0.7, Plasma: 1.1 } },
  { id: 'sniper', hp: 48, speed: 72, fireRate: 0.92, bulletSpeed: 275, damageType: 'Plasma', score: 135, contactDamage: 11, resistances: { Thermal: 1.2 } },
  { id: 'drone', hp: 38, speed: 104, fireRate: 0.8, bulletSpeed: 210, damageType: 'Kinetic', score: 104, contactDamage: 9, resistances: { EM: 0.95 } },
  { id: 'bomber', hp: 90, speed: 64, fireRate: 0.45, bulletSpeed: 135, damageType: 'Thermal', score: 158, contactDamage: 18, resistances: { Kinetic: 0.85, Plasma: 1.15 } },
  { id: 'midboss', hp: 820, speed: 48, fireRate: 1.8, bulletSpeed: 215, damageType: 'EM', score: 1500, contactDamage: 25, resistances: { EM: 0.7, Kinetic: 1, Thermal: 1.1, Plasma: 1 } },
  { id: 'prism-warden', hp: 2100, speed: 40, fireRate: 2.3, bulletSpeed: 240, damageType: 'Plasma', score: 5200, contactDamage: 30, resistances: { EM: 0.7, Kinetic: 0.9, Thermal: 0.75, Plasma: 1.35 } }
];

export const ENEMY_BY_ID = new Map(ENEMIES.map((enemy) => [enemy.id, enemy]));
