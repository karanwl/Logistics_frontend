import test from "node:test";
import assert from "node:assert/strict";
import { normalizePhotoUrls, resolvePhotoUrl, s3RefToHttps, toPhotoSource } from "../lib/utils/photos.js";
test("normalizePhotoUrls trims, deduplicates, and skips invalid values", () => {
    const result = normalizePhotoUrls([
        " https://example.com/a.jpg ",
        "https://example.com/a.jpg",
        "",
        "   ",
        10,
        null
    ]);
    assert.deepEqual(result, ["https://example.com/a.jpg"]);
});
test("resolvePhotoUrl handles uploads and s3 references", () => {
    assert.equal(resolvePhotoUrl("/uploads/a.jpg"), "/api-proxy/uploads/a.jpg");
    assert.equal(resolvePhotoUrl("s3://bucket-name/path/to/file.jpg"), "https://bucket-name.s3.amazonaws.com/path/to/file.jpg");
    assert.equal(resolvePhotoUrl("https://cdn.example.com/image.jpg"), "https://cdn.example.com/image.jpg");
});
test("s3RefToHttps returns null for invalid S3 refs", () => {
    assert.equal(s3RefToHttps(""), null);
    assert.equal(s3RefToHttps("s3://missing-key"), null);
    assert.equal(s3RefToHttps("s3:///file.jpg"), null);
});
test("toPhotoSource upgrades insecure http urls with fallback", () => {
    const source = toPhotoSource("http://example.com/photo.jpg");
    assert.equal(source.primary, "https://example.com/photo.jpg");
    assert.equal(source.fallback, "http://example.com/photo.jpg");
});
