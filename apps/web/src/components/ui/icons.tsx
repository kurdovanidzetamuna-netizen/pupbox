/** One small stroke-icon set for the site (24×24, currentColor). */
const P: Record<string, string> = {
  plus: 'M12 5v14M5 12h14',
  edit: 'M4 20h4l10.5-10.5a2.1 2.1 0 00-3-3L5 17v3zM13.5 6.5l3 3',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
  pin: 'M12 21s-7-6.1-7-11.5A7 7 0 0112 2.5a7 7 0 017 7C19 14.9 12 21 12 21zM12 12a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  home: 'M3 11l9-7 9 7M5 9.5V20h5v-6h4v6h5V9.5',
  work: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16',
  phone: 'M6.6 3h3l1.5 4-2 1.3a11 11 0 005.6 5.6l1.3-2 4 1.5v3a2 2 0 01-2.2 2A17 17 0 014.6 5.2 2 2 0 016.6 3z',
  card: 'M3 6h18v12H3zM3 10h18M7 15h4',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 017 0v3',
  key: 'M14.5 4a5.5 5.5 0 11-4.9 8l-5.6 5.6V21h3.4v-2h2v-2h2l1.2-1.2A5.5 5.5 0 0114.5 4zM16 8.5h.01',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7',
  info: 'M12 8h.01M11 12h1v5h1M12 21a9 9 0 100-18 9 9 0 000 18z',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  shield: 'M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3zM9 12l2 2 4-4',
  bell: 'M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3C7.7 6.2 6 8.4 6 11v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z',
  box: 'M3.5 7.5L12 3l8.5 4.5v9L12 21l-8.5-4.5v-9zM3.5 7.5L12 12l8.5-4.5M12 12v9',
  truck: 'M3 6h11v10H3zM14 9h4l3 3.5V16h-7M7.5 18.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17.5 18.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  gift: 'M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7H8.5a2 2 0 110-4C11 3 12 7 12 7zM12 7h3.5a2 2 0 100-4C13 3 12 7 12 7z',
  alert: 'M12 9v4M12 16.5h.01M10.3 4.2L2.6 17.5A2 2 0 004.3 20.5h15.4a2 2 0 001.7-3L13.7 4.2a2 2 0 00-3.4 0z',
  undo: 'M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 010 11H11',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z',
  coin: 'M12 21a9 9 0 100-18 9 9 0 000 18zM14.5 9.5c-.4-.9-1.4-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.6 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.1 0-2.1-.6-2.5-1.5M12 6.5V8m0 8v1.5',
  search: 'M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z',
  bone: 'M8.4 6.4l9.2 9.2M6.4 8.4l9.2 9.2M2.8 7.5a2.2 2.2 0 104.4 0 2.2 2.2 0 10-4.4 0M5.3 5a2.2 2.2 0 104.4 0 2.2 2.2 0 10-4.4 0M14.3 19a2.2 2.2 0 104.4 0 2.2 2.2 0 10-4.4 0M16.8 16.5a2.2 2.2 0 104.4 0 2.2 2.2 0 10-4.4 0',
  ball: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3.6 9.2c4.6 1.8 12.2 1.8 16.8 0M3.6 14.8c4.6-1.8 12.2-1.8 16.8 0',
  sort: 'M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3',
  filter: 'M4 5h16l-6 7.5V19l-4 2v-8.5L4 5z',
  sliders: 'M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4',
  reset: 'M4 12a8 8 0 1 0 2.3-5.6L4 8.7M4 4v4.7h4.7',
  bag: 'M5 8h14l-1 12H6L5 8zM9 8V6a3 3 0 016 0v2',
  minus: 'M5 12h14',
  ban: 'M12 21a9 9 0 100-18 9 9 0 000 18zM5.6 5.6l12.8 12.8',
  paw: 'M8.5 8a1.8 1.8 0 100-3.6 1.8 1.8 0 000 3.6zM15.5 8a1.8 1.8 0 100-3.6 1.8 1.8 0 000 3.6zM5 12.2a1.7 1.7 0 100-3.4 1.7 1.7 0 000 3.4zM19 12.2a1.7 1.7 0 100-3.4 1.7 1.7 0 000 3.4zM12 11c-2.5 0-5 3.2-5 5.6 0 1.6 1.2 2.4 2.6 2.4 1 0 1.6-.5 2.4-.5s1.4.5 2.4.5c1.4 0 2.6-.8 2.6-2.4 0-2.4-2.5-5.6-5-5.6z',
  store: 'M3 9l1.5-5h15L21 9M3 9h18M3 9v1a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0V9M5 13v7h14v-7M10 20v-4h4v4',
  chat: 'M5 5h14v10H10l-4 4v-4H5zM9 10h.01M12 10h.01M15 10h.01',
  repeat: 'M17 2l3 3-3 3M4 11V9a4 4 0 014-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 01-4 4H4',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 100-8 4 4 0 000 8z',
  cake: 'M4 21h16M5 21v-7a2 2 0 012-2h10a2 2 0 012 2v7M5 16c2 1.5 4 1.5 7 0s5-1.5 7 0M12 12V8M12 5.5a1 1 0 100-2 1 1 0 000 2z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5M11 6l-6 6 6 6',
  refresh: 'M20 11a8 8 0 10-2.3 5.7M20 4v7h-7',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  eyeOff: 'M3 3l18 18M10.6 6A9.8 9.8 0 0112 5.9c6 0 9.5 6.1 9.5 6.1a17 17 0 01-3 3.7M6.5 7.6A17 17 0 002.5 12s3.5 6.1 9.5 6.1a9.5 9.5 0 004.3-1M9.9 10a3 3 0 004.1 4.1',
  logout: 'M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 16l-4-4 4-4M6 12h11',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  power: 'M12 3v8M7.1 6.3a7.5 7.5 0 109.8 0',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4.5 20a7.5 7.5 0 0115 0',
  send: 'M4 12l16-8-6 16-2.5-6.5L4 12zM11.5 13.5L20 4',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
};

export function Icon({ name, className = 'w-[18px] h-[18px]', strokeWidth = 1.8 }: { name: keyof typeof P | string; className?: string; strokeWidth?: number }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name] ?? ''} />
    </svg>
  );
}

/**
 * Admin picks an emoji in Page Builder; the site shows the matching mint
 * line icon instead, so pages stay calm and in one style.
 */
export const LINE_ICON: Record<string, string> = {
  '🚚': 'truck', '📦': 'box', '🔒': 'lock', '💳': 'card', '🐾': 'paw', '🐕': 'paw', '🐶': 'paw', '🎁': 'gift', '↩️': 'undo',
  '⭐': 'star', '✨': 'sparkle', '🦴': 'bone', '🍖': 'bone', '🧸': 'ball', '🎾': 'ball', '⚽': 'ball', '🛡️': 'shield', '📍': 'pin', '💬': 'chat', '🔄': 'repeat', '🔁': 'repeat', '❤️': 'heart', '💚': 'heart',
  '📅': 'calendar', '🗓️': 'calendar', '✅': 'check', '📞': 'phone', '✉️': 'mail', '📧': 'mail', '🔔': 'bell', '🏪': 'store', '🛍️': 'bag', '💰': 'coin',
};

/** A Page Builder emoji as a line icon (or the emoji in grey when there's no match). */
export function LineIcon({ emoji, className = 'w-5 h-5', strokeWidth = 1.8 }: { emoji: string; className?: string; strokeWidth?: number }) {
  const name = LINE_ICON[emoji] ?? LINE_ICON[emoji?.replace(/\uFE0F/g, '')];
  return name ? <Icon name={name} className={className} strokeWidth={strokeWidth} />
    : <span className="grayscale opacity-70 leading-none" aria-hidden="true">{emoji}</span>;
}
