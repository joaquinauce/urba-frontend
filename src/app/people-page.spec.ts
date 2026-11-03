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

describe('alta y código personal', () => {
  it('crea la persona y muestra únicamente el código devuelto por la rotación', async () => {
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
      siteManager: true,
      foreman: false,
      isActive: true,
    };
    await fixture.componentInstance.save();
    expect(post).toHaveBeenNthCalledWith(1, 'admin/people', {
      fullName: 'Jefa Nueva',
      roles: ['SITE_MANAGER'],
    });
    expect(post).toHaveBeenNthCalledWith(
      2,
      'admin/people/person-new/code/rotate',
      {},
    );
    expect(fixture.componentInstance.revealedCode).toBe('123456');
    expect(`${JSON.stringify(localStorage)}${JSON.stringify(sessionStorage)}`).not.toContain(
      '123456',
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.management-steps')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Se muestra una sola vez');
  });
});
