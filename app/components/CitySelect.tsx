import { useLoaderData, useNavigate } from "@remix-run/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { loader as cityLayoutLoader } from "~/routes/$city";

export function CitySelect() {
  const { cities, currentCity } = useLoaderData<typeof cityLayoutLoader>();
  const navigate = useNavigate();

  if (!cities || !currentCity) return null;

  const handleCityChange = (citySlug: string) => {
    const newPath = window.location.pathname.replace(/^\/[^/]*/, `/${citySlug}`);
    navigate(newPath);
  };

  return (
    <Select
      defaultValue={currentCity.slug}
      value={currentCity.slug}
      onValueChange={handleCityChange}
    >
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
  );
}
