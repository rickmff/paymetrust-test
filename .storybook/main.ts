import type { StorybookConfig } from "@storybook/react-vite";

// Storybook's Vite builder loads vite.config.ts by itself, so stories get the
// same plugins (React, Tailwind) and the same "@/" alias as the app.
const config: StorybookConfig = {
  framework: "@storybook/react-vite",
  stories: ["../src/**/*.stories.tsx"],
  addons: ["@storybook/addon-docs"],
  core: { disableTelemetry: true, disableWhatsNewNotifications: true },
};

export default config;
