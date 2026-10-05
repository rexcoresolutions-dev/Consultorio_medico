const colorDistance = (a: number[], b: number[]) =>
  Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

const canvasBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('No se pudo procesar el logo')), 'image/png');
  });

/**
 * Quita únicamente el fondo claro conectado con los bordes. De esta forma los
 * detalles blancos encerrados dentro del logotipo se conservan.
 */
export async function removeConnectedLightBackground(file: File): Promise<File> {
  if (file.type === 'image/svg+xml') return file;

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('El navegador no pudo procesar la imagen');
  context.drawImage(bitmap, 0, 0);
  bitmap.close();

  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = image;
  const width = canvas.width;
  const height = canvas.height;
  const cornerIndexes = [0, width - 1, (height - 1) * width, height * width - 1];
  const opaqueCorners = cornerIndexes
    .map((index) => [data[index * 4], data[index * 4 + 1], data[index * 4 + 2], data[index * 4 + 3]])
    .filter((color) => color[3] > 20);
  const background = [0, 1, 2].map((channel) =>
    opaqueCorners.length
      ? opaqueCorners.reduce((sum, color) => sum + color[channel], 0) / opaqueCorners.length
      : 0,
  );
  const brightness = (background[0] + background[1] + background[2]) / 3;

  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const enqueue = (index: number) => {
    if (index < 0 || index >= visited.length || visited[index]) return;
    const offset = index * 4;
    const pixel = [data[offset], data[offset + 1], data[offset + 2]];
    if (data[offset + 3] === 0 || colorDistance(pixel, background) <= 72) {
      visited[index] = 1;
      queue[tail++] = index;
    }
  };

  if (opaqueCorners.length && brightness >= 185) {
    for (let x = 0; x < width; x += 1) { enqueue(x); enqueue((height - 1) * width + x); }
    for (let y = 0; y < height; y += 1) { enqueue(y * width); enqueue(y * width + width - 1); }
  }

  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y + 1 < height) enqueue(index + width);
  }

  for (let index = 0; index < visited.length; index += 1) {
    if (!visited[index]) continue;
    const offset = index * 4;
    const distance = colorDistance([data[offset], data[offset + 1], data[offset + 2]], background);
    data[offset + 3] = distance <= 24 ? 0 : Math.min(data[offset + 3], Math.round(((distance - 24) / 48) * 255));
  }

  context.putImageData(image, 0, 0);
  let minX = width; let minY = height; let maxX = -1; let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= 12) continue;
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
  const output = document.createElement('canvas');
  if (maxX >= minX && maxY >= minY) {
    const padding = Math.max(4, Math.round(Math.max(maxX - minX, maxY - minY) * 0.04));
    const sourceX = Math.max(0, minX - padding); const sourceY = Math.max(0, minY - padding);
    const sourceWidth = Math.min(width - sourceX, maxX - minX + 1 + padding * 2);
    const sourceHeight = Math.min(height - sourceY, maxY - minY + 1 + padding * 2);
    output.width = sourceWidth; output.height = sourceHeight;
    output.getContext('2d')?.drawImage(canvas, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
  } else {
    output.width = width; output.height = height; output.getContext('2d')?.drawImage(canvas, 0, 0);
  }
  const blob = await canvasBlob(output);
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'logo';
  return new File([blob], `${baseName}-sin-fondo.png`, { type: 'image/png', lastModified: Date.now() });
}
