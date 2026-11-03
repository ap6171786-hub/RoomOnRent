import { Router, type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { z } from "zod";
import { config, isProduction } from "./config.js";
import { User } from "./models.js";

export type Role = "TENANT" | "OWNER" | "ADMIN";
export type AuthUser = { id: string; email: string; name: string; role: Role };
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "strict" as const,
  path: "/",
};
const accessCookie = "roomonrent_access";
const refreshCookie = "roomonrent_refresh";
const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  role: z.enum(["TENANT", "OWNER"]).default("TENANT"),
});
const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

function signTokens(user: AuthUser) {
  const access = jwt.sign(user, config.JWT_ACCESS_SECRET, { expiresIn: "15m" });
  const refresh = jwt.sign({ sub: user.id }, config.JWT_REFRESH_SECRET, { expiresIn: "7d" });
  return { access, refresh };
}

function setTokens(response: Response, access: string, refresh: string) {
  response.cookie(accessCookie, access, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
  response.cookie(refreshCookie, refresh, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

function publicUser(user: { _id: { toString(): string }; name: string; email: string; role: Role }): AuthUser {
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
}

function parseToken(token: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtPayload & Partial<AuthUser>;
    if (typeof payload.id !== "string" || typeof payload.email !== "string" || typeof payload.name !== "string") return null;
    if (!["TENANT", "OWNER", "ADMIN"].includes(payload.role ?? "")) return null;
    return { id: payload.id, email: payload.email, name: payload.name, role: payload.role as Role };
  } catch {
    return null;
  }
}

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  const token = request.cookies?.[accessCookie];
  const user = typeof token === "string" ? parseToken(token) : null;
  if (!user) {
    response.status(401).json({ error: "Authentication required" });
    return;
  }
  request.user = user;
  next();
}

export function requireRole(...roles: Role[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.user || !roles.includes(request.user.role)) {
      response.status(403).json({ error: "You do not have permission to perform this action" });
      return;
    }
    next();
  };
}

export const authRouter = Router();

authRouter.post("/register", async (request, response, next) => {
  try {
    const input = registerSchema.parse(request.body);
    const email = input.email.toLowerCase();
    if (await User.exists({ email })) {
      response.status(409).json({ error: "An account with this email already exists" });
      return;
    }
    const created = await User.create({
      name: input.name,
      email,
      passwordHash: await bcrypt.hash(input.password, 12),
      role: input.role,
    });
    const user = publicUser(created);
    const tokens = signTokens(user);
    await User.updateOne({ _id: created._id }, { $set: { refreshTokenHash: await bcrypt.hash(tokens.refresh, 10) } });
    setTokens(response, tokens.access, tokens.refresh);
    response.status(201).json({ user });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === 11000) {
      response.status(409).json({ error: "An account with this email already exists" });
      return;
    }
    next(error);
  }
});

authRouter.post("/login", async (request, response, next) => {
  try {
    const input = loginSchema.parse(request.body);
    const account = await User.findOne({ email: input.email.toLowerCase() }).select("+passwordHash");
    if (!account || !account.active || !(await bcrypt.compare(input.password, account.passwordHash))) {
      response.status(401).json({ error: "Email or password is incorrect" });
      return;
    }
    const user = publicUser(account);
    const tokens = signTokens(user);
    await User.updateOne({ _id: account._id }, { $set: { refreshTokenHash: await bcrypt.hash(tokens.refresh, 10) } });
    setTokens(response, tokens.access, tokens.refresh);
    response.json({ user });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/refresh", async (request, response) => {
  const token = request.cookies?.[refreshCookie];
  if (typeof token !== "string") {
    response.status(401).json({ error: "Refresh session expired" });
    return;
  }
  try {
    const payload = jwt.verify(token, config.JWT_REFRESH_SECRET) as JwtPayload;
    if (typeof payload.sub !== "string") throw new Error("Invalid refresh token");
    const account = await User.findById(payload.sub).select("+refreshTokenHash");
    if (!account?.active || !account.refreshTokenHash || !(await bcrypt.compare(token, account.refreshTokenHash))) {
      response.status(401).json({ error: "Refresh session expired" });
      return;
    }
    const user = publicUser(account);
    const tokens = signTokens(user);
    await User.updateOne({ _id: account._id }, { $set: { refreshTokenHash: await bcrypt.hash(tokens.refresh, 10) } });
    setTokens(response, tokens.access, tokens.refresh);
    response.json({ user });
  } catch {
    response.clearCookie(accessCookie, cookieOptions);
    response.clearCookie(refreshCookie, cookieOptions);
    response.status(401).json({ error: "Refresh session expired" });
  }
});

authRouter.post("/logout", async (request, response, next) => {
  try {
    const token = request.cookies?.[refreshCookie];
    if (typeof token === "string") {
      try {
        const payload = jwt.verify(token, config.JWT_REFRESH_SECRET) as JwtPayload;
        if (typeof payload.sub === "string") await User.updateOne({ _id: payload.sub }, { $unset: { refreshTokenHash: 1 } });
      } catch {
        // Expired refresh tokens are already unusable.
      }
    }
    response.clearCookie(accessCookie, cookieOptions);
    response.clearCookie(refreshCookie, cookieOptions);
    response.json({ success: true });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, (request, response) => response.json({ user: request.user }));
