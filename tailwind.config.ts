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
          DEFAULT: '#0b0b0c',
          light: '#f5f6f7'
        },
        card: {
          DEFAULT: '#121214',
          light: '#ffffff'
        },
        text: {
          DEFAULT: '#e7e7ea',
          light: '#0e0f10'
        },
        accent: '#7c3aed'
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



