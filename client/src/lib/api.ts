import { z } from 'zod';
import { authenticatedFetch, getAccessToken } from './auth';

const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

export const roomSchema = z.object({
  _id: z.string(),
  address: z.string().optional(),
  title: z.string(),
  description: z.string(),
  rent: z.number(),
  deposit: z.number(),
  roomType: z.string(),
  propertyType: z.string(),
  city: z.string(),
  locality: z.string(),
  images: z.array(z.string()),
  amenities: z.array(z.string()),
  furnishing: z.string(),
  availableFrom: z.string(),
  ownerName: z.string(),
  status: z.string(),
  rules: z.array(z.string()).default([]),
  maxOccupants: z.number().default(1),
});

export type Room = z.infer<typeof roomSchema>;
export type RoomSearch = {
  city?: string;
  roomType?: string;
  q?: string;
  minRent?: number;
  maxRent?: number;
  page?: number;
};

const roomsResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(roomSchema),
  pagination: z.object({ page: z.number(), pages: z.number(), total: z.number() }),
});

export async function fetchRooms(filters: RoomSearch, signal?: AbortSignal) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const response = await fetch(`${apiBase}/rooms?${params.toString()}`, { signal });
  if (!response.ok) throw new Error('Rooms could not be loaded. Please try again.');
  const payload: unknown = await response.json();
  return roomsResponseSchema.parse(payload);
}

export async function fetchFavouriteIds() {
  const token = getAccessToken();
  if (!token) return [];
  const response = await authenticatedFetch(`${apiBase}/favourites`);
  if (!response.ok) throw new Error('Saved rooms could not be loaded.');
  const payload: unknown = await response.json();
  const parsed = z.object({
    success: z.literal(true),
    data: z.array(z.object({ roomId: z.union([z.string(), z.object({ _id: z.string() })]) })),
  }).parse(payload);
  return parsed.data.map(({ roomId }) => typeof roomId === 'string' ? roomId : roomId._id);
}

export async function updateFavourite(roomId: string, saved: boolean) {
  const token = getAccessToken();
  if (!token) throw new Error('Sign in to save rooms to your account.');
  const response = await authenticatedFetch(`${apiBase}/favourites${saved ? '' : `/${roomId}`}`, {
    method: saved ? 'POST' : 'DELETE',
    headers: { ...(saved ? { 'Content-Type': 'application/json' } : {}) },
    body: saved ? JSON.stringify({ roomId }) : undefined,
  });
  if (!response.ok) throw new Error('Your saved rooms could not be updated. Please try again.');
}

export async function fetchRoom(id: string) {
  const response = await fetch(`${apiBase}/rooms/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error(response.status === 404 ? 'This room is no longer available.' : 'Room details could not be loaded.');
  const payload: unknown = await response.json();
  return z.object({ success: z.literal(true), data: roomSchema }).parse(payload).data;
}

export async function requestBooking(input: { roomId: string; startDate: string; endDate: string; message: string }) {
  const token = getAccessToken();
  if (!token) throw new Error('Sign in to request this room.');
  const response = await authenticatedFetch(`${apiBase}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const parsedError = z.object({ message: z.string().optional() }).safeParse(payload);
    throw new Error(parsedError.data?.message ?? 'Booking request could not be sent.');
  }
  return z.object({ success: z.literal(true), message: z.string() }).parse(payload);
}
