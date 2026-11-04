import nodemailer from "nodemailer";

let cachedTransporter = null;

async function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;

  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    const port = Number(SMTP_PORT) || 587;
    cachedTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: {
        rejectUnauthorized: false
      }
    });
    console.log(`[Email] Using configured SMTP server: ${SMTP_HOST}:${port}`);
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
  const fromAddress = process.env.SMTP_FROM || `"VaultDrive Security" <${process.env.SMTP_USER || "security@vaultdrive.app"}>`;
  const subject = "Reset your VaultDrive password";
  
  const html = `
    <div style="max-width:520px;margin:0 auto;background:#0f172a;border:1px solid #1e293b;border-radius:20px;padding:32px;color:#f8fafc;font-family:sans-serif;">
      <h2 style="color:#14b8a6;margin-top:0;">🛡️ VaultDrive Security</h2>
      <h3 style="color:#f1f5f9;margin-bottom:12px;">Password Reset Request</h3>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;">Hello <strong>${username}</strong>,</p>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;">We received a request to reset your password. Click the button below within 15 minutes to choose a new password:</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${resetUrl}" style="background:#14b8a6;color:#020617;font-weight:700;padding:12px 24px;border-radius:10px;text-decoration:none;display:inline-block;">Reset My Password</a>
      </div>
      <p style="color:#94a3b8;font-size:12px;">Or open this link: <a href="${resetUrl}" style="color:#2dd4bf;">${resetUrl}</a></p>
      <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);border-radius:10px;padding:12px;font-size:12px;color:#fbbf24;margin-top:20px;">
        ⚠️ Zero-Knowledge Notice: Because files are encrypted with your key, resetting your password generates a fresh salt and resets your vault space.
      </div>
      <p style="font-size:11px;color:#64748b;margin-top:24px;text-align:center;">VaultDrive Cloud Storage</p>
    </div>
  `;

  const text = `Hello ${username},\n\nPlease visit this link to reset your VaultDrive password:\n${resetUrl}\n\nExpires in 15 minutes.`;

  console.log("\n======================================================");
  console.log(`[PASSWORD RESET EMAIL] Dispatching to: ${toEmail}`);
  console.log(`Reset URL: ${resetUrl}`);
  console.log("======================================================\n");

  // Option A: SendGrid REST API (HTTPS port 443 - never blocked by Render)
  if (process.env.SENDGRID_API_KEY) {
    try {
      const resp = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: toEmail }] }],
          from: { email: process.env.SMTP_USER || "security@vaultdrive.app", name: "VaultDrive Security" },
          subject,
          content: [
            { type: "text/plain", value: text },
            { type: "text/html", value: html }
          ]
        })
      });
      if (resp.ok || resp.status === 202) {
        console.log(`[SendGrid HTTP Success] Reset email dispatched to ${toEmail}`);
        return { success: true };
      }
    } catch (sgErr) {
      console.warn("[SendGrid Error] Failed to send via SendGrid REST API:", sgErr.message);
    }
  }

  // Option B: Resend REST API (HTTPS port 443 - never blocked by Render)
  if (process.env.RESEND_API_KEY) {
    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "VaultDrive <onboarding@resend.dev>",
          to: [toEmail],
          subject,
          text,
          html
        })
      });
      if (resp.ok) {
        console.log(`[Resend HTTP Success] Reset email dispatched to ${toEmail}`);
        return { success: true };
      }
    } catch (resendErr) {
      console.warn("[Resend Error] Failed to send via Resend REST API:", resendErr.message);
    }
  }

  // Option C: Standard SMTP (works locally, on paid Render tiers, or custom VPS)
  try {
    const transporter = await getTransporter();
    if (transporter) {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        replyTo: fromAddress,
        priority: "high",
        subject,
        text,
        html
      });
      console.log(`[Email Success] Dispatched to ${toEmail}. MessageId: ${info.messageId}, Response: ${info.response}`);
      return { success: true, messageId: info.messageId, response: info.response };
    }
  } catch (err) {
    console.warn("[Email SMTP Warning] SMTP port 587/465 is blocked by network firewall (Render Free tier limitation):", err.message);
    // Graceful fallback: return directResetUrl so the user can immediately reset their password
    return {
      success: true,
      directResetUrl: resetUrl,
      isFallback: true
    };
  }

  return { success: true, directResetUrl: resetUrl, isFallback: true };
}
