'use client';
import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '@/context/LanguageContext';
import { Icon } from '@/components/ui/icons';

export type Pin = { lat: number; lng: number };
/** city/street are '' when the spot has none (e.g. a field): the pin moved, so the old street no longer applies. */
export type Picked = Pin & { city?: string; street?: string };

/** Tbilisi, where the map starts when there is no pin yet: the whole city in view. */
const TBILISI: Pin = { lat: 41.7167, lng: 44.7833 };
const CITY_ZOOM = 12;
const STREET_ZOOM = 17;
const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

type Suggestion = { id: string; text: string; sub?: string };

/**
 * One map, two engines behind the same calls: Google Maps when a key is set
 * (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY), otherwise OpenStreetMap, so it works
 * before the key exists.
 */
interface Engine {
  /** onMoved fires only when the customer moved the map (drag), never for a resize. */
  mount(el: HTMLElement, at: Pin, zoom: number, onStart: () => void, onMoved: (p: Pin) => void): Promise<void>;
  moveTo(p: Pin): void;
  search(q: string): Promise<Suggestion[]>;
  resolve(s: Suggestion): Promise<Picked | null>;
  reverse(p: Pin): Promise<Picked>;
  destroy(): void;
}

// ── Google ─────────────────────────────────────────────────────────────
let googleLoading: Promise<any> | null = null;
function loadGoogle(lang: string): Promise<any> {
  const w = window as any;
  if (w.google?.maps?.Geocoder) return Promise.resolve(w.google);
  googleLoading ??= new Promise((resolve, reject) => {
    w.__pupboxMaps = () => resolve(w.google);
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_KEY!)}&libraries=places&language=${lang}&region=GE&callback=__pupboxMaps`;
    s.async = true;
    s.onerror = () => { googleLoading = null; reject(new Error('maps')); };
    document.head.appendChild(s);
  });
  return googleLoading;
}

/** City and "street number" out of a Google result. */
function fromGoogle(r: any, at: Pin): Picked {
  const part = (type: string) => r?.address_components?.find((c: any) => c.types.includes(type))?.long_name as string | undefined;
  const street = [part('route'), part('street_number')].filter(Boolean).join(' ');
  return { ...at, city: part('locality') || part('administrative_area_level_2') || part('administrative_area_level_1') || '', street };
}

function googleEngine(lang: string): Engine {
  let g: any, map: any, geocoder: any, places: any;
  // Closed before the script arrived (React may mount twice): build nothing.
  let dead = false;
  return {
    async mount(el, at, zoom, onStart, onMoved) {
      g = await loadGoogle(lang);
      if (dead) return;
      map = new g.maps.Map(el, { center: at, zoom, disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy', clickableIcons: false });
      geocoder = new g.maps.Geocoder();
      places = new g.maps.places.AutocompleteService();
      let dragged = false;
      map.addListener('dragstart', () => { dragged = true; onStart(); });
      map.addListener('idle', () => { if (!dragged) return; dragged = false; const c = map.getCenter(); onMoved({ lat: c.lat(), lng: c.lng() }); });
    },
    moveTo(p) { map?.panTo(p); if (map && map.getZoom() < STREET_ZOOM) map.setZoom(STREET_ZOOM); },
    async search(q) {
      const res = await places.getPlacePredictions({ input: q, componentRestrictions: { country: 'ge' }, language: lang });
      return (res?.predictions ?? []).slice(0, 5).map((p: any) => ({ id: p.place_id, text: p.structured_formatting?.main_text ?? p.description, sub: p.structured_formatting?.secondary_text }));
    },
    async resolve(s) {
      const { results } = await geocoder.geocode({ placeId: s.id, language: lang });
      const r = results?.[0];
      if (!r) return null;
      const at = { lat: r.geometry.location.lat(), lng: r.geometry.location.lng() };
      return fromGoogle(r, at);
    },
    async reverse(p) {
      const { results } = await geocoder.geocode({ location: p, language: lang });
      return fromGoogle(results?.[0], p);
    },
    destroy() { dead = true; map = null; },
  };
}

// ── OpenStreetMap (until a Google key is added) ───────────────────────
const NOMINATIM = 'https://nominatim.openstreetmap.org';
function fromOsm(a: any, at: Pin): Picked {
  const ad = a?.address ?? {};
  const street = [ad.road || ad.pedestrian || ad.street, ad.house_number].filter(Boolean).join(' ');
  return { ...at, city: ad.city || ad.town || ad.village || ad.municipality || ad.state || '', street };
}

function osmEngine(lang: string): Engine {
  let map: any;
  let dead = false;
  let resize: ResizeObserver | undefined;
  const q = (path: string) => fetch(`${NOMINATIM}${path}&format=jsonv2&addressdetails=1&accept-language=${lang}`).then((r) => r.json());
  return {
    async mount(el, at, zoom, onStart, onMoved) {
      const L = (await import('leaflet')).default;
      if (dead) return;
      map = L.map(el, { zoomControl: true, attributionControl: true }).setView([at.lat, at.lng], zoom);
      map.attributionControl.setPrefix(false);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
      let dragged = false;
      map.on('dragstart', () => { dragged = true; onStart(); });
      // After the glide that follows a drag, not at the drag's end.
      map.on('moveend', () => { if (!dragged) return; dragged = false; const c = map.getCenter(); onMoved({ lat: c.lat, lng: c.lng }); });
      // Leaflet doesn't notice its box changing size (rotating a tablet, a
      // wider window): tell it, keeping the pin's spot in the middle.
      resize = new ResizeObserver(() => map?.invalidateSize({ pan: false }));
      resize.observe(el);
    },
    moveTo(p) { map?.setView([p.lat, p.lng], Math.max(map.getZoom(), STREET_ZOOM)); },
    async search(text) {
      const list = await q(`/search?countrycodes=ge&limit=5&q=${encodeURIComponent(text)}`);
      return (Array.isArray(list) ? list : []).map((r: any) => ({ id: `${r.lat},${r.lon}`, text: r.name || r.display_name.split(',')[0], sub: r.display_name.split(',').slice(1, 3).join(',').trim() }));
    },
    async resolve(s) {
      const [lat, lng] = s.id.split(',').map(Number);
      return this.reverse({ lat, lng });
    },
    async reverse(p) { return fromOsm(await q(`/reverse?lat=${p.lat}&lon=${p.lng}`), p); },
    destroy() { dead = true; resize?.disconnect(); map?.remove(); map = null; },
  };
}

/**
 * Pick the delivery spot: search, or move the map under the pin, or "my
 * location". Each stop reports the pin with the city and street found
 * there, which the form fills in (and the customer can still edit).
 */
export default function MapPicker({ value, onPick, mapClassName = 'h-52 sm:h-56' }: {
  value: Pin | null;
  onPick: (p: Picked) => void;
  /** Height of the map, e.g. taller beside a form on wide screens. */
  mapClassName?: string;
}) {
  const { t, lang } = useLanguage();
  const box = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [moving, setMoving] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Suggestion[]>([]);
  const [found, setFound] = useState('');
  const [locating, setLocating] = useState(false);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  /** The address at a spot, into the form. */
  async function lookUp(p: Pin) {
    try {
      const r = await engine.current!.reverse(p);
      setFound([r.street, r.city].filter(Boolean).join(', '));
      pickRef.current(r);
    } catch { pickRef.current(p); }
  }

  useEffect(() => {
    const e = GOOGLE_KEY ? googleEngine(lang) : osmEngine(lang);
    engine.current = e;
    let timer: ReturnType<typeof setTimeout>;
    e.mount(box.current!, value ?? TBILISI, value ? STREET_ZOOM : CITY_ZOOM, () => setMoving(true), (p) => {
      setMoving(false);
      clearTimeout(timer);
      timer = setTimeout(() => lookUp(p), 350);
    }).then(() => setReady(true)).catch((err) => { console.error('Map failed to load', err); setFailed(true); });
    return () => { clearTimeout(timer); e.destroy(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Suggestions while typing (gently: OpenStreetMap allows one request a second).
  useEffect(() => {
    const text = query.trim();
    if (text.length < 3) { setHits([]); return; }
    const timer = setTimeout(() => { engine.current?.search(text).then(setHits).catch(() => setHits([])); }, 600);
    return () => clearTimeout(timer);
  }, [query]);

  async function choose(s: Suggestion) {
    setHits([]); setQuery('');
    const r = await engine.current?.resolve(s).catch(() => null);
    if (!r) return;
    engine.current?.moveTo(r);
    setFound([r.street || s.text, r.city].filter(Boolean).join(', '));
    onPick({ ...r, street: r.street || s.text });
  }

  function locate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        engine.current?.moveTo(p);
        lookUp(p);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  if (failed) return null;

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="relative">
        <Icon name="pin" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('map.search')} aria-label={t('map.search')}
          className="w-full h-11 rounded-xl bg-gray-100/80 pl-10 pr-3 text-[13px] outline-none focus:bg-white focus:ring-2 focus:ring-teal-300" />
        {hits.length > 0 && (
          <ul role="listbox" className="absolute z-[1000] left-0 right-0 top-full mt-1 rounded-2xl bg-white ring-1 ring-gray-200 shadow-[0_8px_30px_-10px_rgba(36,48,58,0.25)] p-1.5">
            {hits.map((h) => (
              <li key={h.id}>
                <button type="button" role="option" aria-selected={false} onClick={() => choose(h)}
                  className="w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-gray-50">
                  <Icon name="pin" className="w-4 h-4 mt-0.5 text-teal-600 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-gray-800 truncate">{h.text}</span>
                    {h.sub && <span className="block text-[11.5px] text-gray-500 truncate">{h.sub}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={`relative ${mapClassName} rounded-2xl overflow-hidden ring-1 ring-gray-200 bg-gray-100 isolate`}>
        <div ref={box} className="absolute inset-0" />
        {!ready && <div className="absolute inset-0 animate-pulse bg-gray-100" aria-hidden="true" />}
        {/* The pin stays in the middle; the map moves under it. */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-full flex flex-col items-center">
          <span className={`flex items-center justify-center w-9 h-9 rounded-full rounded-br-none rotate-45 bg-teal-600 ring-4 ring-white transition-transform ${moving ? '-translate-y-2' : ''}`}>
            <span className="-rotate-45 w-2.5 h-2.5 rounded-full bg-white" />
          </span>
        </div>
        <span className={`pointer-events-none absolute left-1/2 top-1/2 z-[499] -translate-x-1/2 w-3 h-1.5 rounded-full bg-black/25 blur-[1px] transition-all ${moving ? 'w-2 opacity-50' : ''}`} aria-hidden="true" />
        <button type="button" onClick={locate} aria-label={t('map.locate')} title={t('map.locate')}
          className="absolute right-2.5 bottom-2.5 z-[500] w-9 h-9 rounded-full bg-white ring-1 ring-gray-200 text-teal-700 flex items-center justify-center hover:bg-teal-50">
          {locating
            ? <span className="w-4 h-4 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
            : <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>}
        </button>
      </div>
      <p className="text-[11.5px] text-gray-500 flex items-center gap-1.5 min-h-[16px]">
        {found ? <><Icon name="check" className="w-3.5 h-3.5 text-teal-600" />{found}</> : t('map.hint')}
      </p>
    </div>
  );
}
