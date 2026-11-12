import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
        provideRouter([]),
        {
          provide: Api,
          useValue: {
            get: vi.fn(async (path: string) =>
              path === 'admin/people' ? people : path === 'admin/foremen' ? [
                { id: 'foreman-1', firstName: 'Juan', lastName: 'Capataz', isActive: true },
                { id: 'foreman-2', firstName: 'Pedro', lastName: 'Gómez', isActive: true },
              ] : assignments,
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
    const fixture = TestBed.createComponent(WorkAssignmentsComponent);
    fixture.componentInstance.workId = 'work-1';
    await fixture.componentInstance.load();
    fixture.componentInstance.requestUnassign(assignments[0]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#unassign-title').textContent).toBe('Desasignar responsable');
    expect(patch).not.toHaveBeenCalled();
    fixture.componentInstance.closeUnassign();
    expect(fixture.componentInstance.pendingUnassign).toBeNull();
    fixture.componentInstance.requestUnassign(assignments[0]);
    await fixture.componentInstance.confirmUnassign();
    expect(patch).toHaveBeenCalledWith(
      'admin/works/work-1/assignments/assignment-1/unassign',
      {},
    );
  });

  it('muestra el capataz responsable de la obra aunque no tenga asignación personal', async () => {
    TestBed.overrideProvider(Api, { useValue: { get: vi.fn(async () => []) } });
    const fixture = TestBed.createComponent(WorkAssignmentsComponent);
    fixture.componentInstance.workId = 'work-1';
    fixture.componentInstance.primaryForemanName = 'Juan Capataz';
    await fixture.componentInstance.load();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Juan Capataz');
    expect(fixture.nativeElement.querySelectorAll('.assignment-role-head')[1].textContent).toContain('Capataz');
    expect(fixture.nativeElement.textContent).not.toContain('Principal');
    expect(fixture.nativeElement.textContent).not.toContain('activo(s)');
    expect(fixture.nativeElement.querySelectorAll('.assignment-empty').length).toBe(1);
  });

  it('cambia el capataz desde un modal y actualiza la obra', async () => {
    const fixture = TestBed.createComponent(WorkAssignmentsComponent);
    const component = fixture.componentInstance;
    component.workId = 'work-1';
    component.primaryForemanId = 'foreman-1';
    component.primaryForemanName = 'Juan Capataz';
    await component.load();
    fixture.detectChanges();
    component.openChange();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#change-foreman-title').textContent).toBe('Cambiar capataz');
    expect(component.changeOptions.map(option => option.value)).toEqual(['foreman-2']);
    expect(patch).not.toHaveBeenCalled();
    component.selectedForemanId = 'foreman-2';
    await component.saveChange();
    expect(patch).toHaveBeenCalledWith('admin/works/work-1/foreman', { foremanId: 'foreman-2' });
    expect(component.changeOpen).toBe(false);
  });

  it('muestra el título de jefe de obra según la cantidad', async () => {
    const fixture = TestBed.createComponent(WorkAssignmentsComponent);
    const component = fixture.componentInstance;
    component.workId = 'work-1';
    await component.load();
    component.assignments = [{ ...assignments[0], roleCode: 'SITE_MANAGER' }];
    expect(component.roleTitle('SITE_MANAGER')).toBe('Jefe de Obra');
    component.assignments = [...component.assignments, { ...assignments[0], id: 'assignment-2', personId: 'person-2', roleCode: 'SITE_MANAGER' }];
    expect(component.roleTitle('SITE_MANAGER')).toBe('Jefes de obra');
  });
});

describe('alta con credenciales', () => {
  it('edita en modal sin reenviar el rol ni el email y permite cancelar', async () => {
    const patch = vi.fn(async () => ({}));
    const person: PersonSummary = {
      id: 'person-edit', fullName: 'Nombre anterior', email: 'jefa@example.com',
      isActive: true, hasCode: false, hasPassword: true, failedAttempts: 0,
      lockedUntil: null, lastAccessAt: null, roles: ['SITE_MANAGER'], activeAssignments: 0,
    };
    TestBed.configureTestingModule({ providers: [{ provide: Api, useValue: {
      get: vi.fn(async (path: string) => path === 'admin/people' ? [person] : []), patch,
    } }] });
    const fixture = TestBed.createComponent(PeoplePage);
    await fixture.componentInstance.load();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.person-actions button') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.editing).toBe('person-edit');
    expect(fixture.nativeElement.querySelector('.app-modal h2').textContent).toBe('Editar persona');
    expect(fixture.nativeElement.querySelector('input[name="fullName"]')).toBeNull();
    fixture.componentInstance.form.roles = ['FOREMAN'];
    (fixture.nativeElement.querySelector('.modal-actions .ghost') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(fixture.componentInstance.editing).toBe('');
    expect(fixture.nativeElement.querySelector('.app-modal')).toBeNull();
    fixture.componentInstance.edit(person);
    (fixture.nativeElement.querySelector('.app-modal-close') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.app-modal')).toBeNull();
    fixture.componentInstance.edit(person);
    fixture.componentInstance.form.roles = ['FOREMAN'];
    await fixture.componentInstance.save();
    expect(patch).toHaveBeenCalledWith('admin/people/person-edit', {
      roles: ['FOREMAN'],
    });
  });

  it('abre nueva persona en modal y permite elegir un solo tipo de usuario', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: Api, useValue: { get: vi.fn(async () => []) } }] });
    const fixture = TestBed.createComponent(PeoplePage);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.people-list-tools .primary') as HTMLButtonElement).click();
    fixture.detectChanges();
    const admin = fixture.nativeElement.querySelector('input[name="administratorRole"]') as HTMLInputElement;
    const manager = fixture.nativeElement.querySelector('input[name="siteManagerRole"]') as HTMLInputElement;
    expect(fixture.nativeElement.querySelector('input[name="foremanRole"]')).not.toBeNull();
    admin.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.roles()).toEqual(['ADMINISTRATOR']);
    manager.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.roles()).toEqual(['SITE_MANAGER']);
    admin.click();
    await fixture.whenStable();
    fixture.detectChanges();
    const password = fixture.nativeElement.querySelector('input[name="password"]') as HTMLInputElement;
    expect(password.type).toBe('password');
    (fixture.nativeElement.querySelector('.password-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(password.type).toBe('text');
    expect(fixture.nativeElement.querySelector('.management-steps')).toBeNull();
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
      roles: [],
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
    expect(fixture.nativeElement.querySelector('.management-steps')).toBeNull();
  });

  it('inhabilita la pertenencia sin ofrecer cambios de clave global', async () => {
    const person: PersonSummary = { id: 'admin-1', fullName: 'Administradora', email: 'admin@example.com',
      isActive: true, hasCode: false, hasPassword: true, failedAttempts: 0, lockedUntil: null,
      lastAccessAt: null, roles: ['ADMINISTRATOR'], activeAssignments: 0 };
    const patch = vi.fn(async () => ({}));
    TestBed.configureTestingModule({ providers: [{ provide: Api, useValue: {
      get: vi.fn(async (path: string) => path === 'admin/people' ? [person] : []), patch,
    } }] });
    const fixture = TestBed.createComponent(PeoplePage);
    await fixture.componentInstance.load(); fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.person-actions button') as NodeListOf<HTMLButtonElement>;
    expect([...buttons].some(button => button.textContent?.includes('clave'))).toBe(false);
    buttons[1].click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.status-confirm-icon')).not.toBeNull();
    (fixture.nativeElement.querySelector('.modal-actions .primary') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(patch).toHaveBeenCalledWith('admin/people/admin-1', { isActive: false });
  });
});
