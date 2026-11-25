/** @jest-environment node */
// Image storage: Vercel Blob when BLOB_READ_WRITE_TOKEN is set, Postgres otherwise.
jest.mock("@/lib/db", () => ({ query: jest.fn() }));
jest.mock("@/lib/schema", () => ({ ensureSchema: jest.fn().mockResolvedValue() }));
jest.mock("@vercel/blob", () => ({
  put: jest.fn(async (pathname) => ({ url: `https://store.private.blob.vercel-storage.com/${pathname}` })),
  get: jest.fn(async () => ({ stream: "STREAM" })),
  del: jest.fn(async () => {}),
}));

const { query } = require("@/lib/db");
const blob = require("@vercel/blob");
const { insertMedia, readMedia, deleteMedia } = require("@/lib/media");

const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8]);

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.BLOB_READ_WRITE_TOKEN;
  delete process.env.BLOB_ACCESS;
});

describe("without Blob (database storage)", () => {
  it("stores the bytes in the database", async () => {
    query.mockResolvedValueOnce({ rows: [{ id: "m1" }] });
    expect(await insertMedia(JPG, "image/jpeg", "a.jpg", "members")).toBe("m1");
    expect(blob.put).not.toHaveBeenCalled();
    const params = query.mock.calls[0][1];
    expect(params[1]).toBe(JPG); // data
    expect(params[4]).toBeNull(); // blob_url
  });

  it("reads the bytes back from the database", async () => {
    query.mockResolvedValueOnce({ rows: [{ content_type: "image/jpeg", data: JPG, blob_url: null }] });
    expect(await readMedia("m1")).toEqual({ contentType: "image/jpeg", body: JPG });
    expect(blob.get).not.toHaveBeenCalled();
  });
});

describe("with Vercel Blob", () => {
  beforeEach(() => {
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test";
  });

  it("uploads privately and keeps only the URL in the database", async () => {
    query.mockResolvedValueOnce({ rows: [{ id: "m2" }] });
    expect(await insertMedia(JPG, "image/jpeg", "a.jpg", "members")).toBe("m2");
    const [pathname, body, opts] = blob.put.mock.calls[0];
    expect(pathname).toMatch(/^members\/[0-9a-f-]{36}\.jpg$/);
    expect(body).toBe(JPG);
    expect(opts).toMatchObject({ access: "private", contentType: "image/jpeg" });
    const params = query.mock.calls[0][1];
    expect(params[1]).toBeNull(); // no bytes in the database
    expect(params[4]).toContain("blob.vercel-storage.com/members/");
  });

  it("removes the uploaded file if saving the row fails", async () => {
    query.mockRejectedValueOnce(new Error("db down"));
    await expect(insertMedia(JPG, "image/jpeg", "a.jpg", "site")).rejects.toThrow("db down");
    expect(blob.del).toHaveBeenCalledTimes(1);
  });

  it("streams the image from Blob", async () => {
    query.mockResolvedValueOnce({ rows: [{ content_type: "image/png", data: null, blob_url: "https://x/members/a.png" }] });
    expect(await readMedia("m2")).toEqual({ contentType: "image/png", body: "STREAM" });
    expect(blob.get).toHaveBeenCalledWith("https://x/members/a.png", { access: "private" });
  });

  it("returns null when the Blob file is gone", async () => {
    blob.get.mockResolvedValueOnce(null);
    query.mockResolvedValueOnce({ rows: [{ content_type: "image/png", data: null, blob_url: "https://x/gone.png" }] });
    expect(await readMedia("m3")).toBeNull();
  });

  it("deletes the row and the Blob file", async () => {
    query.mockResolvedValueOnce({ rows: [{ blob_url: "https://x/members/a.png" }] });
    await deleteMedia("m2");
    expect(blob.del).toHaveBeenCalledWith("https://x/members/a.png");
  });

  it("a failed Blob delete does not throw", async () => {
    blob.del.mockRejectedValueOnce(new Error("network"));
    query.mockResolvedValueOnce({ rows: [{ blob_url: "https://x/a.png" }] });
    await expect(deleteMedia("m2")).resolves.toBeUndefined();
  });
});

it("returns null for an unknown id", async () => {
  query.mockResolvedValueOnce({ rows: [] });
  expect(await readMedia("nope")).toBeNull();
});
