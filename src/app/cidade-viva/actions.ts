// src/app/cidade-viva/actions.ts
"use server";

import crypto from "node:crypto";
import { headers, cookies } from "next/headers";
import { unstable_cache } from "next/cache";
import { supabase, supabaseAdmin } from "@/lib/supabase/client";
import { reverseGeocode } from "./_lib/geocoding";
import type { Category, Report, CreateReportResult } from "./_lib/types";

/**
 * Busca todas as categorias ativas ordenadas por sort_order.
 * Cacheado via unstable_cache com revalidação de 1 hora.
 */
export const getCategories = unstable_cache(
  async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from("cidade_viva_categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Erro ao carregar categorias do Cidade Viva:", error);
      return [];
    }

    return (data as Category[]) ?? [];
  },
  ["cidade-viva-categories"],
  { revalidate: 3600, tags: ["cidade-viva-categories"] }
);

/**
 * Busca todos os relatos ativos (não resolvidos).
 * Se bounding box for especificado ([minLng, minLat, maxLng, maxLat]), filtra geograficamente.
 */
export async function getReports(
  bounds?: [number, number, number, number]
): Promise<Report[]> {
  let query = supabase
    .from("cidade_viva_reports_public")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (bounds) {
    const [minLng, minLat, maxLng, maxLat] = bounds;
    query = query
      .gte("longitude", minLng)
      .lte("longitude", maxLng)
      .gte("latitude", minLat)
      .lte("latitude", maxLat);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Erro ao carregar relatos do Cidade Viva:", error);
    return [];
  }

  return (data as Report[]) ?? [];
}

/**
 * Server Action para submissão anônima de novos relatos com geolocalização e foto.
 */
export async function createReport(formData: FormData): Promise<CreateReportResult> {
  try {
    // 1. Obtenção do IP para rate limit e anonimização
    const headerStore = await headers();
    const forwarded = headerStore.get("x-forwarded-for");
    const realIp = headerStore.get("x-real-ip");
    const clientIp = (forwarded ? forwarded.split(",")[0].trim() : realIp) || "127.0.0.1";

    // 2. Verificação de admin (bypassa o rate limit se autenticado)
    let isAdmin = false;
    const cookieStore = await cookies();
    const hasAuthCookie = cookieStore.getAll().some((c) => c.name.includes("-auth-token"));

    if (hasAuthCookie) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email === process.env.ADMIN_EMAIL) {
          isAdmin = true;
        }
      } catch {
        // Ignora erro de verificação de auth
      }
    }

    // 3. Rate limiting (1 envio a cada 5 minutos por IP) para não-admins
    if (!isAdmin) {
      try {
        const { data: exceeded, error: rateError } = await supabaseAdmin.rpc(
          "check_rate_limit",
          {
            p_key: `cidade_viva:${clientIp}`,
            p_max: 1,
            p_window_seconds: 300,
          }
        );

        if (rateError) {
          console.warn("Aviso ao checar rate limit:", rateError);
        } else if (exceeded) {
          return {
            success: false,
            error: "Você já enviou um relato recentemente. Para evitar spam, aguarde 5 minutos antes de enviar outro.",
          };
        }
      } catch (err) {
        console.warn("RPC check_rate_limit ignorada:", err);
      }
    }

    // 4. Validação dos campos
    const categoryId = formData.get("categoryId") as string;
    const latStr = formData.get("latitude") as string;
    const lngStr = formData.get("longitude") as string;
    const description = (formData.get("description") as string)?.trim() || null;
    const photoEntry = formData.get("photo");

    if (!categoryId || !latStr || !lngStr || !(photoEntry instanceof File) || photoEntry.size === 0) {
      return { success: false, error: "Preencha todos os campos obrigatórios e anexe a foto." };
    }
    const photo = photoEntry;

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return { success: false, error: "Coordenadas de GPS inválidas." };
    }

    // Validação da categoria
    const { data: categoryData } = await supabaseAdmin
      .from("cidade_viva_categories")
      .select("id")
      .eq("id", categoryId)
      .eq("is_active", true)
      .single();

    if (!categoryData) {
      return { success: false, error: "Categoria de problema não encontrada ou inativa." };
    }

    // 5. Validação da imagem (limite de 2MB)
    if (photo.size > 2 * 1024 * 1024) {
      return { success: false, error: "A imagem excede o tamanho máximo permitido de 2 MB." };
    }

    const allowedTypes = ["image/webp", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(photo.type)) {
      return { success: false, error: "Formato de imagem não suportado. Use WebP ou JPEG." };
    }

    // 6. Upload para o Supabase Storage via service role
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const fileId = crypto.randomUUID();
    const ext = photo.type === "image/jpeg" ? "jpg" : photo.type === "image/png" ? "png" : "webp";
    const filePath = `reports/${year}/${month}/${fileId}.${ext}`;

    const arrayBuffer = await photo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from("cidade-viva-reports")
      .upload(filePath, buffer, {
        contentType: photo.type,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      console.error("Erro no upload da foto:", uploadError.message, uploadError);
      return { success: false, error: "Não foi possível enviar a foto comprobatória." };
    }

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("cidade-viva-reports").getPublicUrl(filePath);

    // 7. Anonimização do IP (LGPD)
    const secret = process.env.HASH_SALT || "cidade_viva_guarapuava_salt_secure_2026";
    const ipHash = crypto
      .createHash("sha256")
      .update(clientIp + secret)
      .digest("hex");

    // 8. Geocodificação reversa silenciosa
    const geo = await reverseGeocode(lat, lng);

    // 9. Promoção automática para "Confirmado pela Comunidade"
    const delta = 0.0005; // ~50m
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: nearbyReports } = await supabaseAdmin
      .from("cidade_viva_reports")
      .select("id, ip_hash")
      .eq("category_id", categoryId)
      .gte("latitude", lat - delta)
      .lte("latitude", lat + delta)
      .gte("longitude", lng - delta)
      .lte("longitude", lng + delta)
      .gte("created_at", sevenDaysAgo)
      .neq("status", "resolvido");

    const distinctIps = new Set<string>();
    const nearbyIds: string[] = [];
    if (nearbyReports) {
      for (const r of nearbyReports) {
        distinctIps.add(r.ip_hash);
        nearbyIds.push(r.id);
      }
    }
    distinctIps.add(ipHash);

    let status: Report["status"] = "sugestivo";
    if (distinctIps.size >= 3) {
      status = "confirmado_comunidade";
      if (nearbyIds.length > 0) {
        await supabaseAdmin
          .from("cidade_viva_reports")
          .update({ status: "confirmado_comunidade" })
          .in("id", nearbyIds)
          .eq("status", "sugestivo");
      }
    }

    // 10. Persistência da ocorrência no banco
    const { data: newReport, error: insertError } = await supabaseAdmin
      .from("cidade_viva_reports")
      .insert({
        category_id: categoryId,
        latitude: lat,
        longitude: lng,
        description: description ? description.slice(0, 500) : null,
        photo_url: publicUrl,
        address: geo.address || null,
        city: geo.city || "Guarapuava",
        state: geo.state || "PR",
        ip_hash: ipHash,
        status,
      })
      .select("id, category_id, latitude, longitude, description, photo_url, address, city, state, status, created_at")
      .single();

    if (insertError) {
      console.error("Erro ao registrar ocorrência:", insertError);
      return { success: false, error: "Falha ao gravar ocorrência no banco de dados." };
    }

    return {
      success: true,
      report: newReport as Report,
    };
  } catch (err) {
    console.error("Erro inesperado em createReport:", err);
    return { success: false, error: "Ocorreu um erro inesperado ao enviar seu relato." };
  }
}
