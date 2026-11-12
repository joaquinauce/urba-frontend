import { beforeEach, describe, expect, it } from 'vitest';
import { AuthStore, ForemanStore } from './api';
import { ClientSelectionStore, WorkSelectionStore, applyLoginResult, validToken } from './context';
import { PersonalSessionStore } from './session';

describe('cambio de contexto multicliente', () => {
  beforeEach(() => sessionStorage.clear());

  it('conserva la selección pendiente al actualizar y distingue PIN de contraseña', () => {
    const initial = new ClientSelectionStore();
    initial.set({ selectionToken: 'signed-selection', mode: 'pin', clients: [
      { clientId: 'a', name: 'A', roles: ['FOREMAN'] },
      { clientId: 'b', name: 'B', roles: ['SITE_MANAGER'] },
    ] });
    expect(new ClientSelectionStore().pending()?.mode).toBe('pin');
  });

  it('descarta sesión y obra de A antes de instalar la sesión autorizada de B', () => {
    const auth = new AuthStore(), personal = new PersonalSessionStore(), foreman = new ForemanStore();
    const works = new WorkSelectionStore(), selection = new ClientSelectionStore();
    auth.set('token-a', { id: 'p', email: 'p@example.com', fullName: 'Florencia', role: 'ADMINISTRATOR', clientId: 'a' });
    personal.set({ accessToken: 'token-a', person: { id: 'p', administratorId: 'a', clientId: 'a', fullName: 'Florencia', roles: ['FOREMAN'] } });
    works.set({ clientId: 'a', id: 'obra-a', name: 'Obra A' });
    const path = applyLoginResult({ accessToken: 'token-b', person: { id: 'p', administratorId: 'b',
      clientId: 'b', clientName: 'Constructora B', fullName: 'Florencia', roles: ['SITE_MANAGER'] } },
    auth, personal, foreman, works, selection);
    expect(path).toBe('/mis-obras');
    expect(auth.token()).toBe('');
    expect(personal.token()).toBe('token-b');
    expect(personal.person()?.clientId).toBe('b');
    expect(works.selected()).toBeNull();
    expect(new PersonalSessionStore().person()?.clientId).toBe('b');
  });

  it('mantiene ambos roles de una persona administradora y capataz', () => {
    const auth = new AuthStore(), personal = new PersonalSessionStore(), foreman = new ForemanStore();
    const path = applyLoginResult({ accessToken: 'combined', administrator: { id: 'p', email: 'p@example.com',
      fullName: 'Florencia', role: 'ADMINISTRATOR', clientId: 'a', roles: ['FOREMAN'] },
      person: { id: 'p', administratorId: 'a', clientId: 'a', fullName: 'Florencia', roles: ['FOREMAN'] } },
    auth, personal, foreman, new WorkSelectionStore(), new ClientSelectionStore());
    expect(path).toBe('/dashboard');
    expect(auth.token()).toBe('combined');
    expect(personal.token()).toBe('combined');
  });

  it('reconoce expiración local al restaurar un JWT', () => {
    const token = (exp: number) => `x.${btoa(JSON.stringify({ exp }))}.x`;
    expect(validToken(token(Math.floor(Date.now() / 1000) + 60))).toBe(true);
    expect(validToken(token(Math.floor(Date.now() / 1000) - 60))).toBe(false);
    expect(validToken('invalid')).toBe(false);
  });
});
