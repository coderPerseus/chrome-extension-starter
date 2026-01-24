import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  // webExt: {
  //   disabled: true,
  // },

  // dev: {
  //   server: {
  //     port: 3331,
  //   },
  // },
  srcDir: "src",
  modules: [
    "@wxt-dev/module-react",
    "@wxt-dev/auto-icons",
    "@wxt-dev/i18n/module",
  ],
  autoIcons: {
    baseIconPath: "assets/logo.png",
    developmentIndicator: false,
  },
  manifest: {
    name: "__MSG_appName__",
    description: "__MSG_appDescription__",
    default_locale: "en",
    permissions: ["storage"],
    web_accessible_resources: [
      {
        resources: ["onboarding-injected.js"],
        matches: ["*://*/*"],
      },
    ],
  },
});
