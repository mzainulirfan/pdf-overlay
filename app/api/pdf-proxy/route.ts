import type { NextRequest } from "next/server";
import { MAX_PDF_SIZE_BYTES } from "@/lib/file-validator";

export const dynamic = "force-dynamic";

/**
 * Proxy untuk mengambil PDF dari URL eksternal.
 * Browser membatasi fetch lintas-domain (CORS); fetch dari server tidak.
 * Catatan: pada Vercel, payload respons function dibatasi ~4,5 MB,
 * jadi file yang lebih besar akan gagal saat melalui proxy ini.
 */
export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return new Response(JSON.stringify({ error: "Parameter url diperlukan." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return new Response(JSON.stringify({ error: "URL tidak valid." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return new Response(
      JSON.stringify({ error: "Hanya URL http/https yang didukung." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(parsed.toString());
  } catch {
    return new Response(
      JSON.stringify({ error: "Gagal mengakses URL dari server." }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!upstream.ok) {
    return new Response(
      JSON.stringify({ error: `Server mengembalikan status ${upstream.status}.` }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  const length = Number(upstream.headers.get("content-length") ?? 0);
  if (length > MAX_PDF_SIZE_BYTES) {
    return new Response(
      JSON.stringify({ error: "Ukuran file terlalu besar. Maksimal 25 MB." }),
      { status: 413, headers: { "Content-Type": "application/json" } },
    );
  }

  const bytes = await upstream.arrayBuffer();

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}
