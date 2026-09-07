import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateResilience } from '../core/risk-engine.mjs';

test('rio em 8 m gera atenção', () => {
  const out = evaluateResilience({ river_level_m: 8.0 });
  assert.equal(out.level, 'ATTENTION');
  assert.equal(out.color, 'YELLOW');
});

test('rio em 9,5 m gera alerta', () => {
  const out = evaluateResilience({ river_level_m: 9.5 });
  assert.equal(out.level, 'ALERT');
  assert.equal(out.color, 'ORANGE');
});

test('rio em 11 m gera alerta máximo', () => {
  const out = evaluateResilience({ river_level_m: 11.0 });
  assert.equal(out.level, 'MAX_ALERT');
  assert.equal(out.color, 'RED');
});

test('chuva superior a 50 mm/1h gera alerta', () => {
  const out = evaluateResilience({ rainfall_1h_mm: 50.01 });
  assert.equal(out.level, 'ALERT');
  assert.ok(out.hazards.includes('FLOODING'));
});

test('100 mm/72h não cruza regra >100; 100,01 cruza', () => {
  assert.equal(evaluateResilience({ rainfall_72h_mm: 100 }).level, 'ATTENTION');
  assert.equal(evaluateResilience({ rainfall_72h_mm: 100.01 }).level, 'ALERT');
});

test('nível 3 de barragem de mineração promove alerta máximo', () => {
  const out = evaluateResilience({ mining_dam_emergency_level: 3 });
  assert.equal(out.level, 'MAX_ALERT');
  assert.ok(out.hazards.includes('DAM_EMERGENCY'));
});
