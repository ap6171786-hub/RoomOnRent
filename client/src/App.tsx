import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownUp, ArrowRight, Bath, BedDouble, Bookmark, Check, ChevronDown, Heart, MapPin, Menu, Search, ShieldCheck, SlidersHorizontal, Sparkles, Sun, Users, X } from 'lucide-react';
import AccountDialog from './components/AccountDialog';
import AuthDialog from './components/AuthDialog';
import RoomDetailsDialog from './components/RoomDetailsDialog';
import { logout, refreshSession, type AuthUser } from './lib/auth';
import { fetchFavouriteIds, fetchRooms, updateFavourite, type Room } from './lib/api';

const cities = ['All cities', 'Bengaluru', 'Delhi', 'Gurgaon', 'Kanpur', 'Lucknow', 'Mumbai', 'Noida', 'Prayagraj', 'Varanasi'];
const categories = ['All stays', 'Single Room', 'Double Sharing', 'Triple Sharing', 'PG', '1 BHK', '2 BHK', '3 BHK', 'Flat/Apartment'];
const formatRent = (rent: number) => `₹${rent.toLocaleString('en-IN')}`;

function App() {
  const [city, setCity] = useState('All cities');
  const [roomType, setRoomType] = useState('All stays');
  const [minRent, setMinRent] = useState('');
  const [maxRent, setMaxRent] = useState('');
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('roomonrent-theme') === 'dark');
  const [sortBy, setSortBy] = useState('recommended');
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [favoriteError, setFavoriteError] = useState('');
  const [authActionError, setAuthActionError] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    let active = true;
    const handleSessionExpired = () => {
      setCurrentUser(null);
      queryClient.removeQueries({ queryKey: ['my-rooms'] });
      queryClient.removeQueries({ queryKey: ['bookings'] });
      queryClient.removeQueries({ queryKey: ['notifications'] });
      queryClient.removeQueries({ queryKey: ['favourites'] });
    };
    window.addEventListener('roomonrent:session-expired', handleSessionExpired);
    refreshSession().then(({ user }) => {
      if (active) setCurrentUser(user);
    }).catch(() => undefined);
    return () => {
      active = false;
      window.removeEventListener('roomonrent:session-expired', handleSessionExpired);
    };
  }, [queryClient]);

  const filters = useMemo(() => ({
    city: city === 'All cities' ? undefined : city,
    roomType: roomType === 'All stays' ? undefined : roomType,
    q: debouncedSearch || undefined,
    minRent: minRent ? Number(minRent) : undefined,
    maxRent: maxRent ? Number(maxRent) : undefined,
    page,
  }), [city, debouncedSearch, maxRent, minRent, page, roomType]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['rooms', filters],
    queryFn: ({ signal }) => fetchRooms(filters, signal),
  });
  const favouritesQuery = useQuery({
    queryKey: ['favourites', currentUser?.id],
    queryFn: fetchFavouriteIds,
    enabled: Boolean(currentUser),
  });
  const favouriteMutation = useMutation({
    mutationFn: ({ roomId, saved }: { roomId: string; saved: boolean }) => updateFavourite(roomId, saved),
    onSuccess: () => {
      setFavoriteError('');
      return queryClient.invalidateQueries({ queryKey: ['favourites', currentUser?.id] });
    },
    onError: (error) => setFavoriteError(error.message),
  });

  const rooms = useMemo(() => {
    if (sortBy === 'rent-low') return [...(data?.data ?? [])].sort((a, b) => a.rent - b.rent);
    if (sortBy === 'rent-high') return [...(data?.data ?? [])].sort((a, b) => b.rent - a.rent);
    return data?.data ?? [];
  }, [data?.data, sortBy]);

  function toggleTheme() {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('roomonrent-theme', next ? 'dark' : 'light');
  }

  function resetFilters() {
    setCity('All cities');
    setRoomType('All stays');
    setMinRent('');
    setMaxRent('');
    setSearchText('');
    setDebouncedSearch('');
    setPage(1);
  }

  function onAuthSuccess(user: AuthUser) {
    queryClient.removeQueries({ queryKey: ['my-rooms'] });
    queryClient.removeQueries({ queryKey: ['bookings'] });
    queryClient.removeQueries({ queryKey: ['notifications'] });
    queryClient.removeQueries({ queryKey: ['favourites'] });
    setCurrentUser(user);
    setAuthMode(null);
  }

  async function onLogout() {
    try {
      await logout();
      setAuthActionError('');
    } catch (error) {
      setAuthActionError(error instanceof Error ? error.message : 'Unable to sign out.');
    } finally {
      setCurrentUser(null);
      queryClient.removeQueries({ queryKey: ['my-rooms'] });
      queryClient.removeQueries({ queryKey: ['bookings'] });
      queryClient.removeQueries({ queryKey: ['notifications'] });
      queryClient.removeQueries({ queryKey: ['favourites'] });
    }
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-[#fbfaff] text-ink transition-colors dark:bg-[#171221] dark:text-white">
        <header className="sticky top-0 z-30 border-b border-line/80 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#171221]/90">
          <div className="mx-auto flex h-[76px] max-w-[1240px] items-center justify-between px-5 lg:px-8">
            <a href="#" className="flex items-center gap-2.5" aria-label="RoomOnRent home">
              <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-brand-700 text-white shadow-lg shadow-brand-700/20"><BedDouble size={22} strokeWidth={2.5} /></span>
              <span className="text-[20px] font-extrabold tracking-[-0.8px]">Room<span className="text-brand-600">On</span>Rent</span>
            </a>
            <nav className="hidden items-center gap-8 text-[14px] font-semibold text-muted dark:text-white/70 md:flex">
              <a className="text-brand-700 dark:text-brand-300" href="#explore">Explore stays</a>
              <a className="transition hover:text-brand-700" href="#how-it-works">How it works</a>
              <a className="transition hover:text-brand-700" href="#owners">List your place</a>
            </nav>
            <div className="hidden items-center gap-3 md:flex">
              <button onClick={toggleTheme} className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-brand-50 dark:text-white/70 dark:hover:bg-white/10" aria-label="Toggle dark mode"><Sun size={19} /></button>
              {currentUser ? <><button onClick={() => setAccountOpen(true)} className="max-w-32 truncate text-sm font-bold">{currentUser.name}</button><button onClick={() => void onLogout()} className="rounded-full border border-line px-4 py-2.5 text-sm font-bold dark:border-white/10">Log out</button></>
                : <><button onClick={() => setAuthMode('login')} className="rounded-full px-4 py-2.5 text-sm font-bold text-ink hover:bg-brand-50 dark:text-white dark:hover:bg-white/10">Log in</button><button onClick={() => setAuthMode('register')} className="rounded-full bg-brand-700 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-700/20 transition hover:bg-brand-800">Sign up</button></>}
              {authActionError && <span role="alert" className="max-w-40 text-xs text-red-600">{authActionError}</span>}
            </div>
            <button onClick={() => setMobileMenu(!mobileMenu)} className="grid h-10 w-10 place-items-center rounded-xl md:hidden" aria-label={mobileMenu ? 'Close menu' : 'Open menu'}>{mobileMenu ? <X /> : <Menu />}</button>
          </div>
          {mobileMenu && <div className="border-t border-line px-5 py-4 dark:border-white/10 md:hidden">
            <div className="grid gap-3 text-sm font-semibold"><a href="#explore" onClick={() => setMobileMenu(false)}>Explore stays</a><a href="#how-it-works" onClick={() => setMobileMenu(false)}>How it works</a><a href="#owners" onClick={() => setMobileMenu(false)}>List your place</a><button onClick={toggleTheme} className="flex items-center gap-2 text-left"><Sun size={17} /> Switch theme</button>{currentUser ? <><button onClick={() => { setAccountOpen(true); setMobileMenu(false); }} className="text-left">My dashboard</button><button onClick={() => void onLogout()} className="text-left">Log out {currentUser.name}</button></> : <div className="flex gap-2"><button onClick={() => { setAuthMode('login'); setMobileMenu(false); }} className="flex-1 rounded-full border border-line px-4 py-2.5 dark:border-white/10">Log in</button><button onClick={() => { setAuthMode('register'); setMobileMenu(false); }} className="flex-1 rounded-full bg-brand-700 px-4 py-2.5 text-white">Sign up</button></div>}</div>
          </div>}
        </header>

        <main>
          <section className="hero-pattern relative overflow-hidden">
            <div className="mx-auto grid max-w-[1240px] items-center gap-10 px-5 pb-12 pt-14 md:pb-16 md:pt-20 lg:grid-cols-[1.06fr_.94fr] lg:px-8 lg:pb-20 lg:pt-24">
              <div className="relative z-10">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white/80 px-3.5 py-2 text-[12px] font-bold text-brand-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-brand-300"><Sparkles size={14} /> A better way to find your next home</div>
                <h1 className="max-w-[620px] text-[44px] font-extrabold leading-[1.08] tracking-[-2.8px] sm:text-[58px] lg:text-[68px]">Find your room.<br /><span className="text-brand-700 dark:text-brand-400">Skip the brokerage.</span></h1>
                <p className="mt-5 max-w-[480px] text-[16px] leading-7 text-muted dark:text-white/65 sm:text-[18px]">Good homes, honest prices, and a direct connection to owners. Your next chapter starts here.</p>
                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] font-semibold text-ink/75 dark:text-white/75"><span className="flex items-center gap-2"><Check size={16} className="text-emerald-600" /> Zero brokerage</span><span className="flex items-center gap-2"><Check size={16} className="text-emerald-600" /> Owner-direct listings</span></div>
              </div>
              <div className="relative mx-auto w-full max-w-[530px] lg:ml-auto">
                <div className="absolute -left-7 top-10 h-24 w-24 rounded-full bg-purple-200/60 blur-2xl dark:bg-brand-700/30" />
                <div className="relative overflow-hidden rounded-[30px] border-[7px] border-white shadow-[0_35px_80px_rgba(70,43,117,.2)] dark:border-white/10">
                  <img className="h-[300px] w-full object-cover sm:h-[390px]" src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85" alt="Bright, welcoming modern living room" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#211333]/55 via-transparent to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between text-white">
                    <div><p className="text-xs font-semibold text-white/75">A place to feel at home</p><p className="mt-1 text-[20px] font-bold">Find your kind of space</p></div>
                    <div className="rounded-2xl bg-white/20 p-3 backdrop-blur-md"><Heart size={20} /></div>
                  </div>
                </div>
                <div className="absolute -bottom-5 -left-3 flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-card dark:bg-[#282137] sm:-left-10">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><ShieldCheck size={22} /></div>
                  <div><p className="text-sm font-extrabold">Owner verified</p><p className="mt-0.5 text-xs text-muted dark:text-white/60">Find with confidence</p></div>
                </div>
              </div>
            </div>
          </section>

          <section id="explore" className="relative z-10 mx-auto -mt-2 max-w-[1240px] px-5 lg:px-8">
            <div className="rounded-[24px] border border-line bg-white p-3 shadow-[0_20px_60px_rgba(49,26,91,.09)] dark:border-white/10 dark:bg-[#211b2c] sm:p-4">
              <form className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_.9fr_.9fr_auto]" onSubmit={(event) => event.preventDefault()}>
                <label className="flex min-w-0 items-center gap-3 rounded-[16px] bg-[#f8f7fc] px-4 py-3 dark:bg-white/[0.05]">
                  <MapPin className="shrink-0 text-brand-600" size={20} /><span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-[1px] text-muted">Where</span><select value={city} onChange={(event) => { setCity(event.target.value); setPage(1); }} className="mt-1 w-full appearance-none bg-transparent text-sm font-bold outline-none"><option>All cities</option>{cities.slice(1).map((name) => <option key={name}>{name}</option>)}</select></span><ChevronDown size={16} className="text-muted" />
                </label>
                <label className="flex min-w-0 items-center gap-3 rounded-[16px] bg-[#f8f7fc] px-4 py-3 dark:bg-white/[0.05]">
                  <BedDouble className="shrink-0 text-brand-600" size={20} /><span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-[1px] text-muted">Stay type</span><select value={roomType} onChange={(event) => { setRoomType(event.target.value); setPage(1); }} className="mt-1 w-full appearance-none bg-transparent text-sm font-bold outline-none">{categories.map((name) => <option key={name}>{name}</option>)}</select></span><ChevronDown size={16} className="text-muted" />
                </label>
                <label className="flex min-w-0 items-center gap-3 rounded-[16px] bg-[#f8f7fc] px-4 py-3 dark:bg-white/[0.05]">
                  <span className="shrink-0 text-lg font-bold text-brand-600">₹</span><span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-[1px] text-muted">Min rent</span><select value={minRent} onChange={(event) => { setMinRent(event.target.value); setPage(1); }} className="mt-1 w-full appearance-none bg-transparent text-sm font-bold outline-none"><option value="">No minimum</option><option value="5000">₹5,000</option><option value="10000">₹10,000</option><option value="20000">₹20,000</option><option value="35000">₹35,000</option></select></span><ChevronDown size={16} className="text-muted" />
                </label>
                <label className="flex min-w-0 items-center gap-3 rounded-[16px] bg-[#f8f7fc] px-4 py-3 dark:bg-white/[0.05]">
                  <span className="shrink-0 text-lg font-bold text-brand-600">₹</span><span className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase tracking-[1px] text-muted">Max rent</span><select value={maxRent} onChange={(event) => { setMaxRent(event.target.value); setPage(1); }} className="mt-1 w-full appearance-none bg-transparent text-sm font-bold outline-none"><option value="">No maximum</option><option value="10000">₹10,000</option><option value="20000">₹20,000</option><option value="35000">₹35,000</option><option value="50000">₹50,000</option></select></span><ChevronDown size={16} className="text-muted" />
                </label>
                <button className="flex items-center justify-center gap-2 rounded-[16px] bg-brand-700 px-7 py-4 text-sm font-bold text-white transition hover:bg-brand-800"><Search size={18} /> Find a room</button>
              </form>
            </div>
          </section>

          <section className="mx-auto max-w-[1240px] px-5 pb-20 pt-16 lg:px-8 lg:pt-20">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div><div className="mb-3 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[1.8px] text-brand-700 dark:text-brand-300"><Sparkles size={14} /> YOUR NEXT PLACE</div><h2 className="text-[30px] font-extrabold tracking-[-1.2px] sm:text-[38px]">Stays worth settling into</h2><p className="mt-2 text-sm text-muted dark:text-white/60">Thoughtful spaces, listed directly by the people who own them.</p></div>
              <label className="flex w-fit items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm font-semibold dark:border-white/10 dark:bg-[#211b2c]"><ArrowDownUp size={16} className="text-muted" /><select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="bg-transparent outline-none"><option value="recommended">Recommended</option><option value="rent-low">Rent: low to high</option><option value="rent-high">Rent: high to low</option></select></label>
            </div>

            <div className="mt-7 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
              {categories.map((category) => <button key={category} onClick={() => { setRoomType(category); setPage(1); }} className={`shrink-0 rounded-full px-4 py-2.5 text-[13px] font-bold transition ${roomType === category ? 'bg-brand-700 text-white shadow-md shadow-brand-700/15' : 'border border-line bg-white text-muted hover:border-brand-200 hover:text-brand-700 dark:border-white/10 dark:bg-[#211b2c] dark:text-white/65'}`}>{category}</button>)}
            </div>

            <div className="mb-5 mt-5 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-muted dark:text-white/60">{data ? <><span className="font-extrabold text-ink dark:text-white">{rooms.length}</span> homes to explore</> : 'Explore owner-listed homes'}</p>
              <div className="flex gap-2">
                <label className="hidden items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#211b2c] sm:flex"><Search size={15} className="text-muted" /><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search locality..." className="w-32 bg-transparent outline-none placeholder:text-muted/70" /></label>
                <button onClick={resetFilters} className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold dark:border-white/10 dark:bg-[#211b2c]"><SlidersHorizontal size={15} /> <span className="hidden sm:inline">Clear filters</span><span className="sm:hidden">Clear</span></button>
              </div>
            </div>

            {favoriteError && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-300">{favoriteError}</p>}
            {isLoading ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <div key={item} className="h-[390px] animate-pulse rounded-[22px] bg-brand-50 dark:bg-white/5" />)}</div>
              : isError ? <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-10 text-center dark:border-red-900/50 dark:bg-red-950/20"><p className="font-bold">We couldn’t load the listings right now.</p><p className="mt-2 text-sm text-muted dark:text-white/60">Check that the API server is running, then try again.</p><button onClick={() => void refetch()} className="mt-4 rounded-full bg-brand-700 px-5 py-2.5 text-sm font-bold text-white">Try again</button></div>
              : rooms.length === 0 ? <div className="rounded-3xl border border-dashed border-line px-6 py-16 text-center dark:border-white/15"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-white/5 dark:text-brand-300"><Search /></div><h3 className="mt-4 text-lg font-bold">No homes found just yet</h3><p className="mt-2 text-sm text-muted dark:text-white/60">Try another city or adjust your filters to see more stays.</p><button onClick={resetFilters} className="mt-5 text-sm font-bold text-brand-700 dark:text-brand-300">Clear all filters</button></div>
              : <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{rooms.map((room) => <RoomCard key={room._id} room={room} saved={favouritesQuery.data?.includes(room._id) ?? false} onOpen={() => setSelectedRoom(room._id)} onSave={() => {
                if (!currentUser) {
                  setAuthMode('login');
                  return;
                }
                favouriteMutation.mutate({ roomId: room._id, saved: !favouritesQuery.data?.includes(room._id) });
              }} />)}</div>}
            {data && data.pagination.pages > 1 && <div className="mt-10 flex items-center justify-center gap-4 text-sm text-muted"><button disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-full border border-line px-4 py-2 font-bold disabled:opacity-40 dark:border-white/10">Previous</button><span>Page {data.pagination.page} of {data.pagination.pages}</span><button disabled={page >= data.pagination.pages} onClick={() => setPage((current) => Math.min(data.pagination.pages, current + 1))} className="rounded-full border border-line px-4 py-2 font-bold disabled:opacity-40 dark:border-white/10">Next</button></div>}
          </section>

          <section id="how-it-works" className="border-y border-line bg-white py-16 dark:border-white/10 dark:bg-[#211b2c]">
            <div className="mx-auto max-w-[1240px] px-5 lg:px-8"><div className="mx-auto max-w-xl text-center"><p className="text-xs font-extrabold uppercase tracking-[1.8px] text-brand-700 dark:text-brand-300">Simple by design</p><h2 className="mt-3 text-[30px] font-extrabold tracking-[-1px]">A better move starts here</h2><p className="mt-3 text-sm leading-6 text-muted dark:text-white/60">Finding a place should feel exciting, not exhausting. We make the important parts easy.</p></div><div className="mt-10 grid gap-5 md:grid-cols-3">{[{ icon: Search, title: 'Find your fit', text: 'Search real places by city, stay type, and budget. Keep the things you love close.' }, { icon: Users, title: 'Talk directly', text: 'Connect with property owners—no middlemen, hidden fees, or brokerage.' }, { icon: Check, title: 'Move with clarity', text: 'See the details upfront and send a booking request when you’re ready.' }].map(({ icon: Icon, title, text }, index) => <article key={title} className="rounded-3xl border border-line bg-[#fbfaff] p-6 dark:border-white/10 dark:bg-white/[0.03]"><div className="flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-700/20 dark:text-brand-300"><Icon size={22} /></span><span className="text-sm font-extrabold text-brand-700/35 dark:text-white/20">0{index + 1}</span></div><h3 className="mt-6 font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted dark:text-white/60">{text}</p></article>)}</div></div>
          </section>

          <section id="owners" className="mx-auto max-w-[1240px] px-5 py-16 lg:px-8"><div className="flex flex-col items-start justify-between gap-6 rounded-[28px] bg-[#26143f] px-7 py-9 text-white sm:px-10 sm:py-11 md:flex-row md:items-center"><div><p className="text-xs font-extrabold uppercase tracking-[1.6px] text-purple-300">For property owners</p><h2 className="mt-3 max-w-lg text-3xl font-extrabold tracking-[-1px]">Your place deserves the right people.</h2><p className="mt-3 max-w-lg text-sm leading-6 text-white/65">List your room for free and connect directly with people looking for a place to call home.</p></div><button onClick={() => currentUser ? setAccountOpen(true) : setAuthMode('register')} className="flex shrink-0 items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-extrabold text-[#321454] transition hover:bg-purple-50">{currentUser ? 'Manage listings' : 'Create your account'} <ArrowRight size={17} /></button></div></section>
        </main>
        <footer className="border-t border-line bg-white dark:border-white/10 dark:bg-[#171221]"><div className="mx-auto flex max-w-[1240px] flex-col gap-5 px-5 py-7 text-sm text-muted dark:text-white/50 sm:flex-row sm:items-center sm:justify-between lg:px-8"><a href="#" className="flex items-center gap-2 font-extrabold text-ink dark:text-white"><span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-700 text-white"><BedDouble size={17} /></span> RoomOnRent</a><p>Find your room. Skip the brokerage.</p><p>© {new Date().getFullYear()} RoomOnRent</p></div></footer>
      </div>
      {authMode && <AuthDialog mode={authMode} onClose={() => setAuthMode(null)} onSuccess={onAuthSuccess} onModeChange={setAuthMode} />}
      {selectedRoom && <RoomDetailsDialog roomId={selectedRoom} signedIn={Boolean(currentUser)} onClose={() => setSelectedRoom(null)} onSignIn={() => setAuthMode('login')} />}
      {accountOpen && <AccountDialog onClose={() => setAccountOpen(false)} />}
    </div>
  );
}

function RoomCard({ room, saved, onSave, onOpen }: { room: Room; saved: boolean; onSave: () => void; onOpen: () => void }) {
  const image = room.images[0] ?? 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=900&q=80';
  return <article className="group overflow-hidden rounded-[22px] border border-line bg-white transition hover:-translate-y-1 hover:shadow-card dark:border-white/10 dark:bg-[#211b2c]">
    <div className="relative h-[225px] overflow-hidden"><img src={image} alt={room.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" /><div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-extrabold text-brand-700 shadow-sm">{room.roomType}</div><button onClick={onSave} aria-label={saved ? 'Remove from saved rooms' : 'Save room'} className={`absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/95 shadow-sm transition ${saved ? 'text-rose-500' : 'text-ink/70 hover:text-rose-500'}`}><Heart size={17} fill={saved ? 'currentColor' : 'none'} /></button>{room.status === 'active' && <div className="absolute bottom-4 left-4 flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white"><Check size={12} /> Available</div>}</div>
    <div className="p-5"><div className="flex items-start justify-between gap-3"><h3 className="line-clamp-1 text-[16px] font-extrabold tracking-[-.2px]">{room.title}</h3><button onClick={onOpen} aria-label="View room details" className="shrink-0 text-muted"><Bookmark size={17} /></button></div><p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-muted dark:text-white/55"><MapPin size={14} className="text-brand-600" />{room.locality}, {room.city}</p><div className="mt-4 flex items-center gap-3 border-y border-line py-3 text-xs text-muted dark:border-white/10 dark:text-white/55"><span className="flex items-center gap-1"><BedDouble size={14} />{room.furnishing}</span><span className="h-3 w-px bg-line dark:bg-white/15" /><span className="flex items-center gap-1"><Bath size={14} />{room.propertyType}</span></div><div className="mt-4 flex items-end justify-between"><div><span className="text-[22px] font-extrabold tracking-[-.8px]">{formatRent(room.rent)}</span><span className="ml-1 text-xs text-muted dark:text-white/50">/ month</span></div><span className="flex items-center gap-1 text-[11px] font-semibold text-muted dark:text-white/50"><Users size={13} /> {room.ownerName}</span></div><p className="mt-1 text-[11px] text-muted dark:text-white/45">Deposit {formatRent(room.deposit)}</p><button onClick={onOpen} className="mt-4 flex w-full items-center justify-between border-t border-line pt-3 text-xs font-extrabold text-brand-700 dark:border-white/10 dark:text-brand-300">View details <ArrowRight size={15} /></button></div>
  </article>;
}

export default App;
