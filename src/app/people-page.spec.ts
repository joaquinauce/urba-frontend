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

  it('muestra el capataz responsable de la obra aunque no tenga asignación personal', async () => {
    TestBed.overrideProvider(Api, { useValue: { get: vi.fn(async () => []) } });
    const fixture = TestBed.createComponent(WorkAssignmentsComponent);
    fixture.componentInstance.workId = 'work-1';
    fixture.componentInstance.primaryForemanName = 'Juan Capataz';
    await fixture.componentInstance.load();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Juan Capataz');
    expect(fixture.nativeElement.querySelectorAll('.assignment-role-head')[1].textContent).toContain('1 activo');
    expect(fixture.nativeElement.querySelectorAll('.assignment-empty').length).toBe(1);
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
    expect((fixture.nativeElement.querySelector('input[name="fullName"]') as HTMLInputElement).value).toBe('Nombre anterior');
    fixture.componentInstance.form.fullName = 'Cambio sin guardar';
    (fixture.nativeElement.querySelector('.modal-actions .ghost') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(fixture.componentInstance.editing).toBe('');
    expect(fixture.nativeElement.querySelector('.app-modal')).toBeNull();
    fixture.componentInstance.edit(person);
    (fixture.nativeElement.querySelector('.app-modal-close') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.app-modal')).toBeNull();
    fixture.componentInstance.edit(person);
    fixture.componentInstance.form.fullName = 'Nombre nuevo';
    await fixture.componentInstance.save();
    expect(patch).toHaveBeenCalledWith('admin/people/person-edit', {
      fullName: 'Nombre nuevo',
    });
  });

  it('abre nueva persona en modal y permite elegir un solo tipo de usuario', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: Api, useValue: { get: vi.fn(async () => []) } }] });
    const fixture = TestBed.createComponent(PeoplePage);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.people-list-tools .primary') as HTMLButtonElement).click();
    fixture.detectChanges();
    const admin = fixture.nativeElement.querySelector('input[value="ADMINISTRATOR"]') as HTMLInputElement;
    const manager = fixture.nativeElement.querySelector('input[value="SITE_MANAGER"]') as HTMLInputElement;
    expect(fixture.nativeElement.querySelector('input[value="FOREMAN"]')).toBeNull();
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

  it('inhabilita y cambia la clave desde la tarjeta', async () => {
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
    buttons[1].click(); fixture.detectChanges();
    await fixture.whenStable();
    const newPassword = fixture.nativeElement.querySelector('input[name="newPassword"]') as HTMLInputElement;
    const confirmation = fixture.nativeElement.querySelector('input[name="confirmNewPassword"]') as HTMLInputElement;
    const eyeButtons = fixture.nativeElement.querySelectorAll('.password-toggle') as NodeListOf<HTMLButtonElement>;
    eyeButtons[0].click(); fixture.detectChanges();
    expect(newPassword.type).toBe('text');
    expect(confirmation.type).toBe('password');
    eyeButtons[1].click(); fixture.detectChanges();
    expect(confirmation.type).toBe('text');
    (fixture.nativeElement.querySelector('.modal-actions .primary') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.app-modal .alert.error').textContent).toContain('10 caracteres');
    newPassword.value = 'clave-nueva-123'; newPassword.dispatchEvent(new Event('input', { bubbles: true }));
    confirmation.value = 'clave-nueva-123'; confirmation.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    expect(fixture.componentInstance.newPassword).toBe('clave-nueva-123');
    expect(fixture.componentInstance.confirmNewPassword).toBe('clave-nueva-123');
    (fixture.nativeElement.querySelector('.modal-actions .primary') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(patch).toHaveBeenCalledWith('admin/people/admin-1', { password: 'clave-nueva-123' });
    (fixture.nativeElement.querySelectorAll('.person-actions button')[2] as HTMLButtonElement).click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.status-confirm-icon')).not.toBeNull();
    (fixture.nativeElement.querySelector('.modal-actions .primary') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(patch).toHaveBeenCalledWith('admin/people/admin-1', { isActive: false });
  });
});
