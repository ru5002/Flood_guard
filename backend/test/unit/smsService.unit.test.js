const { normalizeSriLankanPhone, isTwilioConfigured } = require('../../src/services/smsService');

describe('Unit: SMS phone normalization', () => {
  it('normalizes 077… to +94…', () => {
    expect(normalizeSriLankanPhone('0773264573')).toBe('+94773264573');
  });

  it('normalizes 94… without plus to +94…', () => {
    expect(normalizeSriLankanPhone('94773264573')).toBe('+94773264573');
  });

  it('keeps E.164 with leading +', () => {
    expect(normalizeSriLankanPhone('+94773264573')).toBe('+94773264573');
  });

  it('strips spaces and dashes', () => {
    expect(normalizeSriLankanPhone('077 326 4573')).toBe('+94773264573');
  });
});

describe('Unit: Twilio configuration flag', () => {
  const saved = {};

  beforeEach(() => {
    ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER', 'TWILIO_MESSAGING_SERVICE_SID'].forEach((k) => {
      saved[k] = process.env[k];
      delete process.env[k];
    });
  });

  afterEach(() => {
    Object.keys(saved).forEach((k) => {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    });
  });

  it('returns false when Twilio env vars are missing', () => {
    expect(isTwilioConfigured()).toBe(false);
  });

  it('returns true when SID, token, and FROM number are set', () => {
    process.env.TWILIO_ACCOUNT_SID = 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    process.env.TWILIO_AUTH_TOKEN = 'token';
    process.env.TWILIO_FROM_NUMBER = '+15555550100';
    expect(isTwilioConfigured()).toBe(true);
  });

  it('returns true when messaging service SID is used instead of FROM', () => {
    process.env.TWILIO_ACCOUNT_SID = 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    process.env.TWILIO_AUTH_TOKEN = 'token';
    process.env.TWILIO_MESSAGING_SERVICE_SID = 'MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    expect(isTwilioConfigured()).toBe(true);
  });
});
