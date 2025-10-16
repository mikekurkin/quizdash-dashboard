import { LoaderFunctionArgs, json } from '@remix-run/node'
import { Outlet, redirect, useLoaderData } from '@remix-run/react'
import { Header } from '~/components/Header'
import i18next from '~/i18n/i18next.server'
import { City } from '~/schemas/city'
import { storage } from '~/services/storage.server'

const MAX_RETRIES = 10
const RETRY_DELAY = 1000

// Helper function to wait with exponential backoff
const waitWithBackoff = async (retryCount: number): Promise<void> => {
  const delay = Math.min(RETRY_DELAY * Math.pow(1.5, retryCount), 5000)
  await new Promise((resolve) => setTimeout(resolve, delay))
}

// Define the response type
type LoaderData =
  | { cities: City[]; currentCity: City; appName: string; error?: undefined }
  | { cities: City[]; currentCity: null; appName: string; error: string }

export const loader = async ({ params }: LoaderFunctionArgs): Promise<LoaderData | Response> => {
  const t = await i18next.getFixedT(params.locale ?? 'ru', ['common'])

  // Initialize with retries to handle startup timing issues
  let cities: City[] = []
  let retryCount = 0

  while (retryCount < MAX_RETRIES) {
    try {
      cities = await storage.getCitiesWithGames()

      // If we got data successfully, break out of the retry loop
      if (cities && cities.length > 0) {
        break
      }

      // If we got no cities, wait and retry
      console.log(`No cities found, retrying (${retryCount + 1}/${MAX_RETRIES})...`)
      await waitWithBackoff(retryCount)
      retryCount++
    } catch (error) {
      // If there's an error (like file not found), wait and retry
      console.error(`Error loading cities, retrying (${retryCount + 1}/${MAX_RETRIES}):`, error)
      await waitWithBackoff(retryCount)
      retryCount++
    }
  }

  // If we still don't have cities after all retries, return an appropriate response
  if (!cities || cities.length === 0) {
    console.error('Failed to load cities after maximum retries')
    return json<LoaderData>({
      cities: [],
      currentCity: null,
      appName: t('appName'),
      error: 'Data is still being loaded. Please refresh in a few moments.',
    })
  }

  // If no city is selected, redirect to the first city
  if (!params.city && cities.length > 0) {
    return redirect(`/${cities[0].slug}`)
  }

  // Validate that the city exists
  if (params.city && !cities.find((city) => city.slug === params.city)) {
    return redirect(`/${cities[0].slug}`)
  }

  const currentCity = params.city ? (cities.find((city) => city.slug === params.city) ?? cities[0]) : cities[0]

  return {
    cities,
    currentCity,
    appName: t('appName'),
  }
}

export type CityContext = {
  cities: City[]
  currentCity: City
}

export default function CityLayout() {
  const data = useLoaderData<typeof loader>() as LoaderData

  // Show a loading state if we're still waiting for data
  if ('error' in data && data.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">{data.appName}</h1>
        <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
          <p>{data.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh Page
          </button>
        </div>
      </div>
    )
  }

  // At this point we know currentCity is not null
  const { appName, cities, currentCity } = data as { cities: City[]; currentCity: City; appName: string }

  return (
    <>
      <Header title={appName} cities={cities} currentCity={currentCity} />
      <div className="container mx-auto max-w-5xl px-0 md:px-6">
        <Outlet context={{ cities, currentCity }} />
      </div>
    </>
  )
}
