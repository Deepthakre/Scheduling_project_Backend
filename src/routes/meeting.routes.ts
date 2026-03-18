// backend/src/routes/meeting.routes.ts

import { Router } from "express";
import {
  createMeeting,
  getMyMeetings,
  getMeetingById,
  deleteMeeting,
  getPublicMeeting,
  getAvailableSlots,
} from "../controllers/meeting.controller";
import { getMeetingBookings } from "../controllers/booking.controller";
import { protect  } from "../middlewares/auth.middleware";

const router = Router();

// ─── PUBLIC (no login) ────────────────────────────────────
router.get("/public/:slug", getPublicMeeting);
router.get("/public/:slug/slots", getAvailableSlots);

// ─── PROTECTED (login zaroori) ────────────────────────────
router.post("/", protect, createMeeting);
router.get("/", protect, getMyMeetings);
router.get("/:id", protect, getMeetingById);
router.delete("/:id", protect, deleteMeeting);
router.get("/:id/bookings", protect, getMeetingBookings);



export default router;