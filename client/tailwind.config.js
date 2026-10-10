/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FBF4E8",
        paper: "#F6EFE0",
        sage: "#A9C0A0",
        "sage-dark": "#6E8A66",
        blush: "#F3C9D4",
        "blush-dark": "#D98BA0",
        butter: "#F0C85A",
        "butter-dark": "#C98A2B",
        sky: "#BFD9E8",
        "sky-dark": "#6E9CB8",
        ink: "#2B2A28",
        "ink-soft": "#5B5850"
      },
      fontFamily: {
        display: ["'Bricolage Grotesque'", "sans-serif"],
        body: ["'Nunito'", "sans-serif"],
        hand: ["'Caveat'", "cursive"]
      },
      boxShadow: {
        card: "3px 3px 0 0 rgba(43,42,40,0.9)",
        "card-sm": "2px 2px 0 0 rgba(43,42,40,0.85)"
      }
    }
  },
  plugins: []
};
