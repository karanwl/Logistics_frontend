import { NextRequest, NextResponse } from "next/server";

const BASE_URL = process.env.FASTAPI_BASE_URL || "https://logistics-backend-6f0pea.fly.dev";

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

  const res = await fetch(url, init);
  const responseHeaders = new Headers();
  res.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      responseHeaders.append("set-cookie", value);
    } else if (
      key.toLowerCase() === "content-encoding" ||
      key.toLowerCase() === "content-length" ||
      key.toLowerCase() === "transfer-encoding"
    ) {
      // Let Next/Fetch handle encoding/length for the proxied response.
    } else {
      responseHeaders.set(key, value);
    }
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
