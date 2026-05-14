const { riskFromThresholds } = require('../../src/services/irrigationDataService');

describe('Unit: riskFromThresholds (official gauge thresholds)', () => {
  const thresholds = { alert: 3.3, minor: 4.4, major: 5.5 };

  it('returns None for non-finite water level', () => {
    expect(riskFromThresholds(NaN, thresholds)).toBe('None');
    expect(riskFromThresholds('bad', thresholds)).toBe('None');
  });

  it('returns Low when level is between 1.5 and alert threshold', () => {
    expect(riskFromThresholds(2.0, thresholds)).toBe('Low');
  });

  it('returns Moderate at alert threshold', () => {
    expect(riskFromThresholds(3.3, thresholds)).toBe('Moderate');
  });

  it('returns High at minor threshold', () => {
    expect(riskFromThresholds(4.4, thresholds)).toBe('High');
  });

  it('returns Critical at major threshold', () => {
    expect(riskFromThresholds(5.5, thresholds)).toBe('Critical');
  });

  it('returns None below 1.5 when no numeric thresholds crossed', () => {
    expect(riskFromThresholds(1.0, {})).toBe('None');
  });
});
