/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7ff',
          100: '#ebf0ff',
          200: '#d6e0ff',
          300: '#b3c7ff',
          400: '#85a3ff',
          500: '#5673ff',
          600: '#334cff',
          700: '#2437e6',
          800: '#1e2cb3',
          900: '#1b268f',
        }
      }
    },
  },
  plugins: [],
}
