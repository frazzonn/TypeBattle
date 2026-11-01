// Arquivo gerado por scripts/build-languages.mjs. Não edite à mão.

export interface LanguageInfo {
  code: string;
  // Nome no próprio idioma (o que aparece) e em português (para a busca).
  label: string;
  name: string;
  locale: string;
  latin: boolean;
  // false: o idioma tem uma lista só e o seletor de dificuldade some.
  hasDifficulty: boolean;
}

export const DEFAULT_LANGUAGE = "portuguese";

export const LANGUAGES: readonly LanguageInfo[] = [
  {
    "code": "portuguese",
    "label": "Português",
    "name": "Português",
    "locale": "pt-BR",
    "latin": true,
    "hasDifficulty": true
  },
  {
    "code": "english",
    "label": "English",
    "name": "Inglês",
    "locale": "en-US",
    "latin": true,
    "hasDifficulty": true
  },
  {
    "code": "spanish",
    "label": "Español",
    "name": "Espanhol",
    "locale": "es-ES",
    "latin": true,
    "hasDifficulty": true
  },
  {
    "code": "french",
    "label": "Français",
    "name": "Francês",
    "locale": "fr-FR",
    "latin": true,
    "hasDifficulty": true
  },
  {
    "code": "german",
    "label": "Deutsch",
    "name": "Alemão",
    "locale": "de-DE",
    "latin": true,
    "hasDifficulty": true
  },
  {
    "code": "italian",
    "label": "Italiano",
    "name": "Italiano",
    "locale": "it-IT",
    "latin": true,
    "hasDifficulty": true
  },
  {
    "code": "dutch",
    "label": "Nederlands",
    "name": "Holandês",
    "locale": "nl-NL",
    "latin": true,
    "hasDifficulty": true
  },
  {
    "code": "polish",
    "label": "Polski",
    "name": "Polonês",
    "locale": "pl-PL",
    "latin": true,
    "hasDifficulty": true
  },
  {
    "code": "swedish",
    "label": "Svenska",
    "name": "Sueco",
    "locale": "sv-SE",
    "latin": true,
    "hasDifficulty": false
  },
  {
    "code": "turkish",
    "label": "Türkçe",
    "name": "Turco",
    "locale": "tr-TR",
    "latin": true,
    "hasDifficulty": false
  },
  {
    "code": "indonesian",
    "label": "Bahasa Indonesia",
    "name": "Indonésio",
    "locale": "id-ID",
    "latin": true,
    "hasDifficulty": true
  },
  {
    "code": "russian",
    "label": "Русский",
    "name": "Russo",
    "locale": "ru-RU",
    "latin": false,
    "hasDifficulty": true
  }
];
