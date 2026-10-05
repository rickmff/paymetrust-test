import type { Preview } from "@storybook/react-vite";
// The app's real stylesheet: Tailwind, then HeroUI's theme and components.
import "../src/index.css";

const preview: Preview = {
  parameters: {
    layout: "padded",
    // The page background comes from the theme (body has bg-background).
    backgrounds: { disable: true },
  },
};

export default preview;
