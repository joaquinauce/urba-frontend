import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Api, type PersonSummary, type WorkAssignment } from './api';
import { PeoplePage, WorkAssignmentsComponent } from './people-page';

const people: PersonSummary[] = [
  {
    id: 'person-1',
    fullName: 'Capataz Uno',
    isActive: true,
    hasCode: true,
    failedAttempts: 0,
    lockedUntil: null,
    lastAccessAt: null,
    roles: ['FOREMAN'],
    activeAssignments: 1,
  },
  {
    id: 'person-2',
    fullName: 'Capataz Dos',
    isActive: true,
    hasCode: true,
    failedAttempts: 0,
    lockedUntil: null,
    lastAccessAt: null,
    roles: ['FOREMAN'],
    activeAssignments: 0,
  },
];

const assignments: WorkAssignment[] = [
  {
    id: 'assignment-1',
    personId: 'person-1',
    personName: 'Capataz Uno',
    roleCode: 'FOREMAN',
    isPrimary: false,
    assignedAt: '2026-11-03T12:00:00Z',
    unassignedAt: null,
    active: true,
  },
];

describe('asignaciones múltiples', () => {
  let post: ReturnType<typeof vi.fn>;
  let patch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    post = vi.fn(async () => ({}));
    patch = vi.fn(async () => ({}));
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Api,
          useValue: {
            get: vi.fn(async (path: string) =>
              path === 'admin/people' ? people : assignments,
            ),
            post,
            patch,
          },
        },
      ],
    });
  });

  it('oculta duplicados activos y asigna otra persona con el rol correcto', async () => {
    const fixture = TestBed.createComponent(WorkAssignmentsComponent);
    fixture.componentInstance.workId = 'work-1';
    fixture.detectChanges();
    await fixture.componentInstance.load();
    expect(fixture.componentInstance.eligible('FOREMAN').map((item) => item.id)).toEqual(['person-2']);
    fixture.componentInstance.selected.FOREMAN = 'person-2';
    await fixture.componentInstance.assign('FOREMAN');
    expect(post).toHaveBeenCalledWith('admin/works/work-1/assignments', {
      personId: 'person-2',
      roleCode: 'FOREMAN',
    });
  });

  it('desasigna sin borrar el historial', async () => {
    vi.stubGlobal('confirm', () => true);
    const fixture = TestBed.createComponent(WorkAssignmentsComponent);
    fixture.componentInstance.workId = 'work-1';
    await fixture.componentInstance.load();
    await fixture.componentInstance.unassign(assignments[0]);
    expect(patch).toHaveBeenCalledWith(
      'admin/works/work-1/assignments/assignment-1/unassign',
      {},
    );
  });
});

describe('alta con credenciales', () => {
  it('edita nombre, clave y acceso sin reenviar el rol ni el email', async () => {
    const patch = vi.fn(async () => ({}));
    const person: PersonSummary = {
      id: 'person-edit', fullName: 'Nombre anterior', email: 'jefa@example.com',
      isActive: true, hasCode: false, hasPassword: true, failedAttempts: 0,
      lockedUntil: null, lastAccessAt: null, roles: ['SITE_MANAGER'], activeAssignments: 0,
    };
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    vi.stubGlobal('confirm', () => true);
    TestBed.configureTestingModule({ providers: [{ provide: Api, useValue: {
      get: vi.fn(async (path: string) => path === 'admin/people' ? [person] : []), patch,
    } }] });
    const fixture = TestBed.createComponent(PeoplePage);
    await fixture.componentInstance.load();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.person-actions button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.editing).toBe('person-edit');
    fixture.componentInstance.form.fullName = 'Nombre nuevo';
    fixture.componentInstance.form.password = 'clave-nueva-123';
    fixture.componentInstance.form.isActive = false;
    await fixture.componentInstance.save();
    expect(patch).toHaveBeenCalledWith('admin/people/person-edit', {
      fullName: 'Nombre nuevo', password: 'clave-nueva-123', isActive: false,
    });
  });

  it('permite elegir un solo tipo de usuario y mostrar la contraseña', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: Api, useValue: { get: vi.fn(async () => []) } }] });
    const fixture = TestBed.createComponent(PeoplePage);
    fixture.detectChanges();
    const admin = fixture.nativeElement.querySelector('input[value="ADMINISTRATOR"]') as HTMLInputElement;
    const foreman = fixture.nativeElement.querySelector('input[value="FOREMAN"]') as HTMLInputElement;
    admin.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.roles()).toEqual(['ADMINISTRATOR']);
    foreman.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.roles()).toEqual(['FOREMAN']);
    admin.click();
    await fixture.whenStable();
    fixture.detectChanges();
    const password = fixture.nativeElement.querySelector('input[name="password"]') as HTMLInputElement;
    expect(password.type).toBe('password');
    (fixture.nativeElement.querySelector('.password-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(password.type).toBe('text');
  });

  it('crea al jefe de obra con email y contraseña', async () => {
    localStorage.clear();
    sessionStorage.clear();
    const post = vi.fn(async (path: string) =>
      path === 'admin/people'
        ? { id: 'person-new', fullName: 'Jefa Nueva' }
        : { code: '123456' },
    );
    TestBed.configureTestingModule({
      providers: [
        {
          provide: Api,
          useValue: {
            get: vi.fn(async () => []),
            post,
            patch: vi.fn(),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(PeoplePage);
    fixture.componentInstance.form = {
      fullName: 'Jefa Nueva',
      role: 'SITE_MANAGER',
      email: 'jefa@example.com',
      password: 'clave-segura-123',
      isActive: true,
    };
    await fixture.componentInstance.save();
    expect(post).toHaveBeenNthCalledWith(1, 'admin/people', {
      fullName: 'Jefa Nueva',
      roles: ['SITE_MANAGER'],
      email: 'jefa@example.com',
      password: 'clave-segura-123',
    });
    expect(post).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.revealedCode).toBe('');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.management-steps')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Entregá su acceso');
  });
});
