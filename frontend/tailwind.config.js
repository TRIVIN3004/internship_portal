/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#f8fafc',
        darkCard: '#ffffff',
        primaryBlue: '#2563eb',
        accentCyan: '#0891b2',
        warningOrange: '#ea580c',
        riskRed: '#dc2626',
        trackGreen: '#16a34a',
        slate: {
          50: '#020617',
          100: '#0f172a',
          200: '#1e293b',
          300: '#334155',
          400: '#475569',
          500: '#64748b',
          600: '#94a3b8',
          700: '#cbd5e1',
          800: '#e2e8f0',
          900: '#ffffff',
          950: '#f8fafc',
        }
      },
    },
  },
  plugins: [],
}
