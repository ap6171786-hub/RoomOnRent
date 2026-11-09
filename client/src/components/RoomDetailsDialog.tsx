import { useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Bath, BedDouble, Check, MapPin, ShieldCheck, Users, X } from 'lucide-react';
import { fetchRoom, requestBooking } from '../lib/api';

type Props = { roomId: string; signedIn: boolean; onClose: () => void; onSignIn: () => void };
const rupees = (value: number) => `₹${value.toLocaleString('en-IN')}`;

function RoomDetailsDialog({ roomId, signedIn, onClose, onSignIn }: Props) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const roomQuery = useQuery({ queryKey: ['room', roomId], queryFn: () => fetchRoom(roomId) });
  const bookingMutation = useMutation({ mutationFn: requestBooking });

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signedIn) {
      onSignIn();
      return;
    }
    if (!startDate || !endDate || endDate <= startDate) {
      setFormError('Choose an end date after your move-in date.');
      return;
    }
    setFormError('');
    bookingMutation.mutate({ roomId, startDate, endDate, message });
  }

  const room = roomQuery.data;
  const today = new Date().toISOString().slice(0, 10);
  const availableFrom = room?.availableFrom.slice(0, 10) ?? today;
  const earliestMoveIn = availableFrom > today ? availableFrom : today;
  return <div className="fixed inset-0 z-40 overflow-y-auto bg-[#211333]/55 p-3 backdrop-blur-sm sm:grid sm:place-items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="room-dialog-title" className="relative mx-auto my-2 w-full max-w-[820px] overflow-hidden rounded-[26px] bg-white shadow-2xl dark:bg-[#211b2c] sm:my-0">
      <button onClick={onClose} aria-label="Close room details" className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-ink shadow dark:bg-[#211b2c] dark:text-white"><X size={19} /></button>
      {roomQuery.isLoading ? <div className="grid min-h-[420px] place-items-center text-sm text-muted">Loading room details…</div>
        : roomQuery.isError || !room ? <div className="grid min-h-[420px] place-items-center px-6 text-center"><div><p className="font-bold">{roomQuery.error instanceof Error ? roomQuery.error.message : 'Room details are unavailable.'}</p><button onClick={onClose} className="mt-4 text-sm font-bold text-brand-700">Back to search</button></div></div>
          : <div className="grid md:grid-cols-[1.05fr_.95fr]">
            <div className="relative min-h-[260px] bg-brand-50 dark:bg-white/5 md:min-h-full">{room.images[0] && <img src={room.images[0]} alt={room.title} className="absolute inset-0 h-full w-full object-cover" />}<div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" /><div className="absolute bottom-5 left-5 right-5 text-white"><span className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold backdrop-blur">{room.roomType}</span><p className="mt-3 flex items-center gap-1.5 text-sm font-semibold"><MapPin size={15} />{room.locality}, {room.city}</p></div></div>
            <div className="p-6 sm:p-8">
              <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-emerald-700 dark:text-emerald-400"><ShieldCheck size={15} /> Owner-direct stay</p>
              <h2 id="room-dialog-title" className="mt-2 text-[23px] font-extrabold leading-tight">{room.title}</h2>
              <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-muted dark:text-white/60"><span className="flex items-center gap-1.5"><BedDouble size={15} />{room.furnishing}</span><span className="flex items-center gap-1.5"><Bath size={15} />{room.propertyType}</span><span className="flex items-center gap-1.5"><Users size={15} />Up to {room.maxOccupants}</span><span>Available from {new Date(room.availableFrom).toLocaleDateString('en-IN')}</span></div>
              <p className="mt-5 text-sm leading-6 text-muted dark:text-white/65">{room.description}</p>
              <div className="mt-4 flex items-end justify-between border-y border-line py-4 dark:border-white/10"><div><span className="text-2xl font-extrabold">{rupees(room.rent)}</span><span className="ml-1 text-xs text-muted">/ month</span></div><p className="text-right text-xs text-muted dark:text-white/55">Deposit<br /><b className="mt-1 inline-block text-sm text-ink dark:text-white">{rupees(room.deposit)}</b></p></div>
              <div className="mt-4"><h3 className="text-sm font-extrabold">What this place offers</h3><div className="mt-2 flex flex-wrap gap-2">{room.amenities.map((amenity) => <span key={amenity} className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-900 dark:bg-white/5 dark:text-white/75">{amenity}</span>)}</div></div>
              {room.rules.length > 0 && <div className="mt-4"><h3 className="text-sm font-extrabold">House rules</h3><ul className="mt-2 grid gap-1.5 text-xs text-muted dark:text-white/60">{room.rules.map((rule) => <li key={rule} className="flex gap-2"><Check size={14} className="shrink-0 text-brand-600" />{rule}</li>)}</ul></div>}
              <form onSubmit={(event) => void submitBooking(event)} className="mt-5 rounded-2xl bg-[#f8f7fc] p-4 dark:bg-white/[0.04]">
                <h3 className="text-sm font-extrabold">Request a stay</h3>
                <div className="mt-3 grid grid-cols-2 gap-2"><label className="grid gap-1 text-[11px] font-bold text-muted">Move-in date<input required type="date" min={earliestMoveIn} value={startDate} onChange={(event) => setStartDate(event.target.value)} className="min-w-0 rounded-lg border border-line bg-white px-2 py-2 text-xs text-ink dark:border-white/10 dark:bg-[#211b2c] dark:text-white" /></label><label className="grid gap-1 text-[11px] font-bold text-muted">End date<input required type="date" min={startDate || earliestMoveIn} value={endDate} onChange={(event) => setEndDate(event.target.value)} className="min-w-0 rounded-lg border border-line bg-white px-2 py-2 text-xs text-ink dark:border-white/10 dark:bg-[#211b2c] dark:text-white" /></label></div>
                <label className="mt-3 grid gap-1 text-[11px] font-bold text-muted">Message to owner (optional)<textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={1000} rows={2} placeholder="Share a little about your move…" className="resize-none rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink outline-none dark:border-white/10 dark:bg-[#211b2c] dark:text-white" /></label>
                {(formError || bookingMutation.isError) && <p role="alert" className="mt-2 text-xs font-semibold text-red-600">{formError || bookingMutation.error?.message}</p>}
                {bookingMutation.isSuccess && <p role="status" className="mt-2 text-xs font-semibold text-emerald-700">Your request was sent to the owner.</p>}
                <button disabled={bookingMutation.isPending || bookingMutation.isSuccess} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-brand-700 py-3 text-sm font-extrabold text-white disabled:opacity-60">{bookingMutation.isPending ? 'Sending request…' : bookingMutation.isSuccess ? 'Request sent' : signedIn ? 'Request this room' : 'Sign in to request'}<ArrowLeft className="rotate-180" size={16} /></button>
              </form>
              <p className="mt-3 text-center text-[10px] leading-4 text-muted dark:text-white/45">No payment is collected. Booking requests are subject to owner approval.</p>
            </div>
          </div>}
    </section>
  </div>;
}

export default RoomDetailsDialog;
