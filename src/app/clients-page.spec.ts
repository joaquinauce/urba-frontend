import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { Api } from './api';
import { ClientsPage } from './clients-page';

const client = { id: 'client-a', name: 'Cliente A', isActive: true,
  primaryAdministratorEmail: 'admin@a.com', contactPhone: null, address: null };

describe('administración de clientes', () => {
  it('muestra la grilla y abre el alta en un modal con clave visible opcionalmente', async () => {
    const post = vi.fn(async () => ({}));
    TestBed.configureTestingModule({ providers: [{ provide: Api, useValue: {
      get: vi.fn(async () => [client]), post, patch: vi.fn() } }] });
    const fixture = TestBed.createComponent(ClientsPage);
    const page = fixture.componentInstance;
    await page.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.clients-grid-row').textContent).toContain('Cliente A');
    (fixture.nativeElement.querySelector('.page-heading button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.app-modal h2').textContent).toBe('Nuevo cliente');
    expect((fixture.nativeElement.querySelector('input[name=password]') as HTMLInputElement).type).toBe('password');
    (fixture.nativeElement.querySelector('.password-toggle') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('input[name=password]') as HTMLInputElement).type).toBe('text');
    page.form = { name: 'B', administratorName: 'Admin B', administratorEmail: 'admin@b.com',
      password: 'clave-segura-123', contactPhone: '123', address: 'Calle 1' };
    await page.save();
    expect(post).toHaveBeenCalledWith('platform/clients', expect.objectContaining({
      name: 'B', contactPhone: '123', address: 'Calle 1' }));
    expect(page.modal).toBeNull();
    fixture.destroy();
  });

  it('edita nombre, correo y contacto en modal y confirma la desactivación', async () => {
    const patch = vi.fn(async () => ({}));
    TestBed.configureTestingModule({ providers: [{ provide: Api, useValue: {
      get: vi.fn(async () => [client]), post: vi.fn(), patch } }] });
    const fixture = TestBed.createComponent(ClientsPage);
    const page = fixture.componentInstance;
    await page.load();
    (fixture.nativeElement.querySelector('.client-actions button') as HTMLButtonElement).click();
    expect(fixture.nativeElement.querySelector('.app-modal h2').textContent).toBe('Editar cliente');
    page.form.name = 'Cliente nuevo';
    page.form.administratorEmail = 'nuevo@a.com';
    page.form.contactPhone = '555';
    await page.save();
    expect(patch).toHaveBeenCalledWith('platform/clients/client-a', expect.objectContaining({
      name: 'Cliente nuevo', administratorEmail: 'nuevo@a.com', contactPhone: '555' }));
    page.openStatus(client);
    fixture.detectChanges();
    expect(patch).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('.status-confirm-modal h2').textContent).toBe('Desactivar cliente');
    await page.saveStatus();
    expect(patch).toHaveBeenCalledWith('platform/clients/client-a', { isActive: false });
    fixture.destroy();
  });
});
