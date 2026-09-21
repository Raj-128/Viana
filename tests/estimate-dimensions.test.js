import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateDimensions } from '../src/js/estimate-dimensions.js';

test('inch and centimeter inputs price the same physical wall equally', () => {
  const imperial = estimateDimensions(80, 40, 'in');
  const metric = estimateDimensions(203.2, 101.6, 'cm');
  assert.equal(imperial.centimeters, metric.centimeters);
  assert.equal(imperial.dimensionFactor, 120);
  assert.equal(imperial.rateMultiplier, 2.54);
  assert.equal(imperial.centimeters * 46, metric.centimeters * 46);
});

test('fractional inches and invalid dimensions respect the converted limits', () => {
  assert.equal(estimateDimensions(78.74, 39.37, 'in').dimensionFactor, 118.11);
  const bounded = estimateDimensions('', 1000, 'in');
  assert.equal(bounded.width, 15.75);
  assert.equal(bounded.height, 196.85);
  assert.equal(estimateDimensions(NaN, Infinity, 'in').dimensionFactor, 31.5);
  assert.equal(estimateDimensions(200, 100).centimeters, 300);
});
