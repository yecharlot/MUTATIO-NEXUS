const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../server/services/rules');

describe('rules', () => {
  it('initial state has resources and indicators', () => {
    const s = rules.initialWorldState();
    assert.ok(s.resources.energia > 0);
    assert.ok(s.indicators.confianza_social > 0);
    assert.equal(s.mystery.interpretation, 'indeterminada');
  });

  it('applyAction changes energy for inversion_solar', () => {
    const s = rules.initialWorldState();
    s.resources.materiales = 20;
    s.resources.conocimiento = 20;
    const { state, action } = rules.applyAction(s, 'inversion_solar', () => 1);
    assert.equal(action.key, 'inversion_solar');
    assert.ok(state.resources.energia >= s.resources.energia);
  });

  it('rejects unknown action', () => {
    assert.throws(() => rules.applyAction(rules.initialWorldState(), 'nope'));
  });
});
