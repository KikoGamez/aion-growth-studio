/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Legacy AION colors (kept for compatibility)
        aion: {
          dark: '#0B1B3D',
          primary: '#1A5490',
          blue: '#2E75B6',
          cyan: '#00D4FF',
        },
        // The Analytical Monolith Design System
        primary: {
          DEFAULT: '#000e41',
          light: '#001f70',
        },
        surface: {
          DEFAULT: '#f7f9ff',
          'container-low': '#edf4ff',
          'container-lowest': '#ffffff',
        },
        'on-surface': '#001d32',
        'on-surface-variant': '#526070',
        'outline-variant': '#c2c8d2',
        'tertiary-fixed': '#69ff87',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        'editorial': '-0.02em',
        'label': '0.08em',
      },
      boxShadow: {
        'ambient': '0 12px 40px rgba(0, 29, 50, 0.06)',
        'ambient-hover': '0 16px 48px rgba(0, 29, 50, 0.10)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #000e41 0%, #001f70 100%)',
      },
    },
  },
  plugins: [],
}
