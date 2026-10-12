import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** The home-screen icon on iPhones and iPads: the white paw on brand teal. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#22A38B' }}>
        <svg width="124" height="124" viewBox="0 0 48 48" fill="#fff">
          <circle cx="12" cy="18" r="4.4" /><circle cx="20" cy="11" r="4.4" /><circle cx="28" cy="11" r="4.4" /><circle cx="36" cy="18" r="4.4" />
          <path d="M24 21c-6 0-12 7.2-12 12.8 0 3.8 2.8 5.2 6 5.2 2.6 0 4-1.2 6-1.2s3.4 1.2 6 1.2c3.2 0 6-1.4 6-5.2C36 28.2 30 21 24 21z" />
        </svg>
      </div>
    ),
    size,
  );
}
