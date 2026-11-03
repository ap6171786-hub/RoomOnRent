import { Router } from "express";
import { requireAuth, requireRole } from "./auth.js";
import { Booking, Room, User } from "./models.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole("ADMIN"));

adminRouter.get("/stats", async (_request, response, next) => {
  try {
    const [users, owners, tenants, listings, bookings] = await Promise.all([
      User.countDocuments({ active: true }),
      User.countDocuments({ active: true, role: "OWNER" }),
      User.countDocuments({ active: true, role: "TENANT" }),
      Room.countDocuments(),
      Booking.countDocuments(),
    ]);
    response.json({ stats: { users, owners, tenants, listings, bookings } });
  } catch (error) {
    next(error);
  }
});
