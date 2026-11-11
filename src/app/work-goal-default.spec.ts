import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { Api } from './api';
import { WorkPage } from './pages';

describe('nuevo objetivo diario', () => {
  it('propone repetición de lunes a viernes desde hoy hasta el fin de la obra', async () => {
    const detail = {
      today: '2026-11-10', todayTime: '12:00', goals: [], reports: [], progress: [], corrections: [], activities: [],
      work: {
        id: 'work-1', name: 'Obra Norte', foremanId: 'foreman-1', foremanName: 'Juan',
        startDate: '2026-11-01', estimatedEndDate: '2026-12-20', status: 'ACTIVA',
        location: '', closeTime: '19:00', timeZone: 'America/Argentina/Cordoba',
      },
    };
    const get = vi.fn(async (path: string) => path === 'admin/works/' || path === 'admin/works/work-1' ? detail : []);
    const post = vi.fn(async () => ({}));
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: Api, useValue: { get, post } }] });
    const fixture = TestBed.createComponent(WorkPage);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    page.id = 'work-1';
    await page.load();
    fixture.detectChanges();
    page.openNewGoal();
    expect(page.goalForm).toMatchObject({ recurring: true, startsOn: detail.today, endsOn: detail.work.estimatedEndDate });
    expect(page.weekDays.filter(day => day.checked).map(day => day.label)).toEqual(['L', 'M', 'X', 'J', 'V']);
    page.goalForm.description = 'Instalar postes';
    page.goalForm.expectedQuantity = 10;
    await page.saveGoal();
    expect(post).toHaveBeenCalledWith('admin/works/work-1/goals', expect.objectContaining({
      recurrence: { startsOn: '2026-11-10', endsOn: '2026-12-20', daysMask: 31 },
    }));
    fixture.destroy();
  });
});
