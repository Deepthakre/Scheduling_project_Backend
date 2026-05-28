// src/controllers/meeting.controller.ts

import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { Meeting } from "../models/meeting.model";
import { Booking } from "../models/booking.model";
import { sendSuccess, sendError } from "../utils/response.utils";
import { AuthRequest } from "../middlewares/auth.middleware";
import {
  getCache,
  setCache,
  deleteCache,
  deleteCacheByPattern,
  CACHE_KEYS,
  CACHE_TTL,
} from "../utils/cache";

// ─── CREATE MEETING ───────────────────────────
export const createMeeting = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      title, meetingType, duration,
      description, location,
      availability, customQuestions, timezone,
    } = req.body;

    if (!title || !meetingType || !duration || !availability?.length) {
      sendError(res, "Required fields missing.", 400);
      return;
    }

    const base = title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    const slug = `${base}-${uuidv4().split("-")[0]}`;

    const meeting = await Meeting.create({
      userId: req.currentUser!.userId,
      title, meetingType, duration,
      description, location,
      availability,
      customQuestions: customQuestions || [],
      timezone: timezone || "Asia/Kolkata",
      slug,
    });

    // ✅ User ki meetings cache clear karo
    // Naya meeting bana → purani list outdated ho gayi
    await deleteCache(CACHE_KEYS.myMeetings(req.currentUser!.userId));

    sendSuccess(res, "Meeting created successfully.", { meeting }, 201);
  } catch {
    sendError(res, "Failed to create meeting.", 500);
  }
};

// ─── GET MY MEETINGS ──────────────────────────
export const getMyMeetings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.currentUser!.userId;
    const cacheKey = CACHE_KEYS.myMeetings(userId);

    // ✅ Step 1: Cache check karo
    const cached = await getCache(cacheKey);
    if (cached) {
      console.log("⚡ Cache HIT: myMeetings");
      sendSuccess(res, "Meetings fetched.", { meetings: cached });
      return;
    }

    // ✅ Step 2: Cache miss → DB se lo
    console.log("🔍 Cache MISS: myMeetings → DB");
    const meetings = await Meeting.find({
      userId,
      isActive: true,
    }).sort({ createdAt: -1 });

    // ✅ Step 3: Cache mein save karo
    await setCache(cacheKey, meetings, CACHE_TTL.MY_MEETINGS);

    sendSuccess(res, "Meetings fetched.", { meetings });
  } catch {
    sendError(res, "Failed to fetch meetings.", 500);
  }
};

// ─── GET MEETING BY ID ────────────────────────
export const getMeetingById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const meeting = await Meeting.findOne({
      _id: req.params.id,
      userId: req.currentUser!.userId,
    });

    if (!meeting) {
      sendError(res, "Meeting not found.", 404);
      return;
    }

    sendSuccess(res, "Meeting fetched.", { meeting });
  } catch {
    sendError(res, "Failed to fetch meeting.", 500);
  }
};

// ─── DELETE MEETING ───────────────────────────
export const deleteMeeting = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const meeting = await Meeting.findOneAndDelete({
      _id: req.params.id,
      userId: req.currentUser!.userId,
    });

    if (!meeting) {
      sendError(res, "Meeting not found.", 404);
      return;
    }

    // ✅ Related caches clear karo
    await Promise.all([
      // User ki meetings list
      deleteCache(CACHE_KEYS.myMeetings(req.currentUser!.userId)),
      // Public meeting cache
      deleteCache(CACHE_KEYS.publicMeeting(meeting.slug)),
      // Is meeting ke saare slots
      deleteCacheByPattern(`slots:${meeting.slug}:*`),
    ]);

    sendSuccess(res, "Meeting deleted.");
  } catch {
    sendError(res, "Failed to delete meeting.", 500);
  }
};

// ─── PUBLIC: GET MEETING BY SLUG ──────────────
export const getPublicMeeting = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { slug } = req.params;
    const cacheKey = CACHE_KEYS.publicMeeting(slug);

    // ✅ Step 1: Cache check karo
    const cached = await getCache(cacheKey);
    if (cached) {
      console.log(`⚡ Cache HIT: publicMeeting(${slug})`);
      sendSuccess(res, "Meeting fetched.", { meeting: cached });
      return;
    }

    // ✅ Step 2: Cache miss → DB se lo
    console.log(`🔍 Cache MISS: publicMeeting(${slug}) → DB`);
    const meeting = await Meeting.findOne({
      slug,
      isActive: true,
    }).populate("userId", "name email");

    if (!meeting) {
      sendError(res, "Meeting not found.", 404);
      return;
    }

    // ✅ Step 3: 5 min ke liye cache karo
    await setCache(cacheKey, meeting, CACHE_TTL.PUBLIC_MEETING);

    sendSuccess(res, "Meeting fetched.", { meeting });
  } catch {
    sendError(res, "Failed to fetch meeting.", 500);
  }
};

// ─── PUBLIC: GET AVAILABLE SLOTS ─────────────
export const getAvailableSlots = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { slug } = req.params;
    const { date } = req.query as { date: string };

    if (!date) {
      sendError(res, "Date is required.", 400);
      return;
    }

    const cacheKey = CACHE_KEYS.slots(slug, date);

    // ✅ Step 1: Cache check karo
    const cached = await getCache<string[]>(cacheKey);
    if (cached) {
      console.log(`⚡ Cache HIT: slots(${slug}, ${date})`);
      sendSuccess(res, "Slots fetched.", { slots: cached });
      return;
    }

    // ✅ Step 2: Cache miss → Calculate karo
    console.log(`🔍 Cache MISS: slots(${slug}, ${date}) → DB`);
    const meeting = await Meeting.findOne({ slug, isActive: true });
    if (!meeting) {
      sendError(res, "Meeting not found.", 404);
      return;
    }

    // Day nikalo
    const dayNames = [
      "Sunday","Monday","Tuesday","Wednesday",
      "Thursday","Friday","Saturday",
    ];
    const selectedDay = dayNames[new Date(date + "T00:00:00").getDay()];

    const dayAvail = meeting.availability.find(
      (a) => a.day.toLowerCase() === selectedDay.toLowerCase()
    );

    if (!dayAvail) {
      sendSuccess(res, "No availability.", { slots: [] });
      return;
    }

    // Slots generate karo
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

    // Booked slots hata do
    const bookings = await Booking.find({
      meetingId: meeting._id,
      selectedDate: date,
      status: "confirmed",
    });
    const bookedTimes = bookings.map((b) => b.selectedTime);
    const availableSlots = slots.filter((s) => !bookedTimes.includes(s));

    // ✅ Step 3: 1 min ke liye cache karo
    await setCache(cacheKey, availableSlots, CACHE_TTL.SLOTS);

    sendSuccess(res, "Slots fetched.", { slots: availableSlots });
  } catch {
    sendError(res, "Failed to fetch slots.", 500);
  }
};