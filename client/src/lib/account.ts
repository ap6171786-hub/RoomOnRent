import { z } from 'zod';
import { authenticatedFetch, getAccessToken } from './auth';
import { roomSchema, type Room } from './api';

const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1';

async function accountRequest(path: string, init?: RequestInit) {
  const token = getAccessToken();
  if (!token) throw new Error('Your session expired. Please sign in again.');
  const response = await authenticatedFetch(`${apiBase}${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}) },
  });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const parsedError = z.object({ message: z.string().optional() }).safeParse(payload);
    throw new Error(parsedError.data?.message ?? 'This action could not be completed.');
  }
  return payload;
}

export async function fetchMyRooms(): Promise<Room[]> {
  const payload = await accountRequest('/rooms/mine');
  return z.object({ success: z.literal(true), data: z.array(roomSchema) }).parse(payload).data;
}

export const listingSchema = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(3000),
  rent: z.coerce.number().positive().max(1_000_000),
  deposit: z.coerce.number().min(0).max(10_000_000),
  roomType: z.enum(['Single Room', 'Double Sharing', 'Triple Sharing', 'PG', '1 BHK', '2 BHK', '3 BHK', 'Flat/Apartment']),
  propertyType: z.enum(['Apartment', 'Independent House', 'PG', 'Villa', 'Studio']),
  city: z.string().trim().min(2).max(80),
  locality: z.string().trim().min(2).max(100),
  address: z.string().trim().min(4).max(300),
  imageUrls: z.string(),
  amenitiesText: z.string(),
  furnishing: z.enum(['Furnished', 'Semi-furnished', 'Unfurnished']),
  availableFrom: z.string().min(1),
  maxOccupants: z.coerce.number().int().min(1).max(20),
  rulesText: z.string(),
});

export type ListingInput = z.infer<typeof listingSchema>;
export const emptyListing: ListingInput = {
  title: '', description: '', rent: 0, deposit: 0, roomType: 'Single Room', propertyType: 'Apartment',
  city: '', locality: '', address: '', imageUrls: '', amenitiesText: '', furnishing: 'Unfurnished',
  availableFrom: new Date().toISOString().slice(0, 10), maxOccupants: 1, rulesText: '',
};

function toListingPayload(input: ListingInput) {
  return {
    title: input.title,
    description: input.description,
    rent: input.rent,
    deposit: input.deposit,
    roomType: input.roomType,
    propertyType: input.propertyType,
    city: input.city,
    locality: input.locality,
    address: input.address,
    images: input.imageUrls.split(',').map((url) => url.trim()).filter(Boolean),
    amenities: input.amenitiesText.split(',').map((amenity) => amenity.trim()).filter(Boolean),
    furnishing: input.furnishing,
    availableFrom: input.availableFrom,
    maxOccupants: input.maxOccupants,
    rules: input.rulesText.split('\n').map((rule) => rule.trim()).filter(Boolean),
  };
}

export async function saveListing(input: ListingInput, id?: string) {
  const payload = await accountRequest(id ? `/rooms/${encodeURIComponent(id)}` : '/rooms', {
    method: id ? 'PATCH' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toListingPayload(input)),
  });
  return z.object({ success: z.literal(true), data: roomSchema }).parse(payload).data;
}

export async function archiveListing(id: string) {
  await accountRequest(`/rooms/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

const bookingSchema = z.object({
  _id: z.string(),
  status: z.enum(['pending', 'accepted', 'rejected', 'cancelled', 'completed']),
  startDate: z.string(),
  endDate: z.string(),
  message: z.string().default(''),
  roomId: z.union([z.string(), z.object({ title: z.string(), city: z.string(), locality: z.string(), rent: z.number(), images: z.array(z.string()) })]),
});
export type AccountBooking = z.infer<typeof bookingSchema>;

export async function fetchBookings(kind: 'mine' | 'owner') {
  const payload = await accountRequest(`/bookings/${kind}`);
  return z.object({ success: z.literal(true), data: z.array(bookingSchema) }).parse(payload).data;
}

export async function updateBooking(id: string, action: 'accept' | 'reject' | 'cancel') {
  await accountRequest(`/bookings/${encodeURIComponent(id)}/${action}`, { method: 'PATCH' });
}

const notificationSchema = z.object({
  _id: z.string(),
  type: z.string(),
  message: z.string(),
  bookingId: z.string(),
  readAt: z.string().nullable(),
  createdAt: z.string(),
});
export type AccountNotification = z.infer<typeof notificationSchema>;

export async function fetchNotifications() {
  const payload = await accountRequest('/notifications');
  return z.object({ success: z.literal(true), data: z.array(notificationSchema), unreadCount: z.number() }).parse(payload);
}

export async function markNotificationRead(id: string) {
  await accountRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' });
}
