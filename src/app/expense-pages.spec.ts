import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { Api, type PersonSummary } from './api';
import { AdminExpensesPage, MemberExpensesPage } from './expense-pages';

const person = (id: string, fullName: string, roles: PersonSummary['roles']): PersonSummary => ({
  id, fullName, roles, isActive: true, hasCode: true, failedAttempts: 0,
  lockedUntil: null, lastAccessAt: null, activeAssignments: 1,
});

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
  it('cierra el comprobante apenas se pulsa la cruz', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: Api, useValue: {
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

  it('muestra solo capataces y permite editar el tipo desde un modal', async () => {
    const types = [{ id: 'type-1', name: 'Comida', isActive: true }];
    const patch = vi.fn(async () => ({}));
    const get = vi.fn(async (path: string) => path === 'admin/people'
        ? [person('foreman', 'Capataz', ['FOREMAN']), person('manager', 'Jefe', ['SITE_MANAGER']), person('admin', 'Administrador', ['ADMINISTRATOR'])]
        : path === 'admin/foremen' ? [{ id: 'legacy-1', firstName: 'Capataz', lastName: 'Anterior', isActive: true }]
        : path === 'admin/expenses/types' ? types : []);
    TestBed.configureTestingModule({ providers: [{ provide: Api, useValue: {
      get, patch,
    } }] });
    const fixture = TestBed.createComponent(AdminExpensesPage);
    await fixture.componentInstance.load();
    fixture.detectChanges();

    const options = [...fixture.nativeElement.querySelectorAll('select[name="foremanSelection"] option')] as HTMLOptionElement[];
    expect(options.map(option => option.textContent?.trim())).toEqual(['Todos', 'Capataz', 'Capataz Anterior']);
    fixture.componentInstance.foremanSelection = 'FOREMAN:legacy-1';
    await fixture.componentInstance.loadExpenses();
    expect(get.mock.calls.some(([path]) => path.includes('foremanId=legacy-1'))).toBe(true);

    (fixture.nativeElement.querySelector('.expense-types .expense-row button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.expense-type-modal h2').textContent).toBe('Editar tipo');
    fixture.componentInstance.editTypeName = 'Comida en obra';
    await fixture.componentInstance.saveEdit();
    expect(patch).toHaveBeenCalledWith('admin/expenses/types/type-1', { name: 'Comida en obra' });
    expect(fixture.componentInstance.editingType).toBeNull();
  });

  it('confirma antes de deshabilitar y muestra los estados', async () => {
    const types = [{ id: 'type-1', name: 'Comida', isActive: true }, { id: 'type-2', name: 'Transporte', isActive: false }];
    const patch = vi.fn(async () => ({}));
    TestBed.configureTestingModule({ providers: [{ provide: Api, useValue: {
      get: vi.fn(async (path: string) => path === 'admin/expenses/types' ? types : []), patch,
    } }] });
    const fixture = TestBed.createComponent(AdminExpensesPage);
    await fixture.componentInstance.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.expense-status.enabled').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.expense-status.disabled').length).toBe(1);
    expect(fixture.nativeElement.textContent).not.toContain('se conserva en el historial');

    (fixture.nativeElement.querySelector('.expense-types .expense-row button:last-child') as HTMLButtonElement).click();
    expect(fixture.nativeElement.querySelector('.status-confirm-modal h2').textContent).toBe('Deshabilitar tipo');
    expect(patch).not.toHaveBeenCalled();
    await fixture.componentInstance.confirmDisable();
    expect(patch).toHaveBeenCalledWith('admin/expenses/types/type-1/active', { isActive: false });
  });
});
