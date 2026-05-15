const {
  aliasesForZone,
  emergencyMessage,
  AUTO_SENT_BY,
} = require('../../src/services/automaticAlertService');

describe('Unit: automatic SMS alert helpers', () => {
  it('maps Gampaha City alerts to registered Gampaha users', () => {
    expect(aliasesForZone('Gampaha City')).toEqual(['Gampaha City', 'Gampaha']);
  });

  it('creates a critical evacuation message with DMC contact', () => {
    const message = emergencyMessage({
      location: 'Gampaha City',
      riskLevel: 'Critical',
      floodProbability: 0.91,
    });

    expect(message).toContain('CRITICAL ALERT');
    expect(message).toContain('Move to higher ground');
    expect(message).toContain('DMC: 117');
    expect(message).toContain('91%');
  });

  it('uses a stable system sender label for cooldown checks', () => {
    expect(AUTO_SENT_BY).toBe('auto-risk-monitor');
  });
});
