// backend/src/controllers/booking.controller.ts

import { Request, Response } from "express";
import { Booking } from "../models/booking.model";
import { Meeting } from "../models/meeting.model";
import { User } from "../models/user.model";
import { sendSuccess, sendError } from "../utils/response.utils";
import { AuthRequest } from "../middlewares/auth.middleware";
import { sendBookingConfirmationEmail } from "../services/email.service";
import { CACHE_KEYS, deleteCache } from "../utils/cache";

// ─── PUBLIC: CREATE BOOKING ───────────────────────────────

export const createBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      meetingSlug,
      guestName,
      guestEmail,
      selectedDate,
      selectedTime,
      customAnswers,
    } = req.body;

    if (!meetingSlug || !guestName || !guestEmail || !selectedDate || !selectedTime) {
      sendError(res, "All required fields must be filled.", 400);
      return;
    }

    const meeting = await Meeting.findOne({
      slug: meetingSlug,
      isActive: true,
    });

    if (!meeting) {
      sendError(res, "Meeting not found.", 404);
      return;
    }

    // Slot already booked check
    const existing = await Booking.findOne({
      meetingId: meeting._id,
      selectedDate,
      selectedTime,
      status: "confirmed",
    });

    if (existing) {
      sendError(res, "This slot is already booked.", 409);
      return;
    }

    const booking = await Booking.create({
      meetingId: meeting._id,
      guestName,
      guestEmail,
      selectedDate,
      selectedTime,
      customAnswers: customAnswers || [],
    });

    // ✅ Is date ke slots cache clear karo
    // Kyun? Ek slot ab book ho gaya
    // Purana cache invalid ho gaya
    await deleteCache(CACHE_KEYS.slots(meetingSlug, selectedDate));
    console.log(`🗑 Slots cache cleared: ${meetingSlug} - ${selectedDate}`);

    // Email bhejo
    try {
      const host = await User.findById(meeting.userId);
      await sendBookingConfirmationEmail(
        guestEmail,
        guestName,
        meeting.title,
        selectedDate,
        selectedTime,
        host?.name || "Host"
      );
    } catch {
      console.error("Email failed — non critical");
    }

    sendSuccess(res, "Booking confirmed!", { booking }, 201);
  } catch {
    sendError(res, "Failed to create booking.", 500);
  }
};

// ─── GET BOOKINGS FOR A MEETING (host only) ───────────────
export const getMeetingBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Pehle check karo yeh meeting is user ki hai
    const meeting = await Meeting.findOne({
      _id: req.params.id,
      userId: req.currentUser!.userId,
    });

    if (!meeting) {
      sendError(res, "Meeting not found.", 404);
      return;
    }

    const bookings = await Booking.find({
      meetingId: meeting._id,
    }).sort({ createdAt: -1 });

    sendSuccess(res, "Bookings fetched successfully.", { bookings });
  } catch {
    sendError(res, "Failed to fetch bookings.", 500);
  }
};