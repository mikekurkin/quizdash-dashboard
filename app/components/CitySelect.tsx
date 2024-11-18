import { useNavigate } from '@remix-run/react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { City } from '~/schemas/city'

export function CitySelect({ cities, currentCity }: { cities: City[]; currentCity: City }) {
  const navigate = useNavigate()

  if (!cities || !currentCity) return null

  const handleCityChange = (citySlug: string) => {
    const newPath = window.location.pathname.replace(/^\/[^/]*/, `/${citySlug}`)
    navigate(newPath)
  }

  return (
    <Select defaultValue={currentCity.slug} value={currentCity.slug} onValueChange={handleCityChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {cities.map((city) => (
          <SelectItem key={city._id} value={city.slug}>
            {city.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
