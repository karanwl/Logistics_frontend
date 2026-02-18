import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BASE_URL = "https://logistics-backend-6f0pea.fly.dev";

function resolveBaseUrl(rawBaseUrl: string | undefined): string {
  const trimmed = (rawBaseUrl || "").trim();
  const unquoted = trimmed.replace(/^['"]|['"]$/g, "").trim();
  return unquoted || DEFAULT_BASE_URL;
}

const BASE_URL = resolveBaseUrl(process.env.FASTAPI_BASE_URL);

async function proxyRequest(req: NextRequest, params: { path: string[] }) {
  const targetUrl = new URL(req.url);
  const path = params.path.join("/");
  const url = `${BASE_URL.replace(/\/$/, "")}/${path}${targetUrl.search}`;

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("accept-encoding");

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: "no-store",
    redirect: "manual"
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    return NextResponse.json(
      {
        detail:
          "We could not connect to the service right now. Please try again in a moment."
      },
      { status: 502 }
    );
  }
  const responseHeaders = new Headers();
  const setCookie = (res.headers as any).getSetCookie?.() ?? [];
  if (Array.isArray(setCookie)) {
    for (const cookie of setCookie) {
      responseHeaders.append("set-cookie", cookie);
    }
  } else if (typeof setCookie === "string" && setCookie.length > 0) {
    responseHeaders.append("set-cookie", setCookie);
  }
  res.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "set-cookie") {
      // Handled via getSetCookie() above.
      return;
    }
    if (lower === "content-encoding" || lower === "content-length" || lower === "transfer-encoding") {
      // Let Next/Fetch handle encoding/length for the proxied response.
      return;
    }
    responseHeaders.set(key, value);
  });

  return new NextResponse(res.body, {
    status: res.status,
    headers: responseHeaders
  });
}

export async function GET(req: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(req, context.params);
}

export async function POST(req: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(req, context.params);
}

export async function PATCH(req: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(req, context.params);
}

export async function PUT(req: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(req, context.params);
}

export async function DELETE(req: NextRequest, context: { params: { path: string[] } }) {
  return proxyRequest(req, context.params);
}
