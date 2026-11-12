import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Api, AuthStore, type MemberWork } from './api';
import { ClientChoicePage } from './client-choice-page';
import { ClientSelectionStore, WorkSelectionStore } from './context';
import { MemberWorksPage } from './member-pages';
import { LoginPage } from './login-page';
import { PersonalSessionStore } from './session';

const works: MemberWork[] = [
  { id: 'work-a', name: 'Obra A', description: null, location: null, status: 'ACTIVA',
    startDate: '2026-01-01', estimatedEndDate: '2026-12-01', foremanName: 'Florencia', roles: ['FOREMAN'] },
  { id: 'work-b', name: 'Obra B', description: null, location: null, status: 'ACTIVA',
    startDate: '2026-01-01', estimatedEndDate: '2026-12-01', foremanName: 'Florencia', roles: ['FOREMAN'] },
];

describe('ingreso y selección de fase 5', () => {
  beforeEach(() => sessionStorage.clear());

  it('un login con varios clientes guarda solo la selección pendiente', async () => {
    const post = vi.fn(async () => ({ requiresClientSelection: true, selectionToken: 'selection',
      clients: [{ clientId: 'a', name: 'A', roles: ['FOREMAN'] }, { clientId: 'b', name: 'B', roles: ['FOREMAN'] }] }));
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: Api, useValue: { post } }] });
    const page = TestBed.createComponent(LoginPage).componentInstance;
    page.email = 'florencia@example.com'; page.password = 'clave-segura';
    await page.submit();
    expect(TestBed.inject(ClientSelectionStore).pending()?.clients).toHaveLength(2);
    expect(TestBed.inject(AuthStore).token()).toBe('');
    expect(TestBed.inject(PersonalSessionStore).token()).toBe('');
  });

  it('un login con un solo cliente entra sin selector', async () => {
    const post = vi.fn(async () => ({ accessToken: 'single-token', person: { id: 'p', clientId: 'a',
      clientName: 'Constructora A', administratorId: 'a', fullName: 'Florencia', roles: ['FOREMAN'] } }));
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: Api, useValue: { post } }] });
    const page = TestBed.createComponent(LoginPage).componentInstance;
    page.email = 'florencia@example.com'; page.password = 'clave-segura';
    await page.submit();
    expect(TestBed.inject(PersonalSessionStore).person()?.clientId).toBe('a');
    expect(TestBed.inject(ClientSelectionStore).pending()).toBeNull();
  });

  it('al elegir B usa el token de selección y instala la sesión de B', async () => {
    const post = vi.fn(async () => ({ accessToken: 'token-b', person: { id: 'p', clientId: 'b',
      clientName: 'Constructora B', administratorId: 'b', fullName: 'Florencia', roles: ['FOREMAN'] } }));
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: Api, useValue: { post } }] });
    const selection = TestBed.inject(ClientSelectionStore);
    const client = { clientId: 'b', name: 'Constructora B', roles: ['FOREMAN'] };
    selection.set({ selectionToken: 'signed-selection', mode: 'pin', clients: [client] });
    const page = TestBed.createComponent(ClientChoicePage).componentInstance;
    await page.choose(client);
    expect(post).toHaveBeenCalledWith('auth/personal/select-client',
      { selectionToken: 'signed-selection', clientId: 'b' }, 'public');
    expect(TestBed.inject(PersonalSessionStore).person()?.clientId).toBe('b');
    expect(selection.pending()).toBeNull();
  });

  it('cambia de A a B con la sesión actual sin pedir credenciales', async () => {
    const clients = [{ clientId: 'a', name: 'A', roles: ['ADMINISTRATOR'] },
      { clientId: 'b', name: 'B', roles: ['FOREMAN'] }];
    const get = vi.fn(async () => clients);
    const post = vi.fn(async () => ({ accessToken: 'token-b', person: { id: 'p', clientId: 'b',
      clientName: 'B', administratorId: 'b', fullName: 'Florencia', roles: ['FOREMAN'] } }));
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: Api, useValue: { get, post } }] });
    const admin = TestBed.inject(AuthStore);
    admin.set('token-a', { id: 'p', email: 'p@example.com', fullName: 'Florencia', role: 'ADMINISTRATOR', clientId: 'a' });
    const page = TestBed.createComponent(ClientChoicePage).componentInstance;
    await page.load();
    expect(get).toHaveBeenCalledWith('auth/contexts', 'admin');
    await page.choose(clients[1]);
    expect(post).toHaveBeenCalledWith('auth/switch-client', { clientId: 'b' }, 'admin');
    expect(admin.token()).toBe('');
    expect(TestBed.inject(PersonalSessionStore).person()?.clientId).toBe('b');
  });

  it('una obra se abre directamente y varias muestran el selector', async () => {
    const get = vi.fn(async () => [works[0]]);
    const navigate = vi.fn(async () => true);
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: Api, useValue: { get } },
      { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } }] });
    TestBed.inject(PersonalSessionStore).set({ accessToken: 'token', person: { id: 'p',
      clientId: 'a', administratorId: 'a', fullName: 'Florencia', roles: ['FOREMAN'] } });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(navigate);
    const page = TestBed.createComponent(MemberWorksPage).componentInstance;
    await page.load();
    expect(navigate).toHaveBeenCalledWith(['/mis-obras', 'work-a']);
    expect(TestBed.inject(WorkSelectionStore).selected()?.id).toBe('work-a');
    get.mockResolvedValueOnce(works);
    navigate.mockClear();
    await page.load();
    expect(navigate).not.toHaveBeenCalled();
    expect(page.works).toHaveLength(2);
    page.select(works[1]);
    expect(TestBed.inject(WorkSelectionStore).selected()?.id).toBe('work-b');
  });
});
