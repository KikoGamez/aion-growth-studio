/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        aion: {
          dark: '#0B1B3D',
          primary: '#1A5490',
          blue: '#2E75B6',
          cyan: '#00D4FF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        'editorial': '-0.05em',
      },
    },
  },
  plugins: [],
}
