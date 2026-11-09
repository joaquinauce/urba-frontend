import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { Api } from './api';
import { WorksPage } from './pages';

describe('alta de obra', () => {
  it('usa un único selector de capataz responsable', async () => {
    const foreman = { id: 'foreman-1', firstName: 'Juan', lastName: 'Capataz', phone: '123', isActive: true };
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: Api, useValue: {
      get: vi.fn(async (path: string) => path === 'admin/foremen' ? [foreman] : []),
    } }] });
    const fixture = TestBed.createComponent(WorksPage);
    await fixture.componentInstance.load();
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Capataz responsable');
    expect(text).not.toContain('Capataces asignados');
    expect(text).not.toContain('No hay capataces con acceso personal');
    const options = fixture.nativeElement.querySelectorAll('select[name="foremanId"] option');
    expect(options.length).toBe(2);
  });
});
