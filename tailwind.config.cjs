/** @type {import('tailwindcss').Config} */
module.exports = {
darkMode: ["class"],
content: [
"./client/index.html",
"./client/src/**/*.{js,ts,jsx,tsx}",
],
theme: {
extend: {
fontFamily: {
sans: ["Inter", "sans-serif"],
heading: ["Space Grotesk", "sans-serif"],
},
},
},
plugins: [require("tailwindcss-animate")],
};