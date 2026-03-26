/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        aion: {
          dark: '#0B1B3D',
          primary: '#1A5490',
          blue: '#2E75B6',
          cyan: '#00D4FF',
        },
        // New marketing design system
        'primary': '#000e41',
        'primary-container': '#001f70',
        'on-primary': '#ffffff',
        'on-primary-container': '#6888ff',

        'secondary': '#49607c',
        'secondary-container': '#c7dfff',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#4b637e',
        'on-secondary-fixed': '#011d35',

        'accent': '#69ff87',
        'tertiary': '#001905',
        'tertiary-container': '#00300e',

        'surface': '#f7f9ff',
        'surface-bright': '#f7f9ff',
        'surface-dim': '#c1ddfb',
        'surface-container': '#e3efff',
        'surface-container-low': '#edf4ff',
        'surface-container-lowest': '#ffffff',
        'surface-container-high': '#d8eaff',
        'surface-container-highest': '#cee5ff',

        'on-surface': '#001d32',
        'on-surface-variant': '#43474d',
        'background': '#f7f9ff',

        'outline': '#74777e',
        'outline-variant': '#c3c6ce',

        'error': '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',

        'foreground': '#001d32',
        'border': '#c3c6ce',

        // Dashboard-specific legacy colors
        'green': '#1d9e75',
        'amber': '#ba7517',
        'coral': '#d85a30',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        headline: ['Inter'],
        body: ['Inter'],
        label: ['Inter'],
      },
      letterSpacing: {
        'editorial': '-0.05em',
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        lg: '0.25rem',
        xl: '0.5rem',
        full: '9999px',
      },
    },
  },
  plugins: [],
}
