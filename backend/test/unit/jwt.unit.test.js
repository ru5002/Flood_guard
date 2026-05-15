const jwt = require('jsonwebtoken');

describe('Unit: JWT sign and verify', () => {
  const secret = 'jest_jwt_secret_fixed';

  it('signs and verifies a payload with matching secret', () => {
    const token = jwt.sign({ sub: 'user-1', role: 'user' }, secret, { expiresIn: '1h' });
    const decoded = jwt.verify(token, secret);
    expect(decoded.sub).toBe('user-1');
    expect(decoded.role).toBe('user');
  });

  it('fails verify when token was signed with a different secret', () => {
    const token = jwt.sign({ sub: 'user-1' }, secret, { expiresIn: '1h' });
    expect(() => jwt.verify(token, 'other_secret')).toThrow();
  });

  it('fails verify on tampered token', () => {
    const token = jwt.sign({ sub: 'user-1' }, secret, { expiresIn: '1h' });
    const parts = token.split('.');
    expect(parts.length).toBe(3);
    const tampered = `${parts[0]}.${parts[1]}x.${parts[2]}`;
    expect(() => jwt.verify(tampered, secret)).toThrow();
  });
});
