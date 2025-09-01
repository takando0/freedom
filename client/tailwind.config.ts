import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#51AF3D',
          dark: '#0F5431',
        },
      },
      fontFamily: {
        museum: ['"Museum of Sons"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;



