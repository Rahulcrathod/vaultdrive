import nodemailer from "nodemailer";

let cachedTransporter = null;

async function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    cachedTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: SMTP_SECURE === "true" || SMTP_PORT === "465",
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });
    console.log(`[Email] Using configured SMTP server: ${SMTP_HOST}`);
    return cachedTransporter;
  }

  try {
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    console.log("[Email] Using Ethereal development mailer (No SMTP configured).");
    return cachedTransporter;
  } catch (err) {
    console.warn("[Email] Could not create test mailer, will log to console:", err.message);
    return null;
  }
}

export async function sendPasswordResetEmail({ toEmail, username, resetUrl }) {
  const fromAddress = process.env.SMTP_FROM || '"VaultDrive Security" <security@vaultdrive.app>';
  const subject = "Reset your VaultDrive password";
  
  const html = `
    <div style="max-width:520px;margin:0 auto;background:#0f172a;border:1px solid #1e293b;border-radius:20px;padding:32px;color:#f8fafc;font-family:sans-serif;">
      <h2 style="color:#14b8a6;margin-top:0;">?? VaultDrive Security</h2>
      <h3>Password Reset Request</h3>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;">Hello <strong>${username}</strong>,</p>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;">We received a request to reset your password. Click the button below within 15 minutes to choose a new password:</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${resetUrl}" style="background:#14b8a6;color:#020617;font-weight:700;padding:12px 24px;border-radius:10px;text-decoration:none;display:inline-block;">Reset My Password</a>
      </div>
      <p style="color:#94a3b8;font-size:12px;">Or open this link: <a href="${resetUrl}" style="color:#2dd4bf;">${resetUrl}</a></p>
      <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);border-radius:10px;padding:12px;font-size:12px;color:#fbbf24;margin-top:20px;">
        ?? Zero-Knowledge Notice: Because files are encrypted with your key, resetting your password generates a fresh salt and resets your vault space.
      </div>
      <p style="font-size:11px;color:#64748b;margin-top:24px;text-align:center;">VaultDrive Cloud Storage</p>
    </div>
  `;

  const text = `Hello ${username},\n\nPlease visit this link to reset your VaultDrive password:\n${resetUrl}\n\nExpires in 15 minutes.`;

  console.log("\n======================================================");
  console.log(`[PASSWORD RESET EMAIL] Sent to: ${toEmail}`);
  console.log(`Reset URL: ${resetUrl}`);
  console.log("======================================================\n");

  try {
    const transporter = await getTransporter();
    if (transporter) {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject,
        text,
        html
      });
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`[Ethereal Email Preview]: ${previewUrl}\n`);
      }
      return { success: true, previewUrl: previewUrl || null };
    }
  } catch (err) {
    console.error("Failed to send reset email:", err.message);
  }
  return { success: true, previewUrl: null };
}
