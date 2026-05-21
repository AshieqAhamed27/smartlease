/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand
        accent: { DEFAULT: '#2c5f2e', dark: '#1a3d1c', light: '#4a8f4c', subtle: '#edf7f1' },
        // Text
        ink: { DEFAULT: '#0f0e0c', 2: '#4a4843', 3: '#8a8680', 4: '#b8b4ae' },
        // Backgrounds
        cream: '#faf8f4',
        paper: '#f3f0e8',
        // Borders
        border: { DEFAULT: '#e8e4da', 2: '#d4cfc4', 3: '#c0bbb0' },
        // Semantic
        danger: { DEFAULT: '#c0392b', light: '#fdf0ee', mid: '#f5c0bb' },
        warning: { DEFAULT: '#b85c00', light: '#fdf5e8', mid: '#fad9a0' },
        success: { DEFAULT: '#1a6b3a', light: '#edf7f1', mid: '#a8dbbe' },
        info: { DEFAULT: '#1a4d8f', light: '#edf2fc', mid: '#b5c8ef' },
        // Dark (sidebar)
        dark: { DEFAULT: '#111d11', 2: '#1a2e1a', 3: '#243424' },
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Instrument Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
      },
      animation: {
        'fade-up': 'fadeUp 0.25s ease forwards',
        'slide-in': 'slideIn 0.2s ease forwards',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      boxShadow: {
        card: '0 2px 16px rgba(0,0,0,0.07)',
        'card-lg': '0 8px 40px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
}
