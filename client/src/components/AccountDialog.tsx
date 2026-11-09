import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Building2, CalendarDays, Check, ChevronLeft, CirclePlus, Pencil, Trash2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { archiveListing, emptyListing, fetchBookings, fetchMyRooms, fetchNotifications, listingSchema, markNotificationRead, saveListing, updateBooking, type AccountBooking } from '../lib/account';
import type { Room } from '../lib/api';

type Props = { onClose: () => void };
type Tab = 'listings' | 'owner-bookings' | 'my-bookings' | 'notifications';
type ListingFormInput = z.input<typeof listingSchema>;
type ListingData = z.output<typeof listingSchema>;

function AccountDialog({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>('listings');
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();
  const roomsQuery = useQuery({ queryKey: ['my-rooms'], queryFn: fetchMyRooms, enabled: tab === 'listings' });
  const ownerBookingsQuery = useQuery({ queryKey: ['bookings', 'owner'], queryFn: () => fetchBookings('owner'), enabled: tab === 'owner-bookings' });
  const renterBookingsQuery = useQuery({ queryKey: ['bookings', 'mine'], queryFn: () => fetchBookings('mine'), enabled: tab === 'my-bookings' });
  const notificationsQuery = useQuery({ queryKey: ['notifications'], queryFn: fetchNotifications, enabled: tab === 'notifications' });

  const listingMutation = useMutation({
    mutationFn: ({ values, id }: { values: ListingData; id?: string }) => saveListing(values, id),
    onSuccess: async () => {
      setCreating(false);
      setEditRoom(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-rooms'] }),
        queryClient.invalidateQueries({ queryKey: ['rooms'] }),
      ]);
    },
  });
  const archiveMutation = useMutation({
    mutationFn: archiveListing,
    onSuccess: async () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['my-rooms'] }),
      queryClient.invalidateQueries({ queryKey: ['rooms'] }),
    ]),
  });
  const bookingMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'reject' | 'cancel' }) => updateBooking(id, action),
    onSuccess: async () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ['bookings'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      queryClient.invalidateQueries({ queryKey: ['rooms'] }),
    ]),
  });
  const notificationMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const tabs: { id: Tab; label: string; icon: typeof Building2 }[] = [
    { id: 'listings', label: 'My listings', icon: Building2 },
    { id: 'owner-bookings', label: 'Requests', icon: CalendarDays },
    { id: 'my-bookings', label: 'My bookings', icon: Check },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return <div className="fixed inset-0 z-40 overflow-y-auto bg-[#211333]/55 p-3 backdrop-blur-sm sm:grid sm:place-items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="account-dialog-title" className="relative mx-auto my-2 w-full max-w-[980px] overflow-hidden rounded-[26px] bg-white shadow-2xl dark:bg-[#211b2c] sm:my-0">
      <header className="flex items-center justify-between border-b border-line px-5 py-5 dark:border-white/10 sm:px-7">
        <div><p className="text-xs font-extrabold uppercase tracking-wide text-brand-700 dark:text-brand-300">Your RoomOnRent</p><h2 id="account-dialog-title" className="mt-1 text-xl font-extrabold">Account dashboard</h2></div>
        <button onClick={onClose} aria-label="Close dashboard" className="grid h-10 w-10 place-items-center rounded-full hover:bg-brand-50 dark:hover:bg-white/10"><X size={19} /></button>
      </header>
      <div className="grid min-h-[520px] md:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto border-b border-line p-3 dark:border-white/10 md:flex-col md:border-b-0 md:border-r md:p-4">
          {tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setTab(id); setCreating(false); setEditRoom(null); }} className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${tab === id ? 'bg-brand-50 text-brand-800 dark:bg-brand-700/20 dark:text-brand-300' : 'text-muted hover:bg-brand-50/60 dark:text-white/60 dark:hover:bg-white/5'}`}><Icon size={17} />{label}{id === 'notifications' && notificationsQuery.data?.unreadCount ? <span className="ml-auto rounded-full bg-brand-700 px-2 py-0.5 text-[10px] text-white">{notificationsQuery.data.unreadCount}</span> : null}</button>)}
        </nav>
        <main className="min-w-0 p-4 sm:p-6">
          {tab === 'listings' && <section>
            <div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-extrabold">Your spaces</h3><p className="mt-1 text-xs text-muted dark:text-white/55">Manage the homes you’ve listed.</p></div><button onClick={() => { setCreating(true); setEditRoom(null); }} className="flex items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2.5 text-xs font-extrabold text-white"><CirclePlus size={15} />Add a room</button></div>
            {creating || editRoom ? <ListingEditor room={editRoom} busy={listingMutation.isPending} error={listingMutation.error?.message} onCancel={() => { setCreating(false); setEditRoom(null); }} onSave={(values) => listingMutation.mutate({ values, id: editRoom?._id })} />
              : <QueryState loading={roomsQuery.isLoading} error={roomsQuery.error?.message} empty={!roomsQuery.isLoading && (roomsQuery.data?.length ?? 0) === 0} emptyText="You haven’t listed a room yet. Add one to get started.">
                <div className="mt-5 grid gap-3">{roomsQuery.data?.map((room) => <article key={room._id} className="flex gap-3 rounded-2xl border border-line p-3 dark:border-white/10"><img src={room.images[0]} alt="" className="h-20 w-24 shrink-0 rounded-xl bg-brand-50 object-cover dark:bg-white/5" /><div className="min-w-0 flex-1"><h4 className="truncate text-sm font-extrabold">{room.title}</h4><p className="mt-1 text-xs text-muted dark:text-white/55">{room.locality}, {room.city} · ₹{room.rent.toLocaleString('en-IN')}/mo</p><div className="mt-2 flex gap-2"><button onClick={() => { setEditRoom(room); setCreating(false); }} className="flex items-center gap-1 text-xs font-bold text-brand-700 dark:text-brand-300"><Pencil size={13} />Edit</button><button onClick={() => { if (window.confirm(`Archive “${room.title}”?`)) archiveMutation.mutate(room._id); }} className="flex items-center gap-1 text-xs font-bold text-red-600"><Trash2 size={13} />Archive</button></div></div></article>)}</div>
              </QueryState>}
            {archiveMutation.error && <ErrorText message={archiveMutation.error.message} />}
          </section>}
          {tab === 'owner-bookings' && <section><h3 className="text-lg font-extrabold">Booking requests</h3><p className="mt-1 text-xs text-muted dark:text-white/55">Review requests for your listed homes.</p><QueryState loading={ownerBookingsQuery.isLoading} error={ownerBookingsQuery.error?.message} empty={!ownerBookingsQuery.isLoading && (ownerBookingsQuery.data?.length ?? 0) === 0} emptyText="No booking requests yet."><BookingList bookings={ownerBookingsQuery.data ?? []} mode="owner" busy={bookingMutation.isPending} onAction={(id, action) => bookingMutation.mutate({ id, action })} /></QueryState>{bookingMutation.error && <ErrorText message={bookingMutation.error.message} />}</section>}
          {tab === 'my-bookings' && <section><h3 className="text-lg font-extrabold">My booking requests</h3><p className="mt-1 text-xs text-muted dark:text-white/55">Keep track of places you’ve asked to stay.</p><QueryState loading={renterBookingsQuery.isLoading} error={renterBookingsQuery.error?.message} empty={!renterBookingsQuery.isLoading && (renterBookingsQuery.data?.length ?? 0) === 0} emptyText="You haven’t requested a stay yet."><BookingList bookings={renterBookingsQuery.data ?? []} mode="renter" busy={bookingMutation.isPending} onAction={(id, action) => bookingMutation.mutate({ id, action })} /></QueryState>{bookingMutation.error && <ErrorText message={bookingMutation.error.message} />}</section>}
          {tab === 'notifications' && <section><h3 className="text-lg font-extrabold">Notifications</h3><p className="mt-1 text-xs text-muted dark:text-white/55">Booking updates and account activity.</p><QueryState loading={notificationsQuery.isLoading} error={notificationsQuery.error?.message} empty={!notificationsQuery.isLoading && (notificationsQuery.data?.data.length ?? 0) === 0} emptyText="You’re all caught up."><div className="mt-5 grid gap-2">{notificationsQuery.data?.data.map((notification) => <article key={notification._id} className="flex items-start gap-3 rounded-xl border border-line p-3 dark:border-white/10"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${notification.readAt ? 'bg-line dark:bg-white/20' : 'bg-brand-600'}`} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{notification.message}</p><p className="mt-1 text-[11px] text-muted dark:text-white/50">{new Date(notification.createdAt).toLocaleString('en-IN')}</p></div>{!notification.readAt && <button onClick={() => notificationMutation.mutate(notification._id)} aria-label="Mark notification as read" className="rounded-full p-2 text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-white/5"><Check size={16} /></button>}</article>)}</div></QueryState>{notificationMutation.error && <ErrorText message={notificationMutation.error.message} />}</section>}
        </main>
      </div>
    </section>
  </div>;
}

function ListingEditor({ room, busy, error, onCancel, onSave }: {
  room: Room | null;
  busy: boolean;
  error?: string;
  onCancel: () => void;
  onSave: (values: ListingData) => void;
}) {
  const form = useForm<ListingFormInput, unknown, ListingData>({
    resolver: zodResolver(listingSchema),
    defaultValues: room ? {
      ...emptyListing,
      title: room.title,
      description: room.description,
      rent: room.rent,
      deposit: room.deposit,
      roomType: room.roomType as ListingFormInput['roomType'],
      propertyType: room.propertyType as ListingFormInput['propertyType'],
      city: room.city,
      locality: room.locality,
      address: room.address ?? `${room.locality}, ${room.city}`,
      imageUrls: room.images.join(', '),
      amenitiesText: room.amenities.join(', '),
      furnishing: room.furnishing as ListingFormInput['furnishing'],
      availableFrom: room.availableFrom.slice(0, 10),
      maxOccupants: room.maxOccupants,
      rulesText: room.rules.join('\n'),
    } : emptyListing,
  });
  const input = (label: string, name: keyof ListingFormInput, props: { type?: string; required?: boolean; rows?: number } = {}) => <label className="grid gap-1 text-[11px] font-bold text-muted">{label}{props.rows ? <textarea rows={props.rows} {...form.register(name)} className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-[#211b2c] dark:text-white" /> : <input type={props.type ?? 'text'} required={props.required} {...form.register(name, props.type === 'number' ? { valueAsNumber: true } : {})} className="min-w-0 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-[#211b2c] dark:text-white" />}{form.formState.errors[name]?.message && <span className="font-medium text-red-600">{String(form.formState.errors[name]?.message)}</span>}</label>;

  return <form className="mt-5 rounded-2xl border border-line p-4 dark:border-white/10" onSubmit={form.handleSubmit(onSave)}>
    <div className="mb-4 flex items-center justify-between"><h4 className="text-sm font-extrabold">{room ? 'Edit listing' : 'New listing'}</h4><button type="button" onClick={onCancel} className="flex items-center gap-1 text-xs font-bold text-muted"><ChevronLeft size={14} />Back</button></div>
    <div className="grid gap-3 sm:grid-cols-2">
      {input('Listing title', 'title', { required: true })}
      <label className="grid gap-1 text-[11px] font-bold text-muted">Room type<select {...form.register('roomType')} className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-[#211b2c] dark:text-white">{['Single Room', 'Double Sharing', 'Triple Sharing', 'PG', '1 BHK', '2 BHK', '3 BHK', 'Flat/Apartment'].map((value) => <option key={value}>{value}</option>)}</select></label>
      {input('Description (at least 20 characters)', 'description', { rows: 3 })}
      <div className="grid grid-cols-2 gap-2">{input('Monthly rent (₹)', 'rent', { type: 'number', required: true })}{input('Deposit (₹)', 'deposit', { type: 'number', required: true })}</div>
      {input('City', 'city', { required: true })}{input('Locality', 'locality', { required: true })}
      {input('Full address (private)', 'address', { required: true })}
      <label className="grid gap-1 text-[11px] font-bold text-muted">Property type<select {...form.register('propertyType')} className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-[#211b2c] dark:text-white">{['Apartment', 'Independent House', 'PG', 'Villa', 'Studio'].map((value) => <option key={value}>{value}</option>)}</select></label>
      {input('Image URLs (comma-separated)', 'imageUrls')}
      {input('Amenities (comma-separated)', 'amenitiesText')}
      <label className="grid gap-1 text-[11px] font-bold text-muted">Furnishing<select {...form.register('furnishing')} className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink dark:border-white/10 dark:bg-[#211b2c] dark:text-white">{['Furnished', 'Semi-furnished', 'Unfurnished'].map((value) => <option key={value}>{value}</option>)}</select></label>
      {input('Available from', 'availableFrom', { type: 'date', required: true })}
      {input('Maximum occupants', 'maxOccupants', { type: 'number', required: true })}
      {input('House rules (one per line)', 'rulesText', { rows: 2 })}
    </div>
    {error && <ErrorText message={error} />}
    <button disabled={busy} className="mt-4 rounded-full bg-brand-700 px-5 py-2.5 text-xs font-extrabold text-white disabled:opacity-60">{busy ? 'Saving…' : room ? 'Save changes' : 'Publish listing'}</button>
  </form>;
}

function BookingList({ bookings, mode, busy, onAction }: { bookings: AccountBooking[]; mode: 'owner' | 'renter'; busy: boolean; onAction: (id: string, action: 'accept' | 'reject' | 'cancel') => void }) {
  return <div className="mt-5 grid gap-3">{bookings.map((booking) => {
    const room = typeof booking.roomId === 'string' ? null : booking.roomId;
    return <article key={booking._id} className="rounded-2xl border border-line p-4 dark:border-white/10"><div className="flex items-start justify-between gap-3"><div><h4 className="text-sm font-extrabold">{room?.title ?? 'Room listing'}</h4><p className="mt-1 text-xs text-muted dark:text-white/55">{room ? `${room.locality}, ${room.city}` : ''}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold capitalize ${booking.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' : booking.status === 'rejected' || booking.status === 'cancelled' ? 'bg-gray-100 text-gray-600' : 'bg-amber-50 text-amber-700'}`}>{booking.status}</span></div><p className="mt-3 text-xs text-muted dark:text-white/60">{new Date(booking.startDate).toLocaleDateString('en-IN')} – {new Date(booking.endDate).toLocaleDateString('en-IN')}{room ? ` · ₹${room.rent.toLocaleString('en-IN')}/mo` : ''}</p>{booking.message && <p className="mt-2 rounded-lg bg-[#f8f7fc] p-2.5 text-xs dark:bg-white/5">{booking.message}</p>}{booking.status === 'pending' && <div className="mt-3 flex gap-2">{mode === 'owner' ? <><button disabled={busy} onClick={() => onAction(booking._id, 'accept')} className="rounded-full bg-brand-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-60">Accept</button><button disabled={busy} onClick={() => onAction(booking._id, 'reject')} className="rounded-full border border-line px-4 py-2 text-xs font-bold dark:border-white/10">Decline</button></> : <button disabled={busy} onClick={() => onAction(booking._id, 'cancel')} className="rounded-full border border-line px-4 py-2 text-xs font-bold dark:border-white/10">Cancel request</button>}</div>}{booking.status === 'accepted' && mode === 'renter' && <button disabled={busy} onClick={() => onAction(booking._id, 'cancel')} className="mt-3 rounded-full border border-line px-4 py-2 text-xs font-bold dark:border-white/10">Cancel booking</button>}</article>;
  })}</div>;
}

function QueryState({ loading, error, empty, emptyText, children }: { loading: boolean; error?: string; empty: boolean; emptyText: string; children: React.ReactNode }) {
  if (loading) return <p className="mt-6 text-sm text-muted">Loading your information…</p>;
  if (error) return <ErrorText message={error} />;
  if (empty) return <p className="mt-6 rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted dark:border-white/10 dark:text-white/55">{emptyText}</p>;
  return <>{children}</>;
}

function ErrorText({ message }: { message: string }) {
  return <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">{message}</p>;
}

export default AccountDialog;
