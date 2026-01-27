/** Tailwind config for Lockstep (Vite + client/)
 * Note: removed the overly-broad "./**/*.md" pattern to avoid matching node_modules.
 */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,html}",
    "./client/**/*.{js,ts,jsx,tsx,html}",
    "./client/client/**/*.{js,ts,jsx,tsx,html}",
    "./components/**/*.{js,ts,jsx,tsx,html}",
    "./pages/**/*.{js,ts,jsx,tsx,html}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};