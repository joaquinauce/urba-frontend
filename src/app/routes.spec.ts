import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthStore } from './api';
import { adminGuard, personalForemanGuard, routes, siteManagerGuard } from './app.routes';
import { PersonalSessionStore } from './session';

describe('rutas autorizadas por perfil', () => {
  let admin: AuthStore;
  let personal: PersonalSessionStore;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    admin = TestBed.inject(AuthStore);
    personal = TestBed.inject(PersonalSessionStore);
    router = TestBed.inject(Router);
  });

  it('protege por separado administración, supervisión y carga personal', () => {
    const byPath = new Map(routes.map((route) => [route.path, route]));
    expect(byPath.get('dashboard')?.canActivate).toHaveLength(1);
    expect(byPath.get('personas')?.canActivate).toHaveLength(1);
    expect(byPath.get('informes')?.canActivate).toHaveLength(1);
    expect(byPath.get('informes/objetivos-diarios')?.canActivate).toHaveLength(1);
    expect(byPath.get('informes/rendiciones')?.canActivate).toHaveLength(1);
    expect(byPath.get('rendiciones')?.redirectTo).toBe('informes/rendiciones');
    expect(byPath.get('configuracion')?.canActivate).toHaveLength(1);
    expect(byPath.get('configuracion/tipos-de-gasto')?.canActivate).toHaveLength(1);
    expect(byPath.get('supervision')?.canActivate).toHaveLength(2);
    expect(byPath.get('supervision/:id')?.canActivate).toHaveLength(2);
    expect(byPath.get('mis-obras')?.canActivate).toHaveLength(2);
    expect(byPath.get('mis-obras/:id')?.canActivate).toHaveLength(2);
    expect(byPath.get('mi-obra/gastos')?.canActivate).toHaveLength(1);
  });

  it('conserva las rutas del acceso legado', () => {
    const paths = routes.map((route) => route.path);
    expect(paths).toContain('capataz');
    expect(paths).toContain('mi-obra');
    expect(paths).toContain('obra/:code');
  });

  it('rechaza el panel administrativo sin una sesión administrativa', () => {
    const result = TestBed.runInInjectionContext(adminGuard);
    expect(router.serializeUrl(result === true ? router.createUrlTree(['/']) : result)).toBe('/login');
    admin.set('admin-token');
    expect(TestBed.runInInjectionContext(adminGuard)).toBe(true);
  });

  it('permite el flujo de carga al jefe de obra y al capataz', () => {
    personal.set({
      accessToken: 'site-token',
      person: { id: 'site', administratorId: 'admin', fullName: 'Jefe', roles: ['SITE_MANAGER'] },
    });
    expect(TestBed.runInInjectionContext(siteManagerGuard)).toBe(true);
    expect(TestBed.runInInjectionContext(personalForemanGuard)).toBe(true);

    personal.set({
      accessToken: 'foreman-token',
      person: { id: 'foreman', administratorId: 'admin', fullName: 'Capataz', roles: ['FOREMAN'] },
    });
    expect(TestBed.runInInjectionContext(personalForemanGuard)).toBe(true);
    const supervisorDenied = TestBed.runInInjectionContext(siteManagerGuard);
    expect(router.serializeUrl(supervisorDenied === true ? router.createUrlTree(['/']) : supervisorDenied)).toBe('/mis-obras');
  });
});
