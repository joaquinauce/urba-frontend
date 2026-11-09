const MB = 1024 * 1024;
export const RECEIPT_UPLOAD_LIMIT = 25 * MB;
const OPTIMIZE_ABOVE = 4 * MB;

export async function prepareReceiptImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('Seleccioná una imagen del comprobante.');
  if (file.size <= OPTIMIZE_ABOVE) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    if (file.size <= RECEIPT_UPLOAD_LIMIT) return file;
    throw new Error('No pudimos comprimir esta imagen. Elegí una foto JPG, PNG o WebP de hasta 25 MB.');
  }
  try {
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No pudimos preparar la fotografía en este dispositivo.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const encode = (quality: number) => new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality));
    let blob = await encode(0.88);
    if (blob && blob.size > RECEIPT_UPLOAD_LIMIT) blob = await encode(0.78);
    if (!blob || blob.size > RECEIPT_UPLOAD_LIMIT) {
      if (file.size <= RECEIPT_UPLOAD_LIMIT) return file;
      throw new Error('La imagen sigue siendo demasiado grande. Probá con otra foto del comprobante.');
    }
    if (blob.size >= file.size) return file;
    const extension = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
    return new File([blob], `comprobante.${extension}`, { type: blob.type, lastModified: file.lastModified });
  } catch (error) {
    if (file.size <= RECEIPT_UPLOAD_LIMIT) return file;
    throw error;
  } finally {
    bitmap.close();
  }
}
