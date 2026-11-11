import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { Api } from './api';
import { ExpenseTypesSettingsPage, SettingsHubPage } from './expense-type-pages';

describe('configuración de tipos de gasto', () => {
  it('muestra la tarjeta de Tipos de gasto en Configuración', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(SettingsHubPage);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a[href="/configuracion/tipos-de-gasto"]') as HTMLAnchorElement;
    expect(link.textContent).toContain('Tipos de gasto');
    fixture.destroy();
  });

  it('crea, edita y habilita tipos desde su propia pantalla', async () => {
    const types = [{ id: 'type-1', name: 'Comida', isActive: false }];
    const get = vi.fn(async () => types);
    const post = vi.fn(async () => ({}));
    const patch = vi.fn(async () => ({}));
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: Api, useValue: { get, post, patch } }] });
    const fixture = TestBed.createComponent(ExpenseTypesSettingsPage);
    const page = fixture.componentInstance;
    fixture.detectChanges();
    await page.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.expense-types')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.expense-status.disabled')).not.toBeNull();

    page.typeName = 'Transporte';
    await page.saveType();
    expect(post).toHaveBeenCalledWith('admin/expenses/types', { name: 'Transporte' });

    page.editType(types[0]);
    page.editTypeName = 'Almuerzo';
    await page.saveEdit();
    expect(patch).toHaveBeenCalledWith('admin/expenses/types/type-1', { name: 'Almuerzo' });
    expect(page.editingType).toBeNull();

    await page.toggleType(types[0]);
    expect(patch).toHaveBeenCalledWith('admin/expenses/types/type-1/active', { isActive: true });
    fixture.destroy();
  });

  it('pide confirmación antes de deshabilitar un tipo', async () => {
    const type = { id: 'type-1', name: 'Comida', isActive: true };
    const patch = vi.fn(async () => ({}));
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: Api, useValue: { get: vi.fn(async () => [type]), patch } }] });
    const fixture = TestBed.createComponent(ExpenseTypesSettingsPage);
    const page = fixture.componentInstance;
    await page.load();
    page.toggleType(type);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.status-confirm-modal h2').textContent).toBe('Deshabilitar tipo');
    expect(patch).not.toHaveBeenCalled();
    await page.confirmDisable();
    expect(patch).toHaveBeenCalledWith('admin/expenses/types/type-1/active', { isActive: false });
    fixture.destroy();
  });
});
