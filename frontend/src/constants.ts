export const LANGUAGE_VERSION = {
  javascript: "js",
  typescript: "ts",
  python: "py",
  java: "java",
  csharp: "cs",
  php: "php",
} as const;

export type UiLanguage = keyof typeof LANGUAGE_VERSION;
export type ApiLanguage = (typeof LANGUAGE_VERSION)[UiLanguage];
