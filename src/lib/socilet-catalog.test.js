import { test, expect } from 'bun:test';
import { matchingSociletServices } from './socilet-catalog';
test('digital catalog includes the three existing Socilet campaign service scopes', () => {
  expect(matchingSociletServices().map(s => s.id)).toEqual(['website', 'web-app', 'mobile-app']);
});
test('Socilet services respect catalog search', () => {
  expect(matchingSociletServices('mobile').map(s => s.id)).toEqual(['mobile-app']);
  expect(matchingSociletServices('bicycle')).toEqual([]);
});