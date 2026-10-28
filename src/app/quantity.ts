export const quantityRules: Record<string, { step: number; decimals: number }> = {
  UNIDADES: { step: 1, decimals: 0 },
  METROS: { step: 0.01, decimals: 2 },
  METROS_CUADRADOS: { step: 0.01, decimals: 2 },
  METROS_CUBICOS: { step: 0.001, decimals: 3 },
  KILOGRAMOS: { step: 0.01, decimals: 2 },
  HORAS: { step: 0.5, decimals: 1 },
  PORCENTAJE: { step: 1, decimals: 0 },
  OTRA: { step: 0.001, decimals: 3 },
};

export function quantityRule(unit: string) { return quantityRules[unit] ?? quantityRules['OTRA']; }

export function validQuantity(value: unknown, unit: string, positive = false): boolean {
  const n = Number(value);
  const { step, decimals } = quantityRule(unit);
  const factor = 10 ** decimals;
  return value !== '' && value !== null && value !== undefined && Number.isFinite(n) && (positive ? n > 0 : n >= 0)
    && Math.abs(Math.round(n * factor) - n * factor) < 1e-7
    && (unit !== 'HORAS' || Math.abs(Math.round(n / step) - n / step) < 1e-7);
}

export function formatQuantity(value: unknown, unit: string): string {
  const number = Number(value);
  const historicalDecimals = String(number).split('.')[1]?.length ?? 0;
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: Math.max(quantityRule(unit).decimals, historicalDecimals) }).format(number);
}
