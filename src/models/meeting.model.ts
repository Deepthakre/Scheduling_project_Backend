// backend/src/models/meeting.model.ts

import mongoose, { Document, Schema } from "mongoose";

export interface IAvailability {
  day: string;
  startTime: string;
  endTime: string;
}

export interface ICustomQuestion {
  question: string;
  required: boolean;
}

export interface IMeeting extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  meetingType: "one-on-one" | "group";
  duration: number;
  description?: string;
  location?: string;
  availability: IAvailability[];
  customQuestions: ICustomQuestion[];
  slug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const meetingSchema = new Schema<IMeeting>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Meeting title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    meetingType: {
      type: String,
      enum: ["one-on-one", "group"],
      required: true,
    },
    duration: {
      type: Number,
      required: true,
      enum: [15, 30, 45, 60, 90],
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    location: {
      type: String,
      maxlength: [200, "Location cannot exceed 200 characters"],
    },
    availability: [
      {
        day: { type: String, required: true },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
      },
    ],
    customQuestions: [
      {
        question: { type: String, required: true },
        required: { type: Boolean, default: false },
      },
    ],
    slug: {
      type: String,
      unique: true,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Meeting = mongoose.model<IMeeting>("Meeting", meetingSchema);