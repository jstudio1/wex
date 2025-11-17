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
        accent: '#dc2626'
      },
      spacing: {
        compact: '0.625rem' // 10px
      },
      borderRadius: {
        lg: '0.6rem'
      }
    }
  },
  darkMode: ['class'],
  plugins: []
};

export default config;



