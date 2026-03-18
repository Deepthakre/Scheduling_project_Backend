// backend/src/models/booking.model.ts

import mongoose, { Document, Schema } from "mongoose";

export interface IBooking extends Document {
  _id: mongoose.Types.ObjectId;
  meetingId: mongoose.Types.ObjectId;
  guestName: string;
  guestEmail: string;
  selectedDate: string;
  selectedTime: string;
  customAnswers: { question: string; answer: string }[];
  status: "confirmed" | "cancelled";
  createdAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    meetingId: {
      type: Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
    },
    guestName: {
      type: String,
      required: true,
      trim: true,
    },
    guestEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    selectedDate: {
      type: String,
      required: true,
    },
    selectedTime: {
      type: String,
      required: true,
    },
    customAnswers: [
      {
        question: { type: String },
        answer: { type: String },
      },
    ],
    status: {
      type: String,
      enum: ["confirmed", "cancelled"],
      default: "confirmed",
    },
  },
  { timestamps: true }
);

export const Booking = mongoose.model<IBooking>("Booking", bookingSchema);