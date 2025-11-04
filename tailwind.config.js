/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        coral: {
          50: '#FEF3F2',
          100: '#FEE5E2',
          200: '#FDCFC9',
          300: '#FBABA4',
          400: '#F87A6F',
          500: '#EF5844',
          600: '#E94F37',
          700: '#C43728',
          800: '#A32F24',
          900: '#872B23',
          950: '#4A130E',
        },
      },
    },
  },
  plugins: [],
};
