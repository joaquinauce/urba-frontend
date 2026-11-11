import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { Api } from './api';
import { DailyGoalsReportPage, ReportsHubPage } from './reports-pages';

describe('Informes de objetivos diarios', () => {
  it('abre la tarjeta de Objetivos diarios desde Informes', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(ReportsHubPage);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a[href="/informes/objetivos-diarios"]') as HTMLAnchorElement;
    expect(link.textContent).toContain('Objetivos diarios');
    const expenses = fixture.nativeElement.querySelector('a[href="/informes/rendiciones"]') as HTMLAnchorElement;
    expect(expenses.textContent).toContain('Rendiciones');
    fixture.destroy();
  });

  it('filtra avances informados y los agrupa por fecha o capataz', async () => {
    const get = vi.fn(async (path: string) => {
      if (path === 'admin/works') return [{ id: 'obra-1', name: 'Obra Norte' }];
      if (path === 'admin/foremen') return [{ id: 'ana', firstName: 'Ana', lastName: 'Pérez' }];
      return [
        { reportId: 'r1', date: '2026-11-09', workId: 'obra-1', workName: 'Obra Norte', foremanId: 'ana', foremanName: 'Ana Pérez', compliance: 75, items: [{ id: 'i1', description: 'Colocar pruebas', expected: 20, actual: 15, unit: 'UNIDADES', percentage: 75 }] },
        { reportId: 'r2', date: '2026-11-08', workId: 'obra-1', workName: 'Obra Norte', foremanId: 'ana', foremanName: 'Ana Pérez', compliance: 50, items: [{ id: 'i2', description: 'Pintar', expected: 10, actual: 5, unit: 'UNIDADES', percentage: 50 }] },
      ];
    });
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: Api, useValue: { get } }] });
    const fixture = TestBed.createComponent(DailyGoalsReportPage);
    const page = fixture.componentInstance;
    page.from = '2026-11-08';
    page.to = '2026-11-09';
    page.workId = 'obra-1';
    page.foremanId = 'ana';
    fixture.detectChanges();
    await fixture.whenStable();
    await page.load();
    fixture.detectChanges();
    expect(get).toHaveBeenCalledWith('admin/reports/daily-goals?from=2026-11-08&to=2026-11-09&workId=obra-1&foremanId=ana');
    expect(page.groups).toHaveLength(2);
    expect(page.totalGoals).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('15 / 20 unidades');
    expect(fixture.nativeElement.textContent).toContain('75%');
    const grouping = fixture.nativeElement.querySelector('select[name="groupBy"]') as HTMLSelectElement;
    grouping.value = 'foreman';
    grouping.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(page.groups).toHaveLength(1);
    expect(page.groups[0].reports).toHaveLength(2);
    fixture.destroy();
  });
});
