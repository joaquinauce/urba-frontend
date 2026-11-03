import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Api } from './api';
import { MemberWorkPage } from './member-pages';
import { PersonalSessionStore, type PersonalRole } from './session';

const detail = {
  today: '2026-11-03',
  todayTime: '12:00',
  work: {
    id: 'work-1',
    name: 'Obra Uno',
    location: 'Córdoba',
    status: 'ACTIVA',
    estimatedEndDate: '2026-12-01',
    closeTime: '19:00:00',
  },
  reports: [],
  progress: [],
  goals: [],
  items: [],
};

describe('experiencia personal por permisos', () => {
  let get: ReturnType<typeof vi.fn>;
  let post: ReturnType<typeof vi.fn>;
  let upload: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    get = vi.fn(async () => detail);
    post = vi.fn(async () => ({
      id: 'report-1',
      workId: 'work-1',
      workName: 'Obra Uno',
      date: '2026-11-03',
      foremanName: 'Capataz Uno',
      observations: '',
      submittedAt: '',
      updatedAt: '',
      items: [],
      photos: [],
      compliance: 100,
    }));
    upload = vi.fn(async () => ({}));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: Api, useValue: { get, post, upload } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => 'work-1' } } },
        },
      ],
    });
  });

  async function render(roles: PersonalRole[]) {
    TestBed.inject(PersonalSessionStore).set({
      accessToken: 'token',
      person: {
        id: 'person-1',
        administratorId: 'admin-1',
        fullName: 'Persona Uno',
        roles,
      },
    });
    const fixture = TestBed.createComponent(MemberWorkPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('mantiene al jefe de obra en una interfaz de solo lectura', async () => {
    const fixture = await render(['SITE_MANAGER']);
    expect(fixture.componentInstance.canWrite).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('SOLO LECTURA');
    expect(fixture.nativeElement.querySelector('.member-submit-panel')).toBeNull();
    expect(fixture.nativeElement.querySelector('.supervision-hero')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.report-flow')).toBeNull();
    expect(get).toHaveBeenCalledWith('member/works/work-1', 'person');
  });

  it('habilita la carga únicamente al capataz', async () => {
    const fixture = await render(['FOREMAN']);
    expect(fixture.componentInstance.canWrite).toBe(true);
    expect(fixture.nativeElement.querySelector('.member-submit-panel')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.report-flow')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.supervision-hero')).toBeNull();
  });

  it('permite quitar una fotografía antes de enviar', async () => {
    const fixture = await render(['FOREMAN']);
    fixture.componentInstance.files = [
      new File(['a'], 'frente.jpg', { type: 'image/jpeg' }),
      new File(['b'], 'avance.jpg', { type: 'image/jpeg' }),
    ];
    fixture.componentInstance.removeFile(0);
    expect(fixture.componentInstance.files.map((file) => file.name)).toEqual([
      'avance.jpg',
    ]);
  });

  it('envía el informe del capataz al endpoint personal de la obra seleccionada', async () => {
    const fixture = await render(['FOREMAN']);
    fixture.componentInstance.detail = {
      ...detail,
      goals: [
        {
          id: 'goal-1',
          activityId: 'activity-1',
          date: detail.today,
          description: 'Objetivo diario',
          expectedQuantity: 10,
          unit: 'UNIDADES',
          isActive: true,
        },
      ],
    };
    fixture.componentInstance.values = { 'goal-1': 8 };
    fixture.componentInstance.observations = 'Avance verificado';
    await fixture.componentInstance.submit();
    expect(post).toHaveBeenCalledWith(
      'member/works/work-1/reports',
      {
        observations: 'Avance verificado',
        items: [{ goalId: 'goal-1', actualQuantity: 8 }],
      },
      'person',
    );
  });
});

