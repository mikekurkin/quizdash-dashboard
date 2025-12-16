import type { LoaderFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { getClientIPAddress } from 'remix-utils/get-client-ip-address'
import { locationService } from '~/services/location.server'

export async function loader({ params, request }: LoaderFunctionArgs) {
  const ipAddress = getClientIPAddress(request)
  const locationCity = locationService.getNearestCity(ipAddress)
  const citySlug = params.city ?? locationCity?.slug
  return redirect(`/${citySlug}/games`)
}

export default function Index() {
  return null
}
