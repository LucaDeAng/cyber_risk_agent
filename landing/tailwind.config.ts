import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0B0F1A',
        'bg-raised': '#121828',
        'bg-elevated': '#1A2238',
        text: '#E8EDF7',
        'text-dim': '#8C97AE',
        accent: '#7B9CFF',
        'accent-deep': '#3E58B8',
        warm: '#E6B970',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Helvetica Neue', 'sans-serif'],
      },
      animation: {
        breathe: 'breathe 4.4s ease-in-out infinite',
        'breathe-slow': 'breathe 6s ease-in-out infinite',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.55' },
          '50%': { transform: 'scale(1.08)', opacity: '0.9' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
