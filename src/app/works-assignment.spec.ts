import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { Api, localDate } from './api';
import { WorksPage } from './works-page';

const daysFromNow = (days: number) => new Date(Date.parse(`${localDate()}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const foreman = { id: 'foreman-1', firstName: 'Juan', lastName: 'Capataz', phone: '123', isActive: true };
const manager = { id: 'manager-1', fullName: 'Ana Jefa', roles: ['SITE_MANAGER'], isActive: true };
const baseWork = { id: 'work-1', name: 'Obra Norte', description: '', location: 'Córdoba', startDate: daysFromNow(-2), estimatedEndDate: daysFromNow(5), foremanId: foreman.id, foremanName: 'Juan Capataz', status: 'ACTIVA', timeZone: 'America/Argentina/Cordoba', closeTime: '19:00', accessAlias: null };

function setup(works = [baseWork]) {
  const get = vi.fn(async (path: string) => path === 'admin/works' ? works : path === 'admin/foremen' ? [foreman] : path === 'admin/people' ? [manager] : path.endsWith('/assignments') ? [{ id: 'assignment-1', personId: manager.id, roleCode: 'SITE_MANAGER', active: true }] : []);
  const post = vi.fn(async () => ({}));
  const patch = vi.fn(async () => ({}));
  TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: Api, useValue: { get, post, patch } }] });
  const fixture = TestBed.createComponent(WorksPage);
  return { fixture, page: fixture.componentInstance, get, post, patch };
}

describe('vista de obras', () => {
  it('muestra la grilla y abre un formulario ancho con selectores de búsqueda única', async () => {
    const { fixture, page, post } = setup();
    await page.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.works-grid .works-card').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.works-form-modal')).toBeNull();
    (fixture.nativeElement.querySelector('.works-heading button') as HTMLButtonElement).click();
    fixture.detectChanges();
    const modal = fixture.nativeElement.querySelector('.works-form-modal') as HTMLElement;
    expect(modal).not.toBeNull();
    expect(modal.querySelectorAll('app-search-select').length).toBe(2);
    (fixture.nativeElement.querySelector('.works-modal-backdrop') as HTMLElement).click();
    expect(page.formOpen).toBe(true);
    expect(modal.querySelector('select[name="status"]')).toBeNull();
    expect(modal.textContent).not.toContain('Zona horaria');
    expect(modal.textContent).not.toContain('El capataz responsable queda vinculado');
    expect(modal.textContent).not.toContain('El alias necesita un PIN');
    page.form.aliasPin = 'a12b34567';
    page.sanitizePin();
    expect(page.form.aliasPin).toBe('123456');
    page.form.name = 'Obra nueva';
    page.form.foremanId = foreman.id;
    page.form.siteManagerId = manager.id;
    await page.save();
    expect(post).toHaveBeenCalledWith('admin/works', expect.objectContaining({ assignments: [{ personId: manager.id, roleCode: 'SITE_MANAGER' }] }));
    fixture.destroy();
  });

  it('deriva el estado y los días desde las fechas', async () => {
    const { fixture, page } = setup();
    await page.load();
    expect(page.displayState(baseWork)).toBe('ACTIVA');
    expect(page.stateDescription(baseWork)).toContain('Quedan 5 días');
    const future = { ...baseWork, startDate: daysFromNow(3) };
    expect(page.displayState(future)).toBe('PENDIENTE');
    expect(page.stateDescription(future)).toContain('Faltan 3 días');
    const finished = { ...baseWork, estimatedEndDate: daysFromNow(-1) };
    expect(page.displayState(finished)).toBe('FINALIZADA');
    fixture.destroy();
  });

  it('edita con el jefe existente y pausa o reactiva desde modales', async () => {
    const { fixture, page, post, patch } = setup();
    await page.load();
    fixture.detectChanges();
    await page.openEdit(baseWork);
    fixture.detectChanges();
    expect(page.form.siteManagerId).toBe(manager.id);
    page.form.name = 'Obra editada';
    await page.save();
    expect(patch).toHaveBeenCalledWith('admin/works/work-1', expect.objectContaining({ siteManagerId: manager.id, timeZone: baseWork.timeZone }));
    page.openPause(baseWork);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Pausar obra"]')).not.toBeNull();
    page.pauseReason = 'Faltan materiales';
    await page.confirmPause();
    expect(post).toHaveBeenCalledWith('admin/works/work-1/pause', { reason: 'Faltan materiales' });
    const paused = { ...baseWork, status: 'PAUSADA', pauseReason: 'Faltan materiales' };
    page.openResume(paused);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Reactivar obra"] app-date-field')).not.toBeNull();
    page.resumeEndDate = daysFromNow(10);
    await page.confirmResume();
    expect(post).toHaveBeenCalledWith('admin/works/work-1/resume', { estimatedEndDate: daysFromNow(10) });
    fixture.destroy();
  });
});
