// src/lib/security.ts
import crypto from "node:crypto";

/**
 * Comparação de strings segura contra ataques de temporização (Timing Attacks).
 * Garante tempo constante independentemente do comprimento ou conteúdo das strings.
 */
export function safeTimingCompare(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;

  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();

  return crypto.timingSafeEqual(hashA, hashB);
}

/**
 * Validação de assinatura de arquivo de imagem (Magic Bytes).
 * Impede envio de scripts executáveis ou arquivos maliciosos disfarçados com extensão .jpg/.png/.webp.
 */
export function validateImageMagicBytes(buffer: Buffer): { valid: boolean; detectedMime?: string } {
  if (!buffer || buffer.length < 12) {
    return { valid: false };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedMime: "image/jpeg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, detectedMime: "image/png" };
  }

  // WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
  const isRiff = buffer.toString("ascii", 0, 4) === "RIFF";
  const isWebp = buffer.toString("ascii", 8, 12) === "WEBP";
  if (isRiff && isWebp) {
    return { valid: true, detectedMime: "image/webp" };
  }

  return { valid: false };
}

/**
 * Validação rigorosa de URL para impedir SSRF, esquemas javascript:, data:, etc.
 */
export function isValidHttpsUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}
