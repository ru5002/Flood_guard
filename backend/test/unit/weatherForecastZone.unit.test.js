const { resolveForecastZone } = require('../../src/services/weatherForecastService');

describe('Unit: resolveForecastZone', () => {
  it('resolves primary name Gampaha to Gampaha City', () => {
    expect(resolveForecastZone('Gampaha').name).toBe('Gampaha City');
  });

  it('resolves alias Ja Ela to Ja-Ela', () => {
    expect(resolveForecastZone('Ja Ela').name).toBe('Ja-Ela');
  });

  it('defaults unknown zone to first zone (Gampaha City)', () => {
    expect(resolveForecastZone('UnknownPlaceXYZ').name).toBe('Gampaha City');
  });

  it('is case-insensitive for known names', () => {
    expect(resolveForecastZone('gampaha').name).toBe('Gampaha City');
  });
});
