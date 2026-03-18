// backend/src/controllers/booking.controller.ts

import { Request, Response } from "express";
import { Booking } from "../models/booking.model";
import { Meeting } from "../models/meeting.model";
import { User } from "../models/user.model";
import { sendSuccess, sendError } from "../utils/response.utils";
import { AuthRequest } from "../middlewares/auth.middleware";
import { sendBookingConfirmationEmail } from "../services/email.service";

// ─── PUBLIC: CREATE BOOKING ───────────────────────────────
export const createBooking = async (req: Request, res: Response): Promise<void> => {
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

    // Meeting dhundo
    const meeting = await Meeting.findOne({ slug: meetingSlug, isActive: true });
    if (!meeting) {
      sendError(res, "Meeting not found.", 404);
      return;
    }

    // Check karo slot already booked toh nahi
    const existing = await Booking.findOne({
      meetingId: meeting._id,
      selectedDate,
      selectedTime,
      status: "confirmed",
    });

    if (existing) {
      sendError(res, "This time slot is already booked. Please choose another.", 409);
      return;
    }

    // Booking banao
    const booking = await Booking.create({
      meetingId: meeting._id,
      guestName,
      guestEmail,
      selectedDate,
      selectedTime,
      customAnswers: customAnswers || [],
    });

    // Confirmation email bhejo
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
      // Email fail hone par booking cancel mat karo
      console.error("Confirmation email failed — non critical");
    }

    sendSuccess(res, "Booking confirmed successfully!", { booking }, 201);
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