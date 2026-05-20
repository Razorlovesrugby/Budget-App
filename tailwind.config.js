/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0062F4',
          accent:  '#7B2FFF',
        },
        ui: {
          base:    '#E8F0FE',
          surface: '#FFFFFF',
        },
        text: {
          main: '#020C2A',
        },
      },
    },
  },
  plugins: [],
}
