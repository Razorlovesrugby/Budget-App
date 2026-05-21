import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        // iPhone layout (default, mobile-first)
        // < 768px: iPhone card stack, bottom nav
        // >= 768px: iPad portrait
        'tablet': '768px',
        // >= 1024px: iPad landscape, full cockpit
        'desktop': '1024px',
      },
      fontVariantNumeric: {
        'tabular': 'tabular-nums',
      },
    },
  },
  plugins: [],
};
export default config;
