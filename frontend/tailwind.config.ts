export default {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
 safelist: [
  { pattern: /bg-(.*)/ },
]
,
  theme: {
    extend: {},
  },
  plugins: [],
};
