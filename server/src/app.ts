import express, { type ErrorRequestHandler } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { authRouter } from "./auth.js";
import { adminRouter } from "./admin.js";
import { bookingRouter } from "./bookings.js";
import { connectCache } from "./cache.js";
import { config } from "./config.js";
import { roomRouter } from "./rooms.js";

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: config.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/api/v1/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));
app.get("/health", (_request, response) => response.json({ status: "ok", database: mongoose.connection.readyState === 1 ? "connected" : "disconnected" }));
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/rooms", roomRouter);
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/admin", adminRouter);
app.use((_request, response) => response.status(404).json({ error: "Route not found" }));

const errors: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({ error: "Invalid request", details: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) });
    return;
  }
  if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) {
    response.status(400).json({ error: "Invalid data" });
    return;
  }
  console.error("Request failed", error);
  response.status(500).json({ error: "An unexpected server error occurred" });
};
app.use(errors);

async function start() {
  await connectCache();
  await mongoose.connect(config.MONGO_URI);
  app.listen(config.PORT, () => console.log(`RoomOnRent API listening on http://localhost:${config.PORT}`));
}

start().catch((error: unknown) => {
  console.error("Unable to start RoomOnRent API", error);
  process.exitCode = 1;
});
