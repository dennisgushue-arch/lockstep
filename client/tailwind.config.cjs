/** Tailwind config - safe defaults for this repo.
 *
 * Notes:
 * - Keep content globs explicit to avoid scanning caches and top-level README files
 *   which can break Tailwind's parser (sucrase).
 * - If you need to scan markdown, point at a specific docs/ folder rather than "./**/*.md".
 */
module.exports = {
  content: [
    // App entry HTML (safe if void elements are self-closing)
    "./client/index.html",

    // React/TSX source
    "./client/src/**/*.{js,ts,jsx,tsx,html}",

    // Shared UI/components and pages
    "./components/**/*.{js,ts,jsx,tsx,html}",
    "./pages/**/*.{js,ts,jsx,tsx,html}",

    // Optional: only include project docs (safer than scanning all .md in repo)
    // "./docs/**/*.{md,mdx}"
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
