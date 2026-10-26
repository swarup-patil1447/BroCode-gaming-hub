/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#05070a',
          900: '#0a0d14',
          850: '#0f141f',
          800: '#141b29',
          700: '#1d273b',
          600: '#2b3952',
        },
        cyber: {
          cyan: '#00f2ff',
          magenta: '#ff007f',
          green: '#00ff88',
          amber: '#ffb700',
          red: '#ff3366',
          purple: '#9d00ff',
          blue: '#0066ff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Rajdhani', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -5px rgba(0, 242, 255, 0.4)',
        'glow-magenta': '0 0 20px -5px rgba(255, 0, 127, 0.4)',
        'glow-green': '0 0 20px -5px rgba(0, 255, 136, 0.4)',
        'glow-red': '0 0 20px -5px rgba(255, 51, 102, 0.4)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
