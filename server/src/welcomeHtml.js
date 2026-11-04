export function getWelcomeHtml(clientOrigin, isConnected) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>VaultDrive API Server</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #020617;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 24px;
      max-width: 520px;
      width: 100%;
      padding: 36px;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(13, 148, 136, 0.15);
      color: #2dd4bf;
      border: 1px solid rgba(13, 148, 136, 0.3);
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 20px;
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      background: #2dd4bf;
      border-radius: 50%;
    }
    h1 {
      font-size: 26px;
      font-weight: 800;
      margin-bottom: 8px;
    }
    p.subtitle {
      font-size: 14px;
      color: #94a3b8;
      margin-bottom: 24px;
      line-height: 1.5;
    }
    .notice {
      background: #1e293b;
      border-left: 4px solid #0d9488;
      padding: 14px 16px;
      border-radius: 12px;
      text-align: left;
      margin-bottom: 28px;
      font-size: 13px;
      color: #cbd5e1;
      line-height: 1.5;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 14px 20px;
      background: #14b8a6;
      color: #020617;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      border-radius: 14px;
      transition: all 0.2s ease;
    }
    .btn:hover { background: #2dd4bf; }
    .stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid #1e293b;
      font-size: 12px;
      text-align: left;
    }
    .stat-item {
      background: rgba(15, 23, 42, 0.6);
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid #1e293b;
    }
    .stat-label { color: #64748b; font-size: 11px; margin-bottom: 2px; }
    .stat-val { color: #e2e8f0; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">
      <span class="badge-dot"></span>
      Backend API Server Online
    </div>
    <h1>VaultDrive API is Running</h1>
    <p class="subtitle">
      You have accessed the backend API port (<strong>5000</strong>). To use the website interface, open the frontend application.
    </p>

    <div class="notice">
      💡 <strong>Looking for the interactive website?</strong><br>
      The React application is running on port <strong>5173</strong>. Click the button below to open it!
    </div>

    <a href="${clientOrigin}" class="btn">
      🚀 Open VaultDrive Website (${clientOrigin})
    </a>

    <div class="stats">
      <div class="stat-item">
        <div class="stat-label">Storage Quota</div>
        <div class="stat-val">2.0 GiB (Guaranteed)</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Encryption</div>
        <div class="stat-val">Client AES-256-GCM</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Database</div>
        <div class="stat-val">${isConnected ? "MongoDB Atlas" : "Local Vault Store"}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">API Health</div>
        <div class="stat-val"><a href="/api/health" style="color: #2dd4bf; text-decoration: none;">/api/health</a></div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
