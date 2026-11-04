import { describe, expect, it } from 'vitest';
import { timeGreeting } from './greeting';

describe('saludo según la hora de Argentina', () => {
  it('elige mañana, tarde y noche con los límites correctos', () => {
    expect(timeGreeting(new Date('2026-11-03T11:00:00Z'))).toBe('Buenos días');
    expect(timeGreeting(new Date('2026-11-03T18:00:00Z'))).toBe('Buenas tardes');
    expect(timeGreeting(new Date('2026-11-04T01:00:00Z'))).toBe('Buenas noches');
  });
});
