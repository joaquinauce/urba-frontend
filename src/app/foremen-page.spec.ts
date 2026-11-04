import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { Api, type Foreman } from './api';
import { ForemenPage } from './pages';

describe('edición de capataces', () => {
  it('abre el formulario del capataz elegido y guarda los cambios', async () => {
    const foreman: Foreman = {
      id: 'foreman-1', firstName: 'Ana', lastName: 'Pérez', phone: '123456', isActive: true,
    };
    const patch = vi.fn(async () => ({}));
    TestBed.configureTestingModule({ providers: [{ provide: Api, useValue: {
      get: vi.fn(async () => [foreman]), patch,
    } }] });
    const fixture = TestBed.createComponent(ForemenPage);
    await fixture.componentInstance.load();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.list-row button') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.editing).toBe('foreman-1');
    expect(fixture.nativeElement.querySelector('.edit-panel h2').textContent).toBe('Editar capataz');
    expect((fixture.nativeElement.querySelector('input[name="firstName"]') as HTMLInputElement).value).toBe('Ana');

    (fixture.nativeElement.querySelector('.edit-panel .actions .ghost') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.editing).toBe('');
    expect(fixture.nativeElement.querySelector('.edit-panel h2').textContent).toBe('Nuevo capataz');
    fixture.componentInstance.edit(foreman);

    fixture.componentInstance.form.phone = '654321';
    await fixture.componentInstance.save();
    expect(patch).toHaveBeenCalledWith('admin/foremen/foreman-1', {
      firstName: 'Ana', lastName: 'Pérez', phone: '654321', isActive: true,
    });

    (fixture.nativeElement.querySelector('.list-row button:last-child') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.status-confirm-modal h2').textContent).toBe('Inhabilitar capataz');
    (fixture.nativeElement.querySelector('.status-confirm-modal .primary') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(patch).toHaveBeenCalledWith('admin/foremen/foreman-1', {
      firstName: 'Ana', lastName: 'Pérez', phone: '123456', isActive: false,
    });
  });
});
