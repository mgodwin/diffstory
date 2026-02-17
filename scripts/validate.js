#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = process.argv[2];

if (!path) {
  console.error('Usage: node validate.js <json-file>');
  process.exit(1);
}

const d = JSON.parse(fs.readFileSync(path, 'utf8'));
const assert = (c, m) => { if (!c) throw new Error(m); };

assert(d.source, 'missing source');
assert(d.title, 'missing title');
assert(d.summary, 'missing summary');
assert(d.criticality && d.criticality.level, 'missing criticality.level');
assert(typeof d.criticality.explanation === 'string', 'missing criticality.explanation');
assert(Array.isArray(d.criticality.risks), 'missing criticality.risks array');
assert(d.approachEvaluation, 'missing approachEvaluation');
{
  const validVerdicts = ['optimal', 'acceptable', 'suboptimal'];
  assert(validVerdicts.includes(d.approachEvaluation.verdict), 'approachEvaluation.verdict must be optimal, acceptable, or suboptimal');
  assert(typeof d.approachEvaluation.summary === 'string', 'approachEvaluation.summary must be a string');
  if (d.approachEvaluation.alternatives) {
    assert(Array.isArray(d.approachEvaluation.alternatives), 'approachEvaluation.alternatives must be an array');
  }
  if (d.approachEvaluation.perspectives) {
    assert(Array.isArray(d.approachEvaluation.perspectives), 'approachEvaluation.perspectives must be an array');
    const validRoles = ['maintainer', 'security', 'sre', 'spec', 'consumer'];
    const validSev = ['high', 'medium', 'low'];
    d.approachEvaluation.perspectives.forEach((p, i) => {
      assert(validRoles.includes(p.role), 'perspectives[' + i + '].role must be one of: ' + validRoles.join(', '));
      assert(typeof p.concern === 'string', 'perspectives[' + i + '].concern must be a string');
      assert(validSev.includes(p.severity), 'perspectives[' + i + '].severity must be high, medium, or low');
    });
  }
}
if (d.sideEffects) {
  assert(Array.isArray(d.sideEffects), 'sideEffects must be an array');
  const validSeverities = ['high', 'medium', 'low'];
  d.sideEffects.forEach((se, i) => {
    assert(typeof se.area === 'string', 'sideEffects[' + i + '].area must be a string');
    assert(typeof se.description === 'string', 'sideEffects[' + i + '].description must be a string');
    assert(validSeverities.includes(se.severity), 'sideEffects[' + i + '].severity must be high, medium, or low');
  });
}
assert(Array.isArray(d.narratives), 'narratives must be an array');
d.narratives.forEach((n, i) => {
  assert(n.id, 'narrative ' + i + ' missing id');
  assert(n.title, 'narrative ' + i + ' missing title');
  assert(Array.isArray(n.steps), 'narrative ' + i + ' steps must be array');
  n.steps.forEach((s, j) => {
    assert(s.id, 'step ' + j + ' missing id');
    assert(Array.isArray(s.hunks), 'step ' + j + ' hunks must be array');
  });
});

console.log('Schema validation passed: ' + d.narratives.length + ' narratives, ' +
  d.narratives.reduce((a, n) => a + n.steps.length, 0) + ' steps');
