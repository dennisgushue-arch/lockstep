/** Tailwind config for Lockstep (Vite + client/)
 * Includes common globs for Vite apps and the `client` subfolder found in this repo.
 * Restart the dev server after adding this file so Tailwind picks up the new `content` globs.
 */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,html}",
    "./client/**/*.{js,ts,jsx,tsx,html}",
    "./client/client/**/*.{js,ts,jsx,tsx,html}", // include nested client folder if present
    "./components/**/*.{js,ts,jsx,tsx,html}",
    "./pages/**/*.{js,ts,jsx,tsx,html}",
    "./**/*.md" // optional: include markdown files if you embed classes there
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  // Optional safelist: uncomment and add classes you generate dynamically and want preserved.
  // safelist: [
  //   'bg-red-500',
  //   { pattern: /^(bg|text|border)-(red|blue|green)-(400|500|600)$/ }
  // ],
};