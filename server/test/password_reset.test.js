import "dotenv/config";
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import User from "../src/models/User.js";
import { connectDatabase, isUsingFallback } from "../src/config/database.js";
import { localStore } from "../src/config/localStore.js";
import crypto from "crypto";

describe("VaultDrive - Email Password Reset Flow", () => {
  const testEmail = `reset_test_${Date.now()}@vaultdrive.test`;
  const initialPassword = "InitialPassword123!";
  const newPassword = "NewSecretPassword456!";
  const testRawToken = crypto.randomBytes(32).toString("hex");

  beforeAll(async () => {
    await connectDatabase();
  });

  it("1. Registers a user for the reset test", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        username: `user_${Date.now()}`,
        email: testEmail,
        password: initialPassword
      });

    expect(res.status).toBe(201);
  }, 15000);

  it("2. Requests password reset email via /api/auth/forgot-password", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: testEmail });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/instructions have been sent/i);
  }, 15000);

  it("3. Verifies token and resets password", async () => {
    const hashed = crypto.createHash("sha256").update(testRawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    if (isUsingFallback()) {
      const user = localStore.findUserByEmail(testEmail);
      localStore.updateUser(user._id, {
        resetPasswordToken: hashed,
        resetPasswordExpires: expiresAt.toISOString()
      });
    } else {
      await User.updateOne(
        { email: testEmail },
        {
          resetPasswordToken: hashed,
          resetPasswordExpires: expiresAt
        }
      );
    }

    // Verify token
    const verifyRes = await request(app).get(`/api/auth/verify-reset-token/${testRawToken}`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.valid).toBe(true);

    // Reset password
    const resetRes = await request(app)
      .post("/api/auth/reset-password")
      .send({
        token: testRawToken,
        password: newPassword
      });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.message).toMatch(/successful/i);

    // Verify user can now log in with the new password
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        identifier: testEmail,
        password: newPassword
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.email).toBe(testEmail);

    // Verify old password no longer works
    const oldLoginRes = await request(app)
      .post("/api/auth/login")
      .send({
        identifier: testEmail,
        password: initialPassword
      });

    expect(oldLoginRes.status).toBe(401);
  }, 15000);
});
