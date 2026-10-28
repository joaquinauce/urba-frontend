import { describe, expect, it } from 'vitest';
import { formatQuantity, quantityRule, validQuantity } from './quantity';

describe('cantidades por unidad', () => {
  it('usa pasos apropiados para el control numérico', () => {
    expect(quantityRule('UNIDADES').step).toBe(1);
    expect(quantityRule('METROS').step).toBe(0.01);
    expect(quantityRule('METROS_CUBICOS').step).toBe(0.001);
    expect(quantityRule('HORAS').step).toBe(0.5);
  });
  it('acepta decimales permitidos y rechaza precisión excesiva', () => {
    expect(validQuantity(125.5,'METROS')).toBe(true);
    expect(validQuantity(125.501,'METROS')).toBe(false);
    expect(validQuantity(2.375,'METROS_CUBICOS')).toBe(true);
    expect(validQuantity(2.375,'UNIDADES')).toBe(false);
    expect(validQuantity(-1,'UNIDADES')).toBe(false);
    expect(formatQuantity('10.000','UNIDADES')).toBe('10');
    expect(formatQuantity('2.375','METROS')).toBe('2,375');
    expect(validQuantity(2.5,'OTRA',false,{quantityStep:0.25,quantityDecimals:2})).toBe(true);
    expect(validQuantity(2.3,'OTRA',false,{quantityStep:0.25,quantityDecimals:2})).toBe(false);
  });
});
