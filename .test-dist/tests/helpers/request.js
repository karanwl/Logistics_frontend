export function makeTestRequest(url, init) {
    const request = new Request(url, init);
    Object.defineProperty(request, "nextUrl", {
        value: new URL(url),
        configurable: true
    });
    return request;
}
