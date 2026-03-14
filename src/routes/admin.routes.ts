import { Router, Request, Response } from "express";
import { protect, restrictTo } from "../middlewares/auth.middleware";
import { User } from "../models/user.model";
import { sendSuccess, sendError } from "../utils/response.utils";

const router = Router();

// All admin routes are protected
router.use(protect, restrictTo("admin"));

// Get all users
router.get("/users", async (_req: Request, res: Response) => {
  try {
    const users = await User.find().select("-refreshToken");
    sendSuccess(res, "Users fetched successfully.", { users, total: users.length });
  } catch {
    sendError(res, "Failed to fetch users.", 500);
  }
});

// Get single user
router.get("/users/:id", async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select("-refreshToken");
    if (!user) {
      sendError(res, "User not found.", 404);
      return;
    }
    sendSuccess(res, "User fetched successfully.", { user });
  } catch {
    sendError(res, "Failed to fetch user.", 500);
  }
});

// Update user role
router.patch("/users/:id/role", async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    if (!["user", "admin"].includes(role)) {
      sendError(res, "Invalid role. Use 'user' or 'admin'.", 400);
      return;
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) {
      sendError(res, "User not found.", 404);
      return;
    }
    sendSuccess(res, "User role updated.", { user });
  } catch {
    sendError(res, "Failed to update role.", 500);
  }
});

// Delete user
router.delete("/users/:id", async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      sendError(res, "User not found.", 404);
      return;
    }
    sendSuccess(res, "User deleted successfully.");
  } catch {
    sendError(res, "Failed to delete user.", 500);
  }
});

export default router;
