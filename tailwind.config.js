/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        railway: {
          dark: '#0B0F19',
          card: '#111827',
          border: '#1F2937',
          accent: '#3B82F6',
          ladies: '#EC4899',
          firstClass: '#EF4444',
          general: '#8B5CF6',
          acLocal: '#06B6D4',
          fobGreen: '#10B981',
          fobAmber: '#F59E0B',
          fobRed: '#EF4444'
        }
      }
    },
  },
  plugins: [],
}
