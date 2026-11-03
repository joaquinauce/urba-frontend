import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Api, AuthStore, ForemanStore, reportText } from './api';
import { PersonalSessionStore } from './session';

describe('texto para compartir el informe', () => {
  it('incluye resultados reales, sobrecumplimiento y observaciones', () => {
    const text=reportText({id:'r',workId:'w',workName:'Iluminación Ciudad',date:'2026-10-27',foremanName:'Carlos Pérez',observations:'Faltaron postes',submittedAt:'',updatedAt:'',compliance:50,photos:[],items:[{id:'i',goalId:'g',activityId:'a',description:'Instalar postes',expected:10,actual:15,unit:'UNIDADES'}]});
    expect(text).toContain('15/10 unidades — 150%');
    expect(text).toContain('Fecha: 27/10/2026');
    expect(text).toContain('Cumplimiento general: 50%');
    expect(text).toContain('Faltaron postes');
  });
});

describe('cliente API por tipo de sesión', () => {
  let api: Api;
  let http: HttpTestingController;
  let admin: AuthStore;
  let personal: PersonalSessionStore;
  let legacy: ForemanStore;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(Api);
    http = TestBed.inject(HttpTestingController);
    admin = TestBed.inject(AuthStore);
    personal = TestBed.inject(PersonalSessionStore);
    legacy = TestBed.inject(ForemanStore);
    admin.set('admin-token');
    personal.set({
      accessToken: 'person-token',
      person: {
        id: 'person-1',
        administratorId: 'admin-1',
        fullName: 'Capataz Uno',
        roles: ['FOREMAN'],
      },
    });
    legacy.set('legacy-token');
  });

  afterEach(() => http.verify());

  it('usa el JWT administrativo para gestionar personas', async () => {
    const result = api.get<unknown[]>('admin/people');
    const request = http.expectOne('/api/admin/people');
    expect(request.request.headers.get('Authorization')).toBe('Bearer admin-token');
    request.flush([]);
    await expect(result).resolves.toEqual([]);
  });

  it('usa el JWT personal para obras e informes del miembro', async () => {
    const result = api.post('member/works/work-1/reports', { items: [] }, 'person');
    const request = http.expectOne('/api/member/works/work-1/reports');
    expect(request.request.headers.get('Authorization')).toBe('Bearer person-token');
    request.flush({ id: 'report-1' });
    await expect(result).resolves.toEqual({ id: 'report-1' });
  });

  it('mantiene separado el token del acceso legado', async () => {
    const result = api.get('public/session/today', 'foreman');
    const request = http.expectOne('/api/public/session/today');
    expect(request.request.headers.get('Authorization')).toBe('Bearer legacy-token');
    request.flush({});
    await expect(result).resolves.toEqual({});
  });
});
