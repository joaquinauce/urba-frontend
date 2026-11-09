import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepareReceiptImage } from './receipt-image';

describe('fotografía del comprobante', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('reduce una foto grande a una resolución legible antes de subirla', async () => {
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 4000, height: 3000, close })));
    const fillRect = vi.fn();
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ fillRect, drawImage } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => callback(new Blob([new Uint8Array(600_000)], { type: 'image/webp' })));
    const original = new File([new Uint8Array(5 * 1024 * 1024)], 'foto.jpg', { type: 'image/jpeg' });

    const prepared = await prepareReceiptImage(original);

    expect(prepared.size).toBe(600_000);
    expect(prepared.type).toBe('image/webp');
    expect(drawImage).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
  });

  it('conserva la foto original si ya es pequeña', async () => {
    const original = new File(['imagen'], 'foto.jpg', { type: 'image/jpeg' });
    expect(await prepareReceiptImage(original)).toBe(original);
  });
});
