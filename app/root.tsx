import type { LinksFunction, LoaderFunctionArgs } from '@remix-run/node'
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData } from '@remix-run/react'
import { useTranslation } from 'react-i18next'
import { useChangeLanguage } from 'remix-i18next/react'
import i18next from '~/i18n/i18next.server'

import clsx from 'clsx'
import { PreventFlashOnWrongTheme, ThemeProvider, useTheme } from 'remix-themes'
import { themeSessionResolver } from '~/sessions.server'

import styles from '~/tailwind.css?url'
import { QueryProvider } from './context/QueryProvider'

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: styles },
  { rel: 'icon', type: 'image/png', href: '/favicon-16x16.png' },
  { rel: 'icon', type: 'image/png', href: '/favicon-32x32.png' },
  { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
  { rel: 'manifest', href: '/site.webmanifest' },
  // // { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  // // {
  // //   rel: 'preconnect',
  // //   href: 'https://fonts.gstatic.com',
  // //   crossOrigin: 'anonymous',
  // // },
  // {
  //   rel: 'stylesheet',
  //   href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  // },
]

// Return the theme from the session storage using the loader
export async function loader({ request }: LoaderFunctionArgs) {
  const { getTheme } = await themeSessionResolver(request)
  const locale = await i18next.getLocale(request)
  return { locale, theme: getTheme() }
}

export default function AppWithProviders() {
  const { theme } = useLoaderData<typeof loader>()

  return (
    <QueryProvider>
      <ThemeProvider specifiedTheme={theme} themeAction="/action/set-theme">
        <App />
      </ThemeProvider>
    </QueryProvider>
  )
}

function App() {
  const { i18n } = useTranslation()
  const { locale } = useLoaderData<typeof loader>()

  useChangeLanguage(locale)

  const data = useLoaderData<typeof loader>()
  const [theme] = useTheme()
  return (
    <html lang={locale} dir={i18n.dir()} className={clsx(theme)}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <PreventFlashOnWrongTheme ssrTheme={Boolean(data.theme)} />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}
