/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'sentry-dark': '#0F172A',
        'sentry-card': '#1E293B',
        'sentry-accent': '#38BDF8',
        'sentry-green': '#22C55E',
        'sentry-red': '#EF4444',
      }
    },
  },
  plugins: [],
}