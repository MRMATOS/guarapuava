// src/app/cidade-viva/_lib/image-compression.ts

const BUCKET_SIZE_LIMIT = 1.9 * 1024 * 1024; // 1,9 MB (abaixo do limite de 2MB do Supabase)

/**
 * Comprime e converte uma imagem usando HTML5 Canvas para caber no limite
 * do bucket Supabase (2 MB). Usa duas estratégias em sequência:
 *   1. Reduz qualidade JPEG/WebP de 0,8 até 0,2 em passos de 0,15
 *   2. Se ainda grande, re-renderiza em resolução menor (escala de 70%) e repete
 */
export async function compressImageToWebP(
  file: File,
  maxDimension = 1280
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const attemptCompression = (dimension: number) => {
        let width = img.width;
        let height = img.height;

        if (width > dimension || height > dimension) {
          if (width > height) {
            height = Math.round((height * dimension) / width);
            width = dimension;
          } else {
            width = Math.round((width * dimension) / height);
            height = dimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Falha ao obter contexto 2D do Canvas."));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const tryQuality = (mimeType: string, q: number) => {
          canvas.toBlob(
            (blob) => {
              const requestedWebP = mimeType === "image/webp";
              const gotUnsupportedFormat = !blob || (requestedWebP && blob.type !== "image/webp");

              if (gotUnsupportedFormat) {
                if (requestedWebP) {
                  tryQuality("image/jpeg", q);
                } else {
                  reject(new Error("Falha ao comprimir imagem."));
                }
                return;
              }

              if (blob.size <= BUCKET_SIZE_LIMIT) {
                resolve(blob);
                return;
              }

              if (q > 0.2) {
                tryQuality(mimeType, parseFloat((q - 0.15).toFixed(2)));
                return;
              }

              const nextDimension = Math.round(dimension * 0.7);
              if (nextDimension >= 480) {
                attemptCompression(nextDimension);
              } else {
                resolve(blob);
              }
            },
            mimeType,
            q
          );
        };

        tryQuality("image/webp", 0.8);
      };

      attemptCompression(maxDimension);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível carregar a imagem selecionada."));
    };

    img.src = objectUrl;
  });
}
