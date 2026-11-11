import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { Api } from './api';
import { AdminExpensesPage, MemberExpensesPage } from './expense-pages';

describe('rendiciones del capataz', () => {
  it('abre la carga desde la sesión con alias y PIN', async () => {
    const get = vi.fn(async (path: string) => path.endsWith('/today')
      ? { work: { id: 'work-1', name: 'Obra QR', foremanName: 'Juan Capataz' }, goals: [], date: '2026-11-09', report: null, editable: true, closeTime: '19:00' }
      : []);
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
      { provide: Api, useValue: { get } },
    ] });
    const fixture = TestBed.createComponent(MemberExpensesPage);
    fixture.detectChanges();
    await fixture.componentInstance.load();
    expect(fixture.componentInstance.workName).toBe('Obra QR');
    expect(get).toHaveBeenCalledWith('public/session/expenses/types', 'foreman');
    expect(fixture.componentInstance.backPath()).toBe('/mi-obra');
  });
});

describe('rendiciones administrativas', () => {
  it('usa el selector de fechas común y conserva el rango en la consulta', async () => {
    const get = vi.fn(async () => []);
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: Api, useValue: { get } }] });
    const fixture = TestBed.createComponent(AdminExpensesPage);
    fixture.detectChanges();
    await fixture.componentInstance.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.expense-filters app-date-field').length).toBe(2);
    expect(fixture.nativeElement.querySelector('.expense-filters input[type="date"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.expense-types')).toBeNull();
    fixture.componentInstance.from = '2026-11-01';
    fixture.componentInstance.to = '2026-11-10';
    await fixture.componentInstance.loadExpenses();
    expect(get).toHaveBeenCalledWith('admin/expenses?from=2026-11-01&to=2026-11-10');
    fixture.destroy();
  });

  it('cierra el comprobante apenas se pulsa la cruz', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: Api, useValue: {
      get: vi.fn(async () => []), expensePhoto: vi.fn(async () => new Blob(['foto'], { type: 'image/webp' })),
    } }] });
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:comprobante');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    try {
      const fixture = TestBed.createComponent(AdminExpensesPage);
      await fixture.componentInstance.load();
      await fixture.componentInstance.openReceipt('receipt-1');
      expect(fixture.nativeElement.querySelector('.expense-lightbox')).not.toBeNull();
      (fixture.nativeElement.querySelector('.expense-lightbox-close') as HTMLButtonElement).click();
      expect(fixture.nativeElement.querySelector('.expense-lightbox')).toBeNull();
      expect(revoke).toHaveBeenCalledWith('blob:comprobante');
    } finally { create.mockRestore(); revoke.mockRestore(); }
  });

});
