export type AppLanguage = "en" | "ro" | "ru" | "es" | "fr" | "de" | "it" | "pt";

export const defaultLanguage: AppLanguage = "en";

export const languageStorageKey = "tradecontrol-language";

export const languageOptions: Array<{ code: AppLanguage; label: string; nativeName: string }> = [
  { code: "en", label: "English", nativeName: "English" },
  { code: "ro", label: "Romanian", nativeName: "Romana" },
  { code: "ru", label: "Russian", nativeName: "Русский" },
  { code: "es", label: "Spanish", nativeName: "Espanol" },
  { code: "fr", label: "French", nativeName: "Francais" },
  { code: "de", label: "German", nativeName: "Deutsch" },
  { code: "it", label: "Italian", nativeName: "Italiano" },
  { code: "pt", label: "Portuguese", nativeName: "Portugues" }
];

export function isAppLanguage(value: unknown): value is AppLanguage {
  return typeof value === "string" && languageOptions.some((language) => language.code === value);
}
