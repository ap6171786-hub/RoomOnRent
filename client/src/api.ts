const apiBase = import.meta.env.VITE_API_URL ?? "/api/v1";
let refreshing: Promise<boolean> | null = null;

export type Account = {
  id: string;
  name: string;
  email: string;
  role: "TENANT" | "OWNER" | "ADMIN";
};

export type Room = {
  _id: string;
  title: string;
  description: string;
  city: string;
  address: string;
  type: "Single Room" | "Double Sharing" | "Triple Sharing" | "PG" | "1BHK" | "2BHK";
  rent: number;
  deposit: number;
  images: string[];
  amenities: string[];
  furnished: boolean;
  available: boolean;
  verifiedOwner: boolean;
  owner: string | { _id: string; name: string };
};

export type Booking = {
  _id: string;
  room: Room;
  tenant: string | { name: string; email: string };
  moveInDate: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "CONFIRMED" | "COMPLETED";
  createdAt: string;
};
export type AdminStats = { users: number; owners: number; tenants: number; listings: number; bookings: number };

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}, canRefresh = true): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const canRefreshPath = path !== "/auth/login" && path !== "/auth/register" && path !== "/auth/refresh" && path !== "/auth/logout";
  if (response.status === 401 && canRefresh && canRefreshPath) {
    refreshing ??= fetch(`${apiBase}/auth/refresh`, { method: "POST", credentials: "include" })
      .then((refreshResponse) => refreshResponse.ok)
      .finally(() => { refreshing = null; });
    if (await refreshing) return request<T>(path, options, false);
  }

  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string"
      ? payload.error
      : `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }
  return payload as T;
}

export const api = {
  listRooms(query = "") {
    return request<{ items: Room[]; page: number; pages: number; total: number }>(`/rooms${query ? `?${query}` : ""}`);
  },
  myRooms() {
    return request<{ items: Room[] }>("/rooms/mine");
  },
  createRoom(input: Omit<Room, "_id" | "owner" | "available" | "verifiedOwner">) {
    return request<{ room: Room }>("/rooms", { method: "POST", body: JSON.stringify(input) });
  },
  deleteRoom(id: string) {
    return request<{ success: boolean }>(`/rooms/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  room(id: string) {
    return request<{ room: Room }>(`/rooms/${encodeURIComponent(id)}`);
  },
  register(input: { name: string; email: string; password: string; role: "TENANT" | "OWNER" }) {
    return request<{ user: Account }>("/auth/register", { method: "POST", body: JSON.stringify(input) });
  },
  login(input: { email: string; password: string }) {
    return request<{ user: Account }>("/auth/login", { method: "POST", body: JSON.stringify(input) });
  },
  me() {
    return request<{ user: Account }>("/auth/me");
  },
  logout() {
    return request<{ success: boolean }>("/auth/logout", { method: "POST" }, false);
  },
  createBooking(input: { roomId: string; moveInDate: string }) {
    return request<{ booking: Booking }>("/bookings", { method: "POST", body: JSON.stringify(input) });
  },
  myBookings() {
    return request<{ items: Booking[] }>("/bookings/mine");
  },
  ownerBookings() {
    return request<{ items: Booking[] }>("/bookings/owner");
  },
  updateBooking(id: string, status: "ACCEPTED" | "REJECTED") {
    return request<{ booking: Booking }>(`/bookings/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
  cancelBooking(id: string) {
    return request<{ booking: Booking }>(`/bookings/${encodeURIComponent(id)}/cancel`, { method: "PATCH" });
  },
  adminStats() {
    return request<{ stats: AdminStats }>("/admin/stats");
  },
};
