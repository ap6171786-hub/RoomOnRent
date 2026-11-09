/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: '#1f1933',
        muted: '#716b80',
        line: '#e9e5f2',
        brand: { 50: '#f5f0ff', 100: '#ede5ff', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#3b176f' },
      },
      fontFamily: { sans: ['DM Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 12px 40px rgba(49, 26, 91, 0.07)' },
    },
  },
  plugins: [],
};
