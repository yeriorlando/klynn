/**
 * Comprime una imagen usando Canvas API antes de convertirla a base64.
 * Reduce el tamaño manteniendo una calidad visual aceptable.
 *
 * @param file - El archivo de imagen seleccionado por el usuario.
 * @param maxWidth - Ancho máximo en píxeles (default: 512).
 * @param maxHeight - Alto máximo en píxeles (default: 512).
 * @param quality - Calidad de compresión JPEG/WebP de 0 a 1 (default: 0.7).
 * @returns Una promesa que resuelve al dataURL comprimido.
 */
export function compressImage(
  file: File,
  maxWidth = 512,
  maxHeight = 512,
  quality = 0.7,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Error al leer el archivo"));

    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Error al cargar la imagen"));

      img.onload = () => {
        // Calcular dimensiones manteniendo el aspect ratio
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Dibujar en un canvas reducido
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo crear el canvas"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Exportar como WebP (más ligero) o JPEG como fallback
        const outputType = "image/webp";
        const dataUrl = canvas.toDataURL(outputType, quality);

        // Si el navegador no soporta webp, usar jpeg
        if (dataUrl.startsWith("data:image/webp")) {
          resolve(dataUrl);
        } else {
          resolve(canvas.toDataURL("image/jpeg", quality));
        }
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
