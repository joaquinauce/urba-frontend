import { beforeEach, describe, expect, it } from 'vitest';
import {
  PersonalSessionStore,
  personalLanding,
  roleLabel,
  type PersonIdentity,
} from './session';

function person(roles: PersonIdentity['roles']): PersonIdentity {
  return {
    id: 'person-1',
    administratorId: 'admin-1',
    fullName: 'Persona de prueba',
    roles,
  };
}

describe('sesiones personales tipadas', () => {
  beforeEach(() => sessionStorage.clear());

  it('dirige al jefe de obra hacia la supervisión de solo lectura', () => {
    expect(personalLanding(person(['SITE_MANAGER']))).toBe('/supervision');
  });

  it('dirige al capataz hacia el flujo de carga, incluso si posee ambos roles', () => {
    expect(personalLanding(person(['FOREMAN']))).toBe('/mis-obras');
    expect(personalLanding(person(['SITE_MANAGER', 'FOREMAN']))).toBe(
      '/mis-obras',
    );
  });

  it('presenta nombres de rol comprensibles', () => {
    expect(roleLabel('SITE_MANAGER')).toBe('Jefe de obra');
    expect(roleLabel('FOREMAN')).toBe('Capataz');
  });

  it('elimina token e identidad al cerrar la sesión', () => {
    const store = new PersonalSessionStore();
    store.set({ accessToken: 'jwt-personal', person: person(['FOREMAN']) });
    expect(store.token()).toBe('jwt-personal');
    store.clear();
    expect(store.session()).toBeNull();
    expect(sessionStorage.getItem('beurba-person-session')).toBeNull();
  });
});

