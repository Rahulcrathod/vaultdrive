import { Router } from "express";
import { requireAuth } from "../middleware/authenticate.js";
import { getStorageMetrics } from "../services/quota.js";

const router = Router();

/**
 * GET /api/storage/usage - Detailed storage quota breakdown
 */
router.get("/usage", requireAuth, async (req, res, next) => {
  try {
    const metrics = await getStorageMetrics(req.userId);
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});

export default router;
