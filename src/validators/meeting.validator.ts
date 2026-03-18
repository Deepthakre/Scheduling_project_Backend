import { z } from "zod";

export const createMeetingSchema = z.object({
  meetingName: z
    .string()
    .min(3, "Meeting name must be at least 3 characters"),

  duration: z
    .number()
    .min(5, "Duration must be at least 5 minutes"),

  description: z.string().optional(),

  location: z
    .string()
    .min(2, "Location is required"),

  meetingType: z
    .enum(["one-on-one", "group"])
    .optional()
});
