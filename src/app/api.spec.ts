import { describe, expect, it } from 'vitest';
import { reportText } from './api';

describe('texto para compartir el informe', () => {
  it('incluye resultados reales, sobrecumplimiento y observaciones', () => {
    const text=reportText({id:'r',workId:'w',workName:'Iluminación Ciudad',date:'2026-10-27',foremanName:'Carlos Pérez',observations:'Faltaron postes',submittedAt:'',updatedAt:'',compliance:50,photos:[],items:[{id:'i',goalId:'g',activityId:'a',description:'Instalar postes',expected:10,actual:15,unit:'UNIDADES'}]});
    expect(text).toContain('15/10 unidades — 150%');
    expect(text).toContain('Cumplimiento general: 50%');
    expect(text).toContain('Faltaron postes');
  });
});
