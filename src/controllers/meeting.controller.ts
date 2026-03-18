// backend/src/controllers/meeting.controller.ts

import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { Meeting } from "../models/meeting.model";
import { Booking } from "../models/booking.model";
import { sendSuccess, sendError } from "../utils/response.utils";
import { AuthRequest } from "../middlewares/auth.middleware";

// ─── CREATE MEETING ───────────────────────────────────────
export const createMeeting = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, meetingType, duration, description, location, availability, customQuestions } = req.body;

    if (!title || !meetingType || !duration || !availability?.length) {
      sendError(res, "Title, type, duration and availability are required.", 400);
      return;
    }

    // Unique slug banao
    const base = title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const slug = `${base}-${uuidv4().split("-")[0]}`;

    const meeting = await Meeting.create({
      userId: req.currentUser!.userId,
      title,
      meetingType,
      duration,
      description,
      location,
      availability,
      customQuestions: customQuestions || [],
      slug,
    });

    sendSuccess(res, "Meeting created successfully.", { meeting }, 201);
  } catch {
    sendError(res, "Failed to create meeting.", 500);
  }
};

// ─── GET MY MEETINGS ──────────────────────────────────────
export const getMyMeetings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const meetings = await Meeting.find({
      userId: req.currentUser!.userId,
      isActive: true,
    }).sort({ createdAt: -1 });

    sendSuccess(res, "Meetings fetched successfully.", { meetings });
  } catch {
    sendError(res, "Failed to fetch meetings.", 500);
  }
};

// ─── GET SINGLE MEETING ───────────────────────────────────
export const getMeetingById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const meeting = await Meeting.findOne({
      _id: req.params.id,
      userId: req.currentUser!.userId,
    });

    if (!meeting) {
      sendError(res, "Meeting not found.", 404);
      return;
    }

    sendSuccess(res, "Meeting fetched successfully.", { meeting });
  } catch {
    sendError(res, "Failed to fetch meeting.", 500);
  }
};

// ─── DELETE MEETING ───────────────────────────────────────
export const deleteMeeting = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const meeting = await Meeting.findOneAndDelete({
      _id: req.params.id,
      userId: req.currentUser!.userId,
    });

    if (!meeting) {
      sendError(res, "Meeting not found.", 404);
      return;
    }

    sendSuccess(res, "Meeting deleted successfully.");
  } catch {
    sendError(res, "Failed to delete meeting.", 500);
  }
};

// ─── PUBLIC: GET MEETING BY SLUG ──────────────────────────
export const getPublicMeeting = async (req: Request, res: Response): Promise<void> => {
  try {
    const meeting = await Meeting.findOne({
      slug: req.params.slug,
      isActive: true,
    }).populate("userId", "name email");

    if (!meeting) {
      sendError(res, "Meeting not found.", 404);
      return;
    }

    sendSuccess(res, "Meeting fetched successfully.", { meeting });
  } catch {
    sendError(res, "Failed to fetch meeting.", 500);
  }
};

// ─── PUBLIC: GET AVAILABLE SLOTS ─────────────────────────
export const getAvailableSlots = async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    const { date } = req.query as { date: string };

    if (!date) {
      sendError(res, "Date is required.", 400);
      return;
    }

    const meeting = await Meeting.findOne({ slug, isActive: true });
    if (!meeting) {
      sendError(res, "Meeting not found.", 404);
      return;
    }

    // Date se day nikalo
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayIndex = new Date(date + "T00:00:00").getDay();
    const selectedDay = dayNames[dayIndex];

    // Us din ki availability dhundo
    const dayAvail = meeting.availability.find(
      (a) => a.day.toLowerCase() === selectedDay.toLowerCase()
    );

    if (!dayAvail) {
      sendSuccess(res, "No availability for this day.", { slots: [] });
      return;
    }

    // Time slots generate karo
    const slots: string[] = [];
    const [startH, startM] = dayAvail.startTime.split(":").map(Number);
    const [endH, endM] = dayAvail.endTime.split(":").map(Number);

    let current = startH * 60 + startM;
    const end = endH * 60 + endM;

    while (current + meeting.duration <= end) {
      const h = Math.floor(current / 60);
      const m = current % 60;
      slots.push(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
      );
      current += meeting.duration;
    }

    // Already booked slots hata do
    const bookings = await Booking.find({
      meetingId: meeting._id,
      selectedDate: date,
      status: "confirmed",
    });

    const bookedTimes = bookings.map((b) => b.selectedTime);
    const availableSlots = slots.filter((s) => !bookedTimes.includes(s));

    sendSuccess(res, "Slots fetched successfully.", { slots: availableSlots });
  } catch {
    sendError(res, "Failed to fetch slots.", 500);
  }
};