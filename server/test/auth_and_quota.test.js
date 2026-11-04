import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";

describe("VaultDrive Server - Auth & 2 GB Quota Verification", () => {
  const testUser = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@vaultdrive.test`,
    password: "SuperSecretPassword123!"
  };

  let sessionCookie = null;
  let testUserId = null;

  it("1. Registers a new account with a 2 GB (2,147,483,648 bytes) quota", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.username).toBe(testUser.username);
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.user.quotaBytes).toBe(2147483648);
    expect(res.body.user.usedBytes).toBe(0);
    expect(res.body.user.salt).toBeDefined();

    testUserId = res.body.user.id;
    // Extract session cookie
    if (res.headers["set-cookie"]) {
      sessionCookie = res.headers["set-cookie"][0];
    }
  });

  it("2. Rejects duplicate email registration", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        username: `diff_${Date.now()}`,
        email: testUser.email,
        password: "Password123!"
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it("3. Authenticates user and logs in", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        identifier: testUser.username,
        password: testUser.password
      });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testUser.email);
    if (res.headers["set-cookie"]) {
      sessionCookie = res.headers["set-cookie"][0];
    }
  });

  it("4. Rejects login with incorrect password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        identifier: testUser.username,
        password: "WrongPassword999!"
      });

    expect(res.status).toBe(401);
  });

  it("5. Retrieves current user storage quota metrics via /api/storage/usage", async () => {
    const res = await request(app)
      .get("/api/storage/usage")
      .set("Cookie", sessionCookie);

    expect(res.status).toBe(200);
    expect(res.body.quotaBytes).toBe(2147483648);
    expect(res.body.usedBytes).toBe(0);
    expect(res.body.availableBytes).toBe(2147483648);
  });

  it("6. Rejects upload intent that exceeds the 2 GB quota (> 2,147,483,648 bytes)", async () => {
    const oversizedBytes = 2147483649; // 1 byte over 2 GB
    const res = await request(app)
      .post("/api/files/upload-intent")
      .set("Cookie", sessionCookie)
      .send({
        sizeBytes: oversizedBytes,
        nameCiphertext: "ciphertext_large",
        originalName: "huge_video.mp4"
      });

    expect(res.status).toBe(400); // Exceeds MAX_QUOTA_BYTES limit
  });

  it("7. Reserves quota and allows upload intent for valid file size", async () => {
    const fileSize = 15 * 1024 * 1024; // 15 MB
    const res = await request(app)
      .post("/api/files/upload-intent")
      .set("Cookie", sessionCookie)
      .send({
        sizeBytes: fileSize,
        nameCiphertext: "encrypted_photo_base64",
        originalName: "family_photo.jpg",
        mimeType: "image/jpeg"
      });

    expect(res.status).toBe(200);
    expect(res.body.reservationId).toBeDefined();
    expect(res.body.uploadUrl).toBeDefined();

    // Verify reservedBytes updated
    const usageRes = await request(app)
      .get("/api/storage/usage")
      .set("Cookie", sessionCookie);

    expect(usageRes.body.reservedBytes).toBe(fileSize);
    expect(usageRes.body.availableBytes).toBe(2147483648 - fileSize);
  });

  it("8. Simulates uploading ciphertext to local vault and completing the file upload", async () => {
    const fileSize = 5000;
    // 1. Get intent
    const intentRes = await request(app)
      .post("/api/files/upload-intent")
      .set("Cookie", sessionCookie)
      .send({
        sizeBytes: fileSize,
        nameCiphertext: "encrypted_doc_name",
        originalName: "secret_document.txt",
        mimeType: "text/plain"
      });

    const { reservationId, objectKey } = intentRes.body;

    // 2. Put simulated ciphertext into local vault
    const putRes = await request(app)
      .put(`/api/files/vault-upload/${encodeURIComponent(objectKey)}`)
      .send(Buffer.alloc(fileSize, "A"));

    expect(putRes.status).toBe(200);

    // 3. Complete file
    const completeRes = await request(app)
      .post("/api/files/complete")
      .set("Cookie", sessionCookie)
      .send({
        reservationId,
        objectKey,
        nameCiphertext: "encrypted_doc_name",
        originalName: "secret_document.txt",
        sizeBytes: fileSize,
        mimeType: "text/plain",
        nonce: "dGVzdG5vbmNlMTIz"
      });

    expect(completeRes.status).toBe(201);
    expect(completeRes.body.file).toBeDefined();
    const createdFileId = completeRes.body.file._id || completeRes.body.file.id;

    // 4. Verify usedBytes increased and reservedBytes cleared
    const usage = await request(app)
      .get("/api/storage/usage")
      .set("Cookie", sessionCookie);

    expect(usage.body.usedBytes).toBeGreaterThanOrEqual(fileSize);

    // 5. Delete file and verify quota is immediately released
    const delRes = await request(app)
      .delete(`/api/files/${createdFileId}`)
      .set("Cookie", sessionCookie);

    expect(delRes.status).toBe(200);
    expect(delRes.body.releasedBytes).toBe(fileSize);
  });
});
