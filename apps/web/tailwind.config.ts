import type { Config } from 'tailwindcss';

/**
 * Soft & friendly: a light mint-teal brand, soft slate text instead of
 * black, airy greys and generous rounding. The teal and gray scales replace
 * Tailwind's own, so every page takes the palette without per-page edits.
 */
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        teal: {
          50: '#F0FBF8',
          100: '#DDF6EF',
          200: '#BBEDE0',
          300: '#8FE0CC',
          400: '#5ECDB5',
          500: '#36B9A0',
          600: '#22A38B',
          700: '#1A8574',
          800: '#166A5E',
          900: '#12564D',
        },
        // Soft slate greys: headings read dark but never black.
        gray: {
          50: '#F7F9FA',
          100: '#EFF3F5',
          200: '#E3E9EC',
          300: '#CBD4DA',
          400: '#9AA7B1',
          500: '#6B7A86',
          600: '#52616D',
          700: '#3E4C57',
          800: '#2E3A44',
          900: '#24303A',
        },
        peach: { 50: '#FFF6F1', 100: '#FFE9DE', 400: '#FFA77E', 600: '#E9784A' },
        lilac: { 50: '#F6F4FF', 100: '#ECE8FF', 400: '#A897F5', 600: '#7C68E0' },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Noto Sans Georgian', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.875rem',
        xl: '1.125rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        soft: '0 10px 40px -12px rgba(36, 48, 58, 0.14)',
        glow: '0 12px 30px -10px rgba(34, 163, 139, 0.45)',
      },
    },
  },
  plugins: [],
};

export default config;
