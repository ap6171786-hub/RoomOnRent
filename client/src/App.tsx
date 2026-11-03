import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Bath,
  BedDouble,
  Check,
  ChevronDown,
  Heart,
  Home,
  MapPin,
  Menu,
  Monitor,
  Moon,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { api, type Account, type Booking, type Room } from "./api";

type Theme = "light" | "dark" | "system";
type Page = "Home" | "Explore" | "Details" | "Sign in" | "Owner" | "Tenant" | "Admin" | "List room";
type SearchFilters = { city?: string; type?: string; maxRent?: string; sort?: string };

const themeLabels: Record<Theme, string> = {
  light: "Light mode",
  dark: "Dark mode",
  system: "System default",
};

const themeIcons = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const navItems: Page[] = ["Home", "Explore", "Details", "Sign in", "Owner", "Tenant", "Admin"];

const formatRent = (rent: number) => `₹${rent.toLocaleString("en-IN")}`;
const imageFor = (room: Room) =>
  room.images[0] ??
  "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=960&q=85";

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem("roomonrent-theme");
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // Theme still works for the current page when browser storage is disabled.
  }
  return "system";
}

function useTheme() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.dataset.themePreference = theme;
    };

    applyTheme();
    try {
      localStorage.setItem("roomonrent-theme", theme);
    } catch {
      // The selected theme remains active until the page is closed.
    }

    if (theme === "system") {
      media.addEventListener("change", applyTheme);
      return () => media.removeEventListener("change", applyTheme);
    }
  }, [theme]);

  return { theme, setTheme };
}

function ThemePicker({ theme, setTheme }: { theme: Theme; setTheme: (theme: Theme) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const Icon = themeIcons[theme];

  useEffect(() => {
    function closeOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-3 text-sm font-medium text-ink transition hover:bg-elevated"
        aria-label={`Theme: ${themeLabels[theme]}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon size={17} aria-hidden="true" />
        <span className="hidden sm:inline">{themeLabels[theme]}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && (
        <div
          className="absolute right-0 top-12 z-30 w-52 rounded-2xl border border-line bg-elevated p-1.5 shadow-popover"
          role="menu"
          aria-label="Choose appearance"
        >
          {(["light", "dark", "system"] as const).map((option) => {
            const OptionIcon = themeIcons[option];
            return (
              <button
                type="button"
                key={option}
                role="menuitemradio"
                aria-checked={theme === option}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-ink hover:bg-brand-soft"
                onClick={() => {
                  setTheme(option);
                  setOpen(false);
                }}
              >
                <OptionIcon size={17} aria-hidden="true" />
                <span className="flex-1">{themeLabels[option]}</span>
                {theme === option && <Check size={16} className="text-brand" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Header({
  page,
  setPage,
  theme,
  setTheme,
  account,
  onLogout,
}: {
  page: Page;
  setPage: (page: Page) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  account: Account | null;
  onLogout: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  function navigate(next: Page) {
    setPage(next);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  const visibleNav = navItems.filter((item) => {
    if (item === "Sign in") return account === null;
    if (item === "Owner") return account?.role === "OWNER";
    if (item === "Tenant") return account?.role === "TENANT";
    if (item === "Admin") return account?.role === "ADMIN";
    return true;
  });

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8">
        <button type="button" className="flex items-center gap-2.5" onClick={() => navigate("Home")} aria-label="RoomOnRent home">
          <span className="grid size-9 place-items-center rounded-xl bg-brand text-white dark:text-[#102018]">
            <Home size={19} aria-hidden="true" />
          </span>
          <span className="text-lg font-bold tracking-tight text-ink">Room<span className="text-brand">On</span>Rent</span>
        </button>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {visibleNav.slice(0, 3).map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => navigate(item)}
              className={`rounded-full px-3.5 py-2 text-sm transition hover:bg-brand-soft ${page === item ? "font-semibold text-brand" : "text-muted"}`}
            >
              {item === "Details" ? "Room details" : item}
            </button>
          ))}
          <div className="mx-1 h-5 w-px bg-line" />
          {visibleNav.slice(3).map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => navigate(item)}
              className={`rounded-full px-2.5 py-2 text-xs transition hover:bg-brand-soft ${page === item ? "font-semibold text-brand" : "text-muted"}`}
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemePicker theme={theme} setTheme={setTheme} />
          {account ? <button type="button" className="hidden rounded-full border border-line px-3 py-2 text-xs font-semibold text-muted hover:text-ink sm:inline-flex" onClick={onLogout}>Sign out</button> : <button type="button" className="hidden rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-strong dark:text-[#102018] sm:inline-flex" onClick={() => navigate("Sign in")}>Get started</button>}
          <button type="button" className="grid size-10 place-items-center rounded-full border border-line text-ink lg:hidden" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((value) => !value)}>
            {mobileOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <nav className="grid grid-cols-2 gap-1 border-t border-line bg-surface px-5 py-3 lg:hidden" aria-label="Mobile navigation">
          {visibleNav.map((item) => (
            <button key={item} type="button" onClick={() => navigate(item)} className={`rounded-xl px-3 py-2.5 text-left text-sm ${page === item ? "bg-brand-soft font-semibold text-brand" : "text-muted hover:bg-elevated"}`}>
              {item === "Details" ? "Room details" : item === "Owner" ? "Owner dashboard" : item === "Tenant" ? "Tenant dashboard" : item === "Admin" ? "Admin dashboard" : item}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
}

function RoomCard({ room, onOpen }: { room: Room; onOpen: () => void }) {
  const [saved, setSaved] = useState(false);
  return (
    <article className="group overflow-hidden rounded-card border border-line bg-surface shadow-card transition hover:-translate-y-1">
      <div className="relative aspect-[1.42] overflow-hidden bg-elevated">
        <img src={imageFor(room)} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
        {room.verifiedOwner && <span className="absolute left-3 top-3 rounded-full bg-surface/95 px-3 py-1.5 text-xs font-semibold text-ink">Verified</span>}
        <button type="button" aria-label={saved ? "Remove from saved rooms" : "Save room"} aria-pressed={saved} onClick={() => setSaved((value) => !value)} className={`absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-surface/95 transition ${saved ? "text-rose-500" : "text-ink hover:text-rose-500"}`}>
          <Heart size={17} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <div className="p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug text-ink">{room.title}</h3>
          <span className="shrink-0 rounded-full bg-brand-soft px-2 py-1 text-[11px] font-semibold text-brand">{room.type}</span>
        </div>
        <p className="flex items-center gap-1.5 text-sm text-muted"><MapPin size={14} />{room.city}</p>
        <div className="mt-4 flex items-end justify-between border-t border-line pt-3">
          <p><span className="text-lg font-bold text-ink">{formatRent(room.rent)}</span><span className="text-xs text-muted"> / month</span></p>
          <button type="button" onClick={onOpen} className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-strong">View room <ArrowRight size={15} /></button>
        </div>
      </div>
    </article>
  );
}

function RoomGrid({ rooms, loading, error, onOpen }: { rooms: Room[]; loading: boolean; error: string | null; onOpen: (room: Room) => void }) {
  if (loading) return <p className="rounded-2xl border border-line bg-surface p-8 text-center text-sm text-muted">Finding available rooms…</p>;
  if (error) return <p role="alert" className="rounded-2xl border border-line bg-surface p-8 text-center text-sm text-muted">{error}</p>;
  if (rooms.length === 0) return <p className="rounded-2xl border border-line bg-surface p-8 text-center text-sm text-muted">No rooms match those filters yet. Try another city or budget.</p>;
  return <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{rooms.map((room) => <RoomCard key={room._id} room={room} onOpen={() => onOpen(room)} />)}</div>;
}

function SearchBar({ onSearch }: { onSearch: (filters: SearchFilters) => void }) {
  const [city, setCity] = useState("");
  const [type, setType] = useState("");
  const [maxRent, setMaxRent] = useState("");

  return (
    <form className="grid gap-2 rounded-2xl border border-line bg-surface p-2 shadow-card sm:grid-cols-[1fr_0.8fr_0.8fr_auto]" onSubmit={(event) => { event.preventDefault(); onSearch({ city, type, maxRent }); }}>
      <label className="flex items-center gap-3 rounded-xl px-3 py-2.5 focus-within:bg-canvas">
        <MapPin className="shrink-0 text-brand" size={18} />
        <span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Location</span><input value={city} onChange={(event) => setCity(event.target.value)} aria-label="Location" className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted" placeholder="City or neighborhood" /></span>
      </label>
      <label className="flex items-center gap-3 rounded-xl border-line px-3 py-2.5 focus-within:bg-canvas sm:border-l">
        <BedDouble className="shrink-0 text-brand" size={18} />
        <span><span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Room type</span><select value={type} onChange={(event) => setType(event.target.value)} aria-label="Room type" className="max-w-full bg-transparent text-sm text-ink outline-none"><option value="">Any room</option><option>Single Room</option><option>Double Sharing</option><option>Triple Sharing</option><option>PG</option><option>1BHK</option><option>2BHK</option></select></span>
      </label>
      <label className="flex items-center gap-3 rounded-xl border-line px-3 py-2.5 focus-within:bg-canvas sm:border-l">
        <span className="text-lg font-semibold text-brand">₹</span>
        <span><span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Max budget</span><select value={maxRent} onChange={(event) => setMaxRent(event.target.value)} aria-label="Monthly budget" className="bg-transparent text-sm text-ink outline-none"><option value="">Any budget</option><option value="10000">Under ₹10,000</option><option value="20000">Under ₹20,000</option><option value="30000">Under ₹30,000</option></select></span>
      </label>
      <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong dark:text-[#102018]"><Search size={17} />Search</button>
    </form>
  );
}

function HomePage({ onSearch, onDetails, onListRoom, rooms, loading, error }: { onSearch: (filters: SearchFilters) => void; onDetails: (room: Room) => void; onListRoom: () => void; rooms: Room[]; loading: boolean; error: string | null }) {
  return (
    <>
      <section className="relative overflow-hidden bg-[#123b30] text-white">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(90deg, #123b30 0%, transparent 85%), url(https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1800&q=85)", backgroundPosition: "center", backgroundSize: "cover" }} />
        <div className="relative mx-auto max-w-7xl px-5 pb-24 pt-16 sm:pb-28 sm:pt-24 lg:px-8">
          <div className="max-w-2xl">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white"><Sparkles size={14} /> A better way to find your next place</span>
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.12] tracking-tight sm:text-6xl">Find a place that feels like <span className="text-[#9ce0b5]">yours.</span></h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/75 sm:text-lg">Thoughtful rooms, trusted hosts, and a smoother move-in. Your next chapter starts here.</p>
          </div>
          <div className="mt-9 max-w-5xl rounded-2xl"><SearchBar onSearch={onSearch} /></div>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-white/75">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={15} /> Verified listings</span>
            <span className="inline-flex items-center gap-1.5"><Users size={15} /> Friendly communities</span>
            <span className="inline-flex items-center gap-1.5"><Check size={15} /> No hidden fees</span>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-brand">Handpicked for you</p><h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Rooms worth coming home to</h2></div>
          <button type="button" onClick={() => onSearch({ city: "", type: "", maxRent: "" })} className="hidden items-center gap-1 text-sm font-semibold text-brand hover:text-brand-strong sm:inline-flex">Explore all <ArrowRight size={16} /></button>
        </div>
        <RoomGrid rooms={rooms.slice(0, 3)} loading={loading} error={error} onOpen={onDetails} />
        <div className="mt-6 sm:hidden"><button type="button" onClick={() => onSearch({ city: "", type: "", maxRent: "" })} className="w-full rounded-xl border border-line bg-surface py-3 text-sm font-semibold text-brand">Explore all rooms</button></div>
      </section>
      <section className="mx-auto max-w-7xl px-5 pb-14 lg:px-8">
        <div className="grid gap-6 rounded-card border border-line bg-brand-soft p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-9">
          <div><p className="text-sm font-semibold text-brand">Have a room to share?</p><h2 className="mt-1 text-2xl font-semibold text-ink">Meet your next great tenant.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted">Create a thoughtful listing and connect with people looking for a place to call home.</p></div>
          <button type="button" onClick={onListRoom} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-strong dark:text-[#102018]">List your room <ArrowRight size={16} /></button>
        </div>
      </section>
    </>
  );
}

function ExplorePage({ onDetails, onSearch, rooms, loading, error, filters, page, pages, onPageChange }: { onDetails: (room: Room) => void; onSearch: (filters: SearchFilters) => void; rooms: Room[]; loading: boolean; error: string | null; filters: SearchFilters; page: number; pages: number; onPageChange: (page: number) => void }) {
  return (
    <PageShell eyebrow="Explore rooms" title="Find your kind of place" description="Browse welcoming spaces in neighborhoods you'll love.">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3">
        <div className="flex flex-wrap gap-2"><button className="rounded-full bg-brand-soft px-3.5 py-2 text-sm font-semibold text-brand">All rooms</button><button className="rounded-full px-3.5 py-2 text-sm text-muted hover:bg-elevated">Private</button><button className="rounded-full px-3.5 py-2 text-sm text-muted hover:bg-elevated">Shared</button><button className="rounded-full px-3.5 py-2 text-sm text-muted hover:bg-elevated">Studios</button></div>
        <label className="inline-flex items-center gap-2 rounded-full border border-line px-3.5 py-2 text-sm text-ink"><SlidersHorizontal size={16} /><span className="sr-only">Sort rooms</span><select value={filters.sort ?? "newest"} className="bg-transparent outline-none" onChange={(event) => onSearch({ sort: event.target.value })}><option value="newest">Newest</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select><ArrowDown size={14} /></label>
      </div>
      <RoomGrid rooms={rooms} loading={loading} error={error} onOpen={onDetails} />
      {pages > 1 && <div className="mt-7 flex items-center justify-center gap-4"><button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="rounded-xl border border-line bg-surface px-4 py-2 text-sm text-ink disabled:opacity-40">Previous</button><span className="text-sm text-muted">Page {page} of {pages}</span><button type="button" disabled={page >= pages} onClick={() => onPageChange(page + 1)} className="rounded-xl border border-line bg-surface px-4 py-2 text-sm text-ink disabled:opacity-40">Next</button></div>}
    </PageShell>
  );
}

function PageShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <main className="mx-auto min-h-[70vh] max-w-7xl px-5 py-10 lg:px-8 lg:py-14"><div className="mb-8"><p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-brand">{eyebrow}</p><h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1><p className="mt-2 text-muted">{description}</p></div>{children}</main>;
}

function DetailsPage({ room, onBook, bookingMessage, isAuthenticated }: { room: Room | null; onBook: (moveInDate: string) => void; bookingMessage: string | null; isAuthenticated: boolean }) {
  const [moveInDate, setMoveInDate] = useState(new Date().toISOString().slice(0, 10));
  if (!room) {
    return <PageShell eyebrow="Room details" title="Choose a room to see its details" description="Browse available listings and select one to continue."><button type="button" className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white" onClick={() => window.history.back()}>Return to rooms</button></PageShell>;
  }
  const ownerName = typeof room.owner === "string" ? "RoomOnRent host" : room.owner.name;
  return (
    <PageShell eyebrow="Room details" title={room.title} description={`${room.address}, ${room.city}`}>
      <div className="grid gap-7 lg:grid-cols-[1.3fr_0.7fr]">
        <div>
          <img className="aspect-[1.6] w-full rounded-card object-cover" src={imageFor(room)} alt={`Interior view: ${room.title}`} />
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5"><div><h2 className="text-xl font-semibold text-ink">{room.type}{room.furnished ? " · Furnished" : " · Unfurnished"}</h2><p className="mt-1 flex items-center gap-1.5 text-sm text-muted"><MapPin size={15} /> {room.address}, {room.city}</p></div><div className="grid size-11 place-items-center rounded-full bg-brand-soft text-brand"><Home size={20} /></div></div>
          <div className="grid grid-cols-2 gap-3 border-b border-line py-5 sm:grid-cols-4"><Amenity icon={<BedDouble size={17} />} label={room.furnished ? "Furnished" : "Unfurnished"} /><Amenity icon={<Wifi size={17} />} label={room.amenities.includes("Wi-Fi") ? "Wi-Fi" : "Ask host"} /><Amenity icon={<Bath size={17} />} label={room.amenities.includes("Attached bathroom") ? "Attached bath" : "Shared bath"} /><Amenity icon={<ShieldCheck size={17} />} label={room.verifiedOwner ? "Verified host" : "Host"} /></div>
          <p className="py-5 text-sm leading-7 text-muted">{room.description}</p>
          <p className="text-sm text-ink"><span className="font-semibold">Hosted by </span>{ownerName}</p>
        </div>
        <aside className="h-fit rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
          <div className="flex items-baseline gap-1"><span className="text-2xl font-bold text-ink">{formatRent(room.rent)}</span><span className="text-sm text-muted">/ month</span></div>
          <p className="mt-1 text-sm text-muted">Deposit: {formatRent(room.deposit)} · {room.available ? "Available now" : "Unavailable"}</p>
          <label className="mt-5 block text-xs font-semibold text-muted">Move-in date<input type="date" min={new Date().toISOString().slice(0, 10)} value={moveInDate} onChange={(event) => setMoveInDate(event.target.value)} className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm text-ink" /></label>
          <button type="button" disabled={!room.available} onClick={() => onBook(moveInDate)} className="mt-4 w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50 dark:text-[#102018]">{isAuthenticated ? "Request to book" : "Sign in to request booking"}</button>
          {bookingMessage && <p role="status" className="mt-3 text-center text-xs text-brand">{bookingMessage}</p>}
          <p className="mt-3 text-center text-xs text-muted">No payment is collected with a booking request.</p>
        </aside>
      </div>
    </PageShell>
  );
}

function Amenity({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <div className="flex items-center gap-2 rounded-xl bg-surface p-3 text-sm text-ink"><span className="text-brand">{icon}</span>{label}</div>;
}

function AuthPage({ onSubmit, error, loading }: { onSubmit: (input: { signup: boolean; name: string; email: string; password: string; role: "TENANT" | "OWNER" }) => Promise<void>; error: string | null; loading: boolean }) {
  const [signup, setSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"TENANT" | "OWNER">("TENANT");

  return (
    <PageShell eyebrow="Welcome home" title={signup ? "Create your account" : "Good to see you again"} description={signup ? "Join RoomOnRent and find a place that feels right." : "Sign in to pick up where you left off."}>
      <form className="mx-auto max-w-md rounded-card border border-line bg-surface p-6 shadow-card sm:p-8" onSubmit={(event) => { event.preventDefault(); void onSubmit({ signup, name, email, password, role }); }}>
        {signup && <label className="mb-4 block text-sm font-medium text-ink">Full name<input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-3 text-ink placeholder:text-muted" placeholder="Your name" /></label>}
        <label className="mb-4 block text-sm font-medium text-ink">Email address<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-3 text-ink placeholder:text-muted" placeholder="you@example.com" /></label>
        <label className="mb-2 block text-sm font-medium text-ink">Password<input required minLength={signup ? 8 : 1} type="password" autoComplete={signup ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-3 text-ink placeholder:text-muted" placeholder="At least 8 characters" /></label>
        {signup && <label className="mt-4 block text-sm font-medium text-ink">I am joining as<select value={role} onChange={(event) => setRole(event.target.value as "TENANT" | "OWNER")} className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-3 text-ink"><option value="TENANT">Tenant</option><option value="OWNER">Room owner</option></select></label>}
        {error && <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>}
        <button type="submit" disabled={loading} className="mt-5 w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-60 dark:text-[#102018]">{loading ? "Please wait…" : signup ? "Create account" : "Sign in"}</button>
        <p className="mt-5 text-center text-sm text-muted">{signup ? "Already have an account?" : "New to RoomOnRent?"} <button type="button" className="font-semibold text-brand" onClick={() => setSignup((value) => !value)}>{signup ? "Sign in" : "Create account"}</button></p>
      </form>
    </PageShell>
  );
}

function ListRoomPage({ onSubmit, message, loading }: { onSubmit: (room: Omit<Room, "_id" | "owner" | "available" | "verifiedOwner">) => Promise<void>; message: string | null; loading: boolean }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState<Room["type"]>("Single Room");
  const [rent, setRent] = useState("");
  const [deposit, setDeposit] = useState("");
  const [image, setImage] = useState("");

  return <PageShell eyebrow="List your room" title="Create a room listing" description="Share clear details so tenants can find the right fit.">
    <form className="grid gap-4 rounded-card border border-line bg-surface p-6 shadow-card sm:grid-cols-2" onSubmit={(event) => {
      event.preventDefault();
      void onSubmit({
        title,
        description,
        city,
        address,
        type,
        rent: Number(rent),
        deposit: Number(deposit),
        images: image ? [image] : [],
        amenities: ["Wi-Fi"],
        furnished: true,
      });
    }}>
      <label className="text-sm font-medium text-ink sm:col-span-2">Listing title<input required minLength={5} maxLength={140} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-3" /></label>
      <label className="text-sm font-medium text-ink sm:col-span-2">Description<textarea required minLength={20} maxLength={4000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-3" /></label>
      <label className="text-sm font-medium text-ink">City<input required value={city} onChange={(event) => setCity(event.target.value)} className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-3" /></label>
      <label className="text-sm font-medium text-ink">Address / neighborhood<input required minLength={5} value={address} onChange={(event) => setAddress(event.target.value)} className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-3" /></label>
      <label className="text-sm font-medium text-ink">Room type<select value={type} onChange={(event) => setType(event.target.value as Room["type"])} className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-3"><option>Single Room</option><option>Double Sharing</option><option>Triple Sharing</option><option>PG</option><option>1BHK</option><option>2BHK</option></select></label>
      <label className="text-sm font-medium text-ink">Monthly rent (₹)<input required type="number" min="1" value={rent} onChange={(event) => setRent(event.target.value)} className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-3" /></label>
      <label className="text-sm font-medium text-ink">Security deposit (₹)<input required type="number" min="0" value={deposit} onChange={(event) => setDeposit(event.target.value)} className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-3" /></label>
      <label className="text-sm font-medium text-ink">Photo URL (optional)<input type="url" value={image} onChange={(event) => setImage(event.target.value)} className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-3.5 py-3" /></label>
      {message && <p role="alert" className="text-sm text-rose-600 dark:text-rose-300 sm:col-span-2">{message}</p>}
      <button type="submit" disabled={loading} className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 dark:text-[#102018] sm:col-span-2">{loading ? "Publishing…" : "Publish listing"}</button>
    </form>
  </PageShell>;
}

function DashboardPage({ role, bookings, stats, loading, onDecision, onCancel, onListRoom }: { role: "Owner" | "Tenant" | "Admin"; bookings: Booking[]; stats: { users: number; owners: number; tenants: number; listings: number; bookings: number } | null; loading: boolean; onDecision: (id: string, status: "ACCEPTED" | "REJECTED") => void; onCancel: (id: string) => void; onListRoom: () => void }) {
  const heading = role === "Owner" ? "Your hosting overview" : role === "Tenant" ? "Your rental overview" : "Platform overview";
  const pending = bookings.filter((booking) => booking.status === "PENDING").length;
  const confirmed = bookings.filter((booking) => ["ACCEPTED", "CONFIRMED"].includes(booking.status)).length;
  const labels = role === "Owner" ? ["Booking requests", "Accepted stays", "Total bookings"] : role === "Tenant" ? ["My requests", "Awaiting response", "Accepted stays"] : ["Registered users", "Room listings", "Bookings"];
  const values = role === "Admin"
    ? [stats?.users ?? "—", stats?.listings ?? "—", stats?.bookings ?? "—"]
    : [role === "Owner" ? pending : bookings.length, role === "Owner" ? confirmed : pending, confirmed];
  return (
    <PageShell eyebrow={`${role} dashboard`} title={heading} description="A clear view of what's happening with your RoomOnRent account.">
      <div className="mb-6 grid gap-4 sm:grid-cols-3">{labels.map((label, index) => <div key={label} className="rounded-card border border-line bg-surface p-5 shadow-card"><p className="text-sm text-muted">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-ink">{loading ? "…" : values[index]}</p><p className="mt-2 text-xs text-muted">Live from your account</p></div>)}</div>
      <section className="rounded-card border border-line bg-surface p-5 shadow-card sm:p-6"><div className="mb-5 flex items-center justify-between gap-3"><div><h2 className="font-semibold text-ink">{role === "Tenant" ? "Your bookings" : role === "Owner" ? "Booking requests" : "Recent platform bookings"}</h2><p className="mt-1 text-xs text-muted">Booking data and status are stored in the RoomOnRent database.</p></div>{role === "Owner" && <button type="button" onClick={onListRoom} className="rounded-xl bg-brand px-3 py-2 text-xs font-semibold text-white dark:text-[#102018]">List a room</button>}</div>
        {loading ? <p className="py-8 text-center text-sm text-muted">Loading dashboard…</p> : bookings.length === 0 ? <p className="py-8 text-center text-sm text-muted">No bookings yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[530px] text-left text-sm"><thead><tr className="border-b border-line text-xs uppercase tracking-wide text-muted"><th className="pb-3 font-medium">Listing</th><th className="pb-3 font-medium">{role === "Tenant" ? "Move-in" : "Tenant"}</th><th className="pb-3 font-medium">Requested</th><th className="pb-3 font-medium">Status</th>{role !== "Admin" && <th className="pb-3 font-medium">Action</th>}</tr></thead><tbody>{bookings.map((booking) => <tr key={booking._id} className="border-b border-line last:border-0"><td className="py-4 font-medium text-ink">{booking.room.title}</td><td className="py-4 text-muted">{role === "Tenant" ? new Date(booking.moveInDate).toLocaleDateString() : typeof booking.tenant === "string" ? "Tenant" : booking.tenant.name}</td><td className="py-4 text-muted">{new Date(booking.createdAt).toLocaleDateString()}</td><td className="py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${booking.status === "PENDING" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" : "bg-brand-soft text-brand"}`}>{booking.status}</span></td>{role === "Owner" && <td className="py-4">{booking.status === "PENDING" ? <span className="flex gap-2"><button type="button" onClick={() => onDecision(booking._id, "ACCEPTED")} className="font-semibold text-brand">Accept</button><button type="button" onClick={() => onDecision(booking._id, "REJECTED")} className="font-semibold text-muted">Decline</button></span> : "—"}</td>}{role === "Tenant" && <td className="py-4">{["PENDING", "ACCEPTED"].includes(booking.status) ? <button type="button" onClick={() => onCancel(booking._id)} className="font-semibold text-muted">Cancel</button> : "—"}</td>}</tr>)}</tbody></table></div>}
      </section>
    </PageShell>
  );
}

function ContactDialog({ close }: { close: () => void }) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [close]);

  return <div className="fixed inset-0 z-40 grid place-items-center bg-black/55 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="dialog-title" className="w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-popover">
      <div className="mb-5 flex items-start justify-between"><div><h2 id="dialog-title" className="text-xl font-semibold text-ink">Send a message</h2><p className="mt-1 text-sm text-muted">The host usually replies within a day.</p></div><button type="button" className="grid size-9 place-items-center rounded-full text-muted hover:bg-elevated" onClick={close} aria-label="Close dialog"><X size={18} /></button></div>
      <label className="mb-4 block text-sm font-medium text-ink">Your message<textarea rows={4} className="mt-1.5 w-full resize-none rounded-xl border border-line bg-canvas px-3.5 py-3 text-ink placeholder:text-muted" placeholder="Hi, I'm interested in this room..." /></label>
      <button type="button" onClick={close} className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white hover:bg-brand-strong dark:text-[#102018]">Send inquiry</button>
    </section>
  </div>;
}

function App() {
  const { theme, setTheme } = useTheme();
  const [page, setPage] = useState<Page>("Home");
  const [account, setAccount] = useState<Account | null>(null);
  const [requestedPage, setRequestedPage] = useState<Page | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({ city: "", type: "", maxRent: "" });
  const [roomsPage, setRoomsPage] = useState(1);
  const [roomPages, setRoomPages] = useState(1);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookingMessage, setBookingMessage] = useState<string | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [adminStats, setAdminStats] = useState<{ users: number; owners: number; tenants: number; listings: number; bookings: number } | null>(null);
  const [dashboardRevision, setDashboardRevision] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [listingMessage, setListingMessage] = useState<string | null>(null);
  const [listingLoading, setListingLoading] = useState(false);

  const goTo = (next: Page) => {
    const requiredRole = next === "Owner" || next === "List room" ? "OWNER" : next === "Tenant" ? "TENANT" : next === "Admin" ? "ADMIN" : null;
    if (requiredRole && account?.role !== requiredRole) {
      setRequestedPage(next);
      setPage("Sign in");
      setNotice(account ? "This page is not available for your account role." : "Sign in with the right account to continue.");
    } else {
      setNotice(null);
      setPage(next);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const onSearch = (nextFilters: SearchFilters) => {
    setFilters((current) => ({ ...current, ...nextFilters }));
    setRoomsPage(1);
    goTo("Explore");
  };

  useEffect(() => {
    let active = true;
    const query = new URLSearchParams();
    if (filters.city) query.set("city", filters.city);
    if (filters.type) query.set("type", filters.type);
    if (filters.maxRent) query.set("maxRent", filters.maxRent);
    if (filters.sort) query.set("sort", filters.sort);
    query.set("limit", "24");
    query.set("page", String(roomsPage));
    setRoomsLoading(true);
    api.listRooms(query.toString())
      .then((result) => {
        if (active) {
          setRooms(result.items);
          setRoomPages(result.pages);
          setRoomsError(null);
        }
      })
      .catch((error: unknown) => {
        if (active) setRoomsError(error instanceof Error ? error.message : "Unable to load room listings.");
      })
      .finally(() => {
        if (active) setRoomsLoading(false);
      });
    return () => { active = false; };
  }, [filters, roomsPage]);

  useEffect(() => {
    let active = true;
    api.me()
      .then(({ user }) => { if (active) setAccount(user); })
      .catch((error: unknown) => {
        if (active && error instanceof Error && !("status" in error && error.status === 401)) {
          setRoomsError("The API is unavailable. Start MongoDB and the server to load live listings.");
        }
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!account || !["Owner", "Tenant", "Admin"].includes(page)) return;
    let active = true;
    setDashboardLoading(true);
    const data = account.role === "ADMIN"
      ? Promise.all([api.adminStats(), api.ownerBookings()]).then(([{ stats }, { items }]) => { if (active) { setAdminStats(stats); setBookings(items); } })
      : (account.role === "OWNER" ? api.ownerBookings() : api.myBookings()).then(({ items }) => { if (active) setBookings(items); });
    data.catch((error: unknown) => {
      if (active) setNotice(error instanceof Error ? error.message : "Unable to load dashboard.");
    }).finally(() => {
      if (active) setDashboardLoading(false);
    });
    return () => { active = false; };
  }, [account, page, dashboardRevision]);

  const submitAuth = async (input: { signup: boolean; name: string; email: string; password: string; role: "TENANT" | "OWNER" }) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const { user } = input.signup
        ? await api.register({ name: input.name, email: input.email, password: input.password, role: input.role })
        : await api.login({ email: input.email, password: input.password });
      setAccount(user);
      const next = requestedPage ?? (user.role === "OWNER" ? "Owner" : user.role === "ADMIN" ? "Admin" : "Tenant");
      setRequestedPage(null);
      if ((next === "Owner" || next === "List room") && user.role !== "OWNER" || next === "Admin" && user.role !== "ADMIN" || next === "Tenant" && user.role !== "TENANT") {
        setPage("Home");
        setNotice("You are signed in, but this account does not have access to that dashboard.");
      } else {
        setPage(next);
        setNotice("Signed in successfully.");
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setAuthLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await api.logout();
      setAccount(null);
      setPage("Home");
      setNotice("You have signed out.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to sign out.");
    }
  };

  const requestBooking = async (moveInDate: string) => {
    if (!account) {
      setRequestedPage("Details");
      goTo("Sign in");
      setNotice("Sign in as a tenant to request this room.");
      return;
    }
    if (account.role !== "TENANT" || !selectedRoom) {
      setBookingMessage("Only tenant accounts can request a room.");
      return;
    }
    try {
      await api.createBooking({ roomId: selectedRoom._id, moveInDate });
      setBookingMessage("Request sent. The host can now review your booking.");
      setDashboardRevision((value) => value + 1);
    } catch (error) {
      setBookingMessage(error instanceof Error ? error.message : "Unable to create the booking request.");
    }
  };

  const updateBooking = async (id: string, status: "ACCEPTED" | "REJECTED") => {
    try {
      await api.updateBooking(id, status);
      setDashboardRevision((value) => value + 1);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to update booking.");
    }
  };
  const cancelBooking = async (id: string) => {
    try {
      await api.cancelBooking(id);
      setDashboardRevision((value) => value + 1);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to cancel booking.");
    }
  };
  const publishRoom = async (input: Omit<Room, "_id" | "owner" | "available" | "verifiedOwner">) => {
    setListingLoading(true);
    setListingMessage(null);
    try {
      const { room } = await api.createRoom(input);
      setRooms((current) => [room, ...current]);
      setPage("Owner");
      setNotice("Your room listing is now published.");
    } catch (error) {
      setListingMessage(error instanceof Error ? error.message : "Unable to publish listing.");
    } finally {
      setListingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Header page={page} setPage={goTo} theme={theme} setTheme={setTheme} account={account} onLogout={() => { void signOut(); }} />
      {notice && <div role="status" className="mx-auto mt-4 max-w-7xl px-5 text-sm text-brand lg:px-8">{notice}</div>}
      {page === "Home" && <HomePage onSearch={onSearch} onListRoom={() => goTo("List room")} onDetails={(room) => { setSelectedRoom(room); setBookingMessage(null); goTo("Details"); }} rooms={rooms} loading={roomsLoading} error={roomsError} />}
      {page === "Explore" && <ExplorePage filters={filters} onSearch={onSearch} page={roomsPage} pages={roomPages} onPageChange={setRoomsPage} onDetails={(room) => { setSelectedRoom(room); setBookingMessage(null); goTo("Details"); }} rooms={rooms} loading={roomsLoading} error={roomsError} />}
      {page === "Details" && <DetailsPage room={selectedRoom} onBook={(date) => { void requestBooking(date); }} bookingMessage={bookingMessage} isAuthenticated={account?.role === "TENANT"} />}
      {page === "Sign in" && <AuthPage onSubmit={submitAuth} error={authError} loading={authLoading} />}
      {page === "List room" && <ListRoomPage onSubmit={publishRoom} message={listingMessage} loading={listingLoading} />}
      {(page === "Owner" || page === "Tenant" || page === "Admin") && <DashboardPage role={page} bookings={bookings} stats={adminStats} loading={dashboardLoading} onDecision={(id, status) => { void updateBooking(id, status); }} onCancel={(id) => { void cancelBooking(id); }} onListRoom={() => goTo("List room")} />}
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between lg:px-8"><span>© 2026 RoomOnRent. Find your place.</span><span className="inline-flex items-center gap-2"><Monitor size={14} /> Theme preference: {themeLabels[theme]}{account && ` · ${account.name}`}</span></div>
      </footer>
      {page !== "Home" && <button type="button" onClick={() => goTo("Home")} className="fixed bottom-5 right-5 z-10 inline-flex items-center gap-2 rounded-full border border-line bg-elevated px-4 py-3 text-sm font-semibold text-ink shadow-popover transition hover:text-brand"><ArrowLeft size={16} />Home</button>}
    </div>
  );
}

export default App;
