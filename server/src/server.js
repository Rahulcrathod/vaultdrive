import "dotenv/config";
import app from "./app.js";
import { connectDatabase } from "./config/database.js";

await connectDatabase();

const port = Number(process.env.PORT || 5000);

app.listen(port, () => {
  console.log(`=======================================================`);
  console.log(`🔒 VaultDrive Server running on http://localhost:${port}`);
  console.log(`📦 2 GB Quota Enforced via Atomic Quota Reservation`);
  console.log(`🛡️ Zero-Knowledge Client-Side AES-256-GCM Supported`);
  console.log(`=======================================================`);
});
