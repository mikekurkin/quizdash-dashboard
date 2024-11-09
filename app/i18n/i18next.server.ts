import { createCookie } from '@remix-run/node';
import Backend from 'i18next-fs-backend';
import { resolve } from 'node:path';
import { RemixI18Next } from 'remix-i18next/server';
import { i18nConfig } from './config';

const i18next = new RemixI18Next({
  detection: {
    supportedLanguages: i18nConfig.supportedLngs,
    fallbackLanguage: i18nConfig.fallbackLng,
    cookie: createCookie('i18next', {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    }),
  },
  // This is the configuration for i18next used
  // when translating messages server-side only
  i18next: {
    ...i18nConfig,
    backend: {
      loadPath: resolve('./public/locales/{{lng}}/{{ns}}.json'),
    },
  },
  backend: Backend,
});

export default i18next;
