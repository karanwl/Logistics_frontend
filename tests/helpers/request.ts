export function makeTestRequest(url: string, init?: RequestInit): Request & { nextUrl: URL } {
  const request = new Request(url, init) as Request & { nextUrl: URL };
  Object.defineProperty(request, "nextUrl", {
    value: new URL(url),
    configurable: true
  });
  return request;
}
