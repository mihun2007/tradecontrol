"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { defaultLanguage, isAppLanguage, languageStorageKey, type AppLanguage } from "@/lib/languages";
import { russianDomTranslations } from "@/lib/russian-dom-translations";
import { useUserProfile } from "@/components/user-profile-provider";

type TranslationKey =
  | "brand.subtitle"
  | "common.settings"
  | "common.syncing"
  | "nav.dashboard"
  | "nav.calendar"
  | "nav.trades"
  | "nav.analytics"
  | "nav.riskManager"
  | "nav.expenses"
  | "nav.aiCoach"
  | "nav.reports"
  | "nav.pricing"
  | "nav.settings"
  | "sidebar.riskStatus"
  | "sidebar.mobileReady"
  | "sidebar.mobileReadyDetail"
  | "topbar.openMenu"
  | "topbar.goodMorning"
  | "topbar.tradingDashboard"
  | "topbar.proPlan"
  | "topbar.freePlan"
  | "topbar.search"
  | "topbar.addTrade"
  | "topbar.openProfileMenu"
  | "topbar.signOut"
  | "settings.language.eyebrow"
  | "settings.language.title"
  | "settings.language.description"
  | "settings.language.field"
  | "settings.language.note"
  | "settings.language.applied";

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: TranslationKey) => string;
};

const translations: Record<AppLanguage, Record<TranslationKey, string>> = {
  en: {
    "brand.subtitle": "Journal and risk desk",
    "common.settings": "Settings",
    "common.syncing": "Syncing",
    "nav.dashboard": "Dashboard",
    "nav.calendar": "Calendar",
    "nav.trades": "Trades",
    "nav.analytics": "Analytics",
    "nav.riskManager": "Risk Manager",
    "nav.expenses": "Expenses",
    "nav.aiCoach": "AI Coach",
    "nav.reports": "Reports",
    "nav.pricing": "Pricing",
    "nav.settings": "Settings",
    "sidebar.riskStatus": "Risk status",
    "sidebar.mobileReady": "Mobile ready",
    "sidebar.mobileReadyDetail": "Navigation closes automatically when you change pages.",
    "topbar.openMenu": "Open menu",
    "topbar.goodMorning": "Good morning",
    "topbar.tradingDashboard": "Trading Dashboard",
    "topbar.proPlan": "Pro Plan",
    "topbar.freePlan": "Free Plan",
    "topbar.search": "Search",
    "topbar.addTrade": "Add Trade",
    "topbar.openProfileMenu": "Open profile menu",
    "topbar.signOut": "Sign Out",
    "settings.language.eyebrow": "Language Settings",
    "settings.language.title": "Interface language",
    "settings.language.description": "Choose the language used across TradeControl. English remains the base language and fallback.",
    "settings.language.field": "Display language",
    "settings.language.note": "This preference is applied instantly and saved to your Firestore profile when you save settings.",
    "settings.language.applied": "Language applied."
  },
  ro: {
    "brand.subtitle": "Jurnal si birou de risc",
    "common.settings": "Setari",
    "common.syncing": "Sincronizare",
    "nav.dashboard": "Dashboard",
    "nav.calendar": "Calendar",
    "nav.trades": "Tranzactii",
    "nav.analytics": "Analitice",
    "nav.riskManager": "Manager risc",
    "nav.expenses": "Cheltuieli",
    "nav.aiCoach": "Coach AI",
    "nav.reports": "Rapoarte",
    "nav.pricing": "Preturi",
    "nav.settings": "Setari",
    "sidebar.riskStatus": "Status risc",
    "sidebar.mobileReady": "Gata pentru mobil",
    "sidebar.mobileReadyDetail": "Navigarea se inchide automat cand schimbi pagina.",
    "topbar.openMenu": "Deschide meniul",
    "topbar.goodMorning": "Buna dimineata",
    "topbar.tradingDashboard": "Dashboard trading",
    "topbar.proPlan": "Plan Pro",
    "topbar.freePlan": "Plan Gratuit",
    "topbar.search": "Cautare",
    "topbar.addTrade": "Adauga tranzactie",
    "topbar.openProfileMenu": "Deschide meniul profilului",
    "topbar.signOut": "Deconectare",
    "settings.language.eyebrow": "Setari limba",
    "settings.language.title": "Limba interfetei",
    "settings.language.description": "Alege limba folosita in TradeControl. Engleza ramane limba de baza si fallback.",
    "settings.language.field": "Limba afisata",
    "settings.language.note": "Preferinta se aplica instant si se salveaza in profilul Firestore cand salvezi setarile.",
    "settings.language.applied": "Limba aplicata."
  },
  ru: {
    "brand.subtitle": "Журнал и контроль рисков",
    "common.settings": "Настройки",
    "common.syncing": "Синхронизация",
    "nav.dashboard": "Панель",
    "nav.calendar": "Календарь",
    "nav.trades": "Сделки",
    "nav.analytics": "Аналитика",
    "nav.riskManager": "Риск-менеджер",
    "nav.expenses": "Расходы",
    "nav.aiCoach": "AI-тренер",
    "nav.reports": "Отчеты",
    "nav.pricing": "Тарифы",
    "nav.settings": "Настройки",
    "sidebar.riskStatus": "Статус риска",
    "sidebar.mobileReady": "Готово для мобильных устройств",
    "sidebar.mobileReadyDetail": "Навигация закрывается автоматически при переходе на другую страницу.",
    "topbar.openMenu": "Открыть меню",
    "topbar.goodMorning": "Доброе утро",
    "topbar.tradingDashboard": "Торговая панель",
    "topbar.proPlan": "План Pro",
    "topbar.freePlan": "Бесплатный план",
    "topbar.search": "Поиск",
    "topbar.addTrade": "Добавить сделку",
    "topbar.openProfileMenu": "Открыть меню профиля",
    "topbar.signOut": "Выйти",
    "settings.language.eyebrow": "Настройки языка",
    "settings.language.title": "Язык интерфейса",
    "settings.language.description": "Выберите язык TradeControl. Английский остается базовым языком и резервным вариантом.",
    "settings.language.field": "Язык отображения",
    "settings.language.note": "Настройка применяется сразу и сохраняется в профиль Firestore при сохранении.",
    "settings.language.applied": "Язык применен."
  },
  es: {
    "brand.subtitle": "Diario y mesa de riesgo",
    "common.settings": "Configuracion",
    "common.syncing": "Sincronizando",
    "nav.dashboard": "Panel",
    "nav.calendar": "Calendario",
    "nav.trades": "Operaciones",
    "nav.analytics": "Analitica",
    "nav.riskManager": "Riesgo",
    "nav.expenses": "Gastos",
    "nav.aiCoach": "Coach AI",
    "nav.reports": "Informes",
    "nav.pricing": "Precios",
    "nav.settings": "Configuracion",
    "sidebar.riskStatus": "Estado de riesgo",
    "sidebar.mobileReady": "Listo para movil",
    "sidebar.mobileReadyDetail": "La navegacion se cierra automaticamente al cambiar de pagina.",
    "topbar.openMenu": "Abrir menu",
    "topbar.goodMorning": "Buenos dias",
    "topbar.tradingDashboard": "Panel de trading",
    "topbar.proPlan": "Plan Pro",
    "topbar.freePlan": "Plan gratis",
    "topbar.search": "Buscar",
    "topbar.addTrade": "Agregar operacion",
    "topbar.openProfileMenu": "Abrir perfil",
    "topbar.signOut": "Cerrar sesion",
    "settings.language.eyebrow": "Idioma",
    "settings.language.title": "Idioma de la interfaz",
    "settings.language.description": "Elige el idioma de TradeControl. El ingles sigue siendo la base y fallback.",
    "settings.language.field": "Idioma mostrado",
    "settings.language.note": "Se aplica al instante y se guarda al guardar la configuracion.",
    "settings.language.applied": "Idioma aplicado."
  },
  fr: {
    "brand.subtitle": "Journal et gestion du risque",
    "common.settings": "Parametres",
    "common.syncing": "Synchronisation",
    "nav.dashboard": "Tableau de bord",
    "nav.calendar": "Calendrier",
    "nav.trades": "Trades",
    "nav.analytics": "Analytique",
    "nav.riskManager": "Risque",
    "nav.expenses": "Depenses",
    "nav.aiCoach": "Coach IA",
    "nav.reports": "Rapports",
    "nav.pricing": "Tarifs",
    "nav.settings": "Parametres",
    "sidebar.riskStatus": "Statut du risque",
    "sidebar.mobileReady": "Pret pour mobile",
    "sidebar.mobileReadyDetail": "La navigation se ferme automatiquement au changement de page.",
    "topbar.openMenu": "Ouvrir le menu",
    "topbar.goodMorning": "Bonjour",
    "topbar.tradingDashboard": "Tableau trading",
    "topbar.proPlan": "Plan Pro",
    "topbar.freePlan": "Plan gratuit",
    "topbar.search": "Rechercher",
    "topbar.addTrade": "Ajouter un trade",
    "topbar.openProfileMenu": "Ouvrir le profil",
    "topbar.signOut": "Se deconnecter",
    "settings.language.eyebrow": "Langue",
    "settings.language.title": "Langue de l'interface",
    "settings.language.description": "Choisissez la langue de TradeControl. L'anglais reste la base et le fallback.",
    "settings.language.field": "Langue affichee",
    "settings.language.note": "Le choix s'applique instantanement et se sauvegarde avec les parametres.",
    "settings.language.applied": "Langue appliquee."
  },
  de: {
    "brand.subtitle": "Journal und Risiko-Desk",
    "common.settings": "Einstellungen",
    "common.syncing": "Synchronisieren",
    "nav.dashboard": "Dashboard",
    "nav.calendar": "Kalender",
    "nav.trades": "Trades",
    "nav.analytics": "Analysen",
    "nav.riskManager": "Risikomanager",
    "nav.expenses": "Ausgaben",
    "nav.aiCoach": "AI Coach",
    "nav.reports": "Berichte",
    "nav.pricing": "Preise",
    "nav.settings": "Einstellungen",
    "sidebar.riskStatus": "Risikostatus",
    "sidebar.mobileReady": "Mobil bereit",
    "sidebar.mobileReadyDetail": "Die Navigation schliesst automatisch beim Seitenwechsel.",
    "topbar.openMenu": "Menu offnen",
    "topbar.goodMorning": "Guten Morgen",
    "topbar.tradingDashboard": "Trading Dashboard",
    "topbar.proPlan": "Pro Plan",
    "topbar.freePlan": "Free Plan",
    "topbar.search": "Suchen",
    "topbar.addTrade": "Trade hinzufugen",
    "topbar.openProfileMenu": "Profilmenu offnen",
    "topbar.signOut": "Abmelden",
    "settings.language.eyebrow": "Sprache",
    "settings.language.title": "Sprache der Oberflache",
    "settings.language.description": "Wahle die Sprache fur TradeControl. Englisch bleibt Basis und Fallback.",
    "settings.language.field": "Anzeigesprache",
    "settings.language.note": "Die Auswahl gilt sofort und wird beim Speichern im Profil gesichert.",
    "settings.language.applied": "Sprache angewendet."
  },
  it: {
    "brand.subtitle": "Diario e gestione rischio",
    "common.settings": "Impostazioni",
    "common.syncing": "Sincronizzazione",
    "nav.dashboard": "Dashboard",
    "nav.calendar": "Calendario",
    "nav.trades": "Trade",
    "nav.analytics": "Analisi",
    "nav.riskManager": "Rischio",
    "nav.expenses": "Spese",
    "nav.aiCoach": "Coach AI",
    "nav.reports": "Report",
    "nav.pricing": "Prezzi",
    "nav.settings": "Impostazioni",
    "sidebar.riskStatus": "Stato rischio",
    "sidebar.mobileReady": "Pronto per mobile",
    "sidebar.mobileReadyDetail": "La navigazione si chiude automaticamente quando cambi pagina.",
    "topbar.openMenu": "Apri menu",
    "topbar.goodMorning": "Buongiorno",
    "topbar.tradingDashboard": "Dashboard trading",
    "topbar.proPlan": "Piano Pro",
    "topbar.freePlan": "Piano gratuito",
    "topbar.search": "Cerca",
    "topbar.addTrade": "Aggiungi trade",
    "topbar.openProfileMenu": "Apri profilo",
    "topbar.signOut": "Esci",
    "settings.language.eyebrow": "Lingua",
    "settings.language.title": "Lingua interfaccia",
    "settings.language.description": "Scegli la lingua di TradeControl. L'inglese resta base e fallback.",
    "settings.language.field": "Lingua visualizzata",
    "settings.language.note": "La preferenza si applica subito e si salva nel profilo.",
    "settings.language.applied": "Lingua applicata."
  },
  pt: {
    "brand.subtitle": "Diario e mesa de risco",
    "common.settings": "Configuracoes",
    "common.syncing": "Sincronizando",
    "nav.dashboard": "Painel",
    "nav.calendar": "Calendario",
    "nav.trades": "Trades",
    "nav.analytics": "Analises",
    "nav.riskManager": "Risco",
    "nav.expenses": "Despesas",
    "nav.aiCoach": "Coach IA",
    "nav.reports": "Relatorios",
    "nav.pricing": "Precos",
    "nav.settings": "Configuracoes",
    "sidebar.riskStatus": "Status de risco",
    "sidebar.mobileReady": "Pronto para mobile",
    "sidebar.mobileReadyDetail": "A navegacao fecha automaticamente ao mudar de pagina.",
    "topbar.openMenu": "Abrir menu",
    "topbar.goodMorning": "Bom dia",
    "topbar.tradingDashboard": "Painel de trading",
    "topbar.proPlan": "Plano Pro",
    "topbar.freePlan": "Plano gratis",
    "topbar.search": "Buscar",
    "topbar.addTrade": "Adicionar trade",
    "topbar.openProfileMenu": "Abrir perfil",
    "topbar.signOut": "Sair",
    "settings.language.eyebrow": "Idioma",
    "settings.language.title": "Idioma da interface",
    "settings.language.description": "Escolha o idioma do TradeControl. Ingles continua sendo base e fallback.",
    "settings.language.field": "Idioma exibido",
    "settings.language.note": "A preferencia aplica imediatamente e salva no perfil ao salvar.",
    "settings.language.applied": "Idioma aplicado."
  }
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { profile } = useUserProfile();
  const [language, setLanguageState] = useState<AppLanguage>(defaultLanguage);

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(languageStorageKey);
    setLanguageState(isAppLanguage(storedLanguage) ? storedLanguage : defaultLanguage);
  }, []);

  useEffect(() => {
    if (profile?.preferredLanguage) {
      const storedLanguage = window.localStorage.getItem(languageStorageKey);

      if (isAppLanguage(storedLanguage)) {
        setLanguageState(storedLanguage);
        return;
      }

      setLanguageState(profile.preferredLanguage);
      window.localStorage.setItem(languageStorageKey, profile.preferredLanguage);
    }
  }, [profile?.preferredLanguage]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dataset.language = language;
  }, [language]);

  useEffect(() => {
    if (language !== "ru") {
      return;
    }

    const translate = () => translateRussianDom(document.body);
    translate();

    const observer = new MutationObserver(() => translate());
    observer.observe(document.body, { characterData: true, childList: true, subtree: true });

    return () => observer.disconnect();
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage(nextLanguage) {
      setLanguageState(nextLanguage);
      window.localStorage.setItem(languageStorageKey, nextLanguage);
      document.documentElement.lang = nextLanguage;
    },
    t(key) {
      return translations[language]?.[key] ?? translations.en[key] ?? key;
    }
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider.");
  }

  return context;
}

function translateRussianDom(root: HTMLElement) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parent = node.parentElement;

    if (!parent || shouldSkipTranslation(parent)) {
      continue;
    }

    textNodes.push(node);
  }

  textNodes.forEach((node) => {
    const original = node.nodeValue ?? "";
    const translated = translateRussianText(original);

    if (translated !== original) {
      node.nodeValue = translated;
    }
  });

  root.querySelectorAll("input[placeholder], textarea[placeholder], option, [aria-label]").forEach((element) => {
    if (element instanceof HTMLOptionElement) {
      const original = element.textContent ?? "";
      const translated = translateRussianText(original);

      if (translated !== original) {
        element.textContent = translated;
      }
    }

    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const placeholder = element.getAttribute("placeholder");
      if (placeholder) {
        element.setAttribute("placeholder", translateRussianText(placeholder));
      }
    }

    const ariaLabel = element.getAttribute("aria-label");
    if (ariaLabel) {
      element.setAttribute("aria-label", translateRussianText(ariaLabel));
    }
  });
}

function translateRussianText(text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    return text;
  }

  const exact = russianDomTranslations[trimmed];
  if (exact) {
    return text.replace(trimmed, exact);
  }

  let translated = trimmed;
  Object.entries(russianDomTranslations)
    .sort((first, second) => second[0].length - first[0].length)
    .forEach(([source, target]) => {
      translated = translated.replaceAll(source, target);
    });
  translated = translated.replace(/\s+of\s+/g, " из ");
  translated = translated.replaceAll("ОткрытаAI", "OpenAI");

  return translated === trimmed ? text : text.replace(trimmed, translated);
}

function shouldSkipTranslation(element: HTMLElement) {
  return Boolean(element.closest("script, style, code, pre, input, textarea, [data-no-translate]"));
}
