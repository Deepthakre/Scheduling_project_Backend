// backend/src/routes/booking.routes.ts

import { Router } from "express";
import { createBooking } from "../controllers/booking.controller";

const router = Router();

// ─── PUBLIC (koi bhi book kar sakta hai) ─────────────────
router.post("/", createBooking);

export default router;