import type { Config } from 'tailwindcss';

/**
 * "Sunny Playground": deep teal, sunshine yellow, coral, on a warm cream.
 * The teal scale replaces Tailwind's own, so every teal-* class across the
 * site takes the brand teal.
 */
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        teal: {
          50: '#E8F5F3',
          100: '#CDEBE6',
          200: '#9FD8CF',
          300: '#6BC0B4',
          400: '#3A9E91',
          500: '#167A70',
          600: '#0B5D57',
          700: '#084A45',
          800: '#063D39',
          900: '#04302D',
        },
        sun: { 100: '#FFF0C2', 300: '#FFDA6E', 400: '#FFC93C', 600: '#E0A500' },
        coral: { 100: '#FFE3DE', 400: '#FF6B57', 600: '#C94A39' },
        ink: '#12302D',
        cream: '#FFF8E7',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Noto Sans Georgian', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        step: '0 4px 0 #063D39',
        'step-ink': '0 5px 0 #12302D',
        'step-coral': '0 4px 0 #C94A39',
      },
    },
  },
  plugins: [],
};

export default config;
