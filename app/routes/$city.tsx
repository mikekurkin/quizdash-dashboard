import { LoaderFunctionArgs } from '@remix-run/node'
import { Outlet, redirect, useLoaderData } from '@remix-run/react'
import { Header } from '~/components/Header'
import i18next from '~/i18n/i18next.server'
import { City } from '~/schemas/city'
import { storage } from '~/services/storage.server'

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const t = await i18next.getFixedT(params.locale ?? 'ru', ['games', 'common'])

  const cities = await storage.getCitiesWithGames()
  
  // If no city is selected, redirect to the first city
  if (!params.city && cities.length > 0) {
    return redirect(`/${cities[0].slug}`)
  }

  // Validate that the city exists
  if (params.city && !cities.find((city) => city.slug === params.city)) {
    return redirect(`/${cities[0].slug}`)
  }

  const currentCity = params.city ? cities.find((city) => city.slug === params.city) ?? cities[0] : cities[0]

  return { cities, currentCity, appName: t('appName') }
}

export type CityContext = {
  cities: City[]
  currentCity: City
}

export default function CityLayout() {
  const { appName, cities, currentCity } = useLoaderData<typeof loader>()
  return (
    <>
      <Header title={appName} cities={cities} currentCity={currentCity} />
      <div className="container mx-auto max-w-5xl px-0 md:px-6">
        <Outlet context={{ cities, currentCity }} />
      </div>
    </>
  )
}
