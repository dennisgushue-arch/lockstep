/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./client/index.html",
    "./client/src/**/*.{js,ts,jsx,tsx}",
    "./client/src/components/**/*.{js,ts,jsx,tsx}",
    "./client/src/pages/**/*.{js,ts,jsx,tsx}",
  ],
  theme: { 
    extend: {} 
  },
  plugins: [],
};