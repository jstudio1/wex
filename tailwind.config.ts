import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#000000',
          light: '#1a1a1a'
        },
        card: {
          DEFAULT: '#0a0a0a',
          light: '#1a1a1a'
        },
        text: {
          DEFAULT: '#ffffff',
          light: '#ffffff'
        },
        accent: '#10b981'
      },
      spacing: {
        compact: '0.625rem' // 10px
      },
      borderRadius: {
        lg: '0.6rem'
      },
      animation: {
        marquee: 'marquee var(--duration) infinite linear',
        'marquee-vertical': 'marquee-vertical var(--duration) linear infinite',
      }
    }
  },
  darkMode: ['class'],
  plugins: []
};

export default config;



