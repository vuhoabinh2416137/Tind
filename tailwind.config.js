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
        messenger: {
          blue: '#0084FF',
          blueHover: '#0073e6',
          gradientStart: '#0084FF',
          gradientEnd: '#00C6FF',
          darkBg: '#18191a',
          darkCard: '#242526',
          darkHover: '#3a3b3c',
          darkBorder: '#393a3b',
          darkText: '#e4e6eb',
          darkSubtext: '#b0b3b8',
          lightBg: '#ffffff',
          lightCard: '#f0f2f5',
          lightHover: '#e4e6eb',
          lightBorder: '#e5e7eb',
          bubbleGrey: '#f0f2f5',
          bubbleGreyDark: '#303030'
        }
      },
      keyframes: {
        bounceDot: {
          '0%, 80%, 100%': { transform: 'scale(0)' },
          '40%': { transform: 'scale(1.0)' },
        },
        popIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        }
      },
      animation: {
        'bounce-dot-1': 'bounceDot 1.4s infinite ease-in-out',
        'bounce-dot-2': 'bounceDot 1.4s infinite ease-in-out 0.2s',
        'bounce-dot-3': 'bounceDot 1.4s infinite ease-in-out 0.4s',
        'pop-in': 'popIn 0.15s ease-out',
      }
    },
  },
  plugins: [],
}
