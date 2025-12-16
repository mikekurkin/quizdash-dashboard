import { LoaderFunctionArgs } from '@remix-run/node'
import { redirect, useLoaderData } from '@remix-run/react'
import { ComplexityGrade } from '~/components/ComplexityGrade'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion'
import { storage } from '~/services/storage.server'

export const loader = async ({ params }: LoaderFunctionArgs) => {
  if (!params.city) {
    throw redirect('/packs')
  }

  const currentCity = await storage.getCityBySlug(params.city)

  if (!currentCity) {
    throw redirect('/packs')
  }

  const packsSeriesMap = await storage.getPacks()
  const series = await storage.getSeries()

  const filteredPacksMap = new Map(
    Array.from(packsSeriesMap.entries())
      .map(
        ([seriesId, packs]) =>
          [seriesId, packs.filter((pack) => pack.metrics.complexityGrade.rounds.length > 0)] as const
      )
      .filter(([_, packs]) => packs.length > 0)
  )

  const sortedSeries = series.sort((a, b) => {
    const aPackCount = filteredPacksMap.get(a._id)?.length || 0
    const bPackCount = filteredPacksMap.get(b._id)?.length || 0
    return bPackCount - aPackCount // Sort descending by pack count
  })

  return { packsSeriesMap: filteredPacksMap, series: sortedSeries }
}

export default function PacksRoute() {
  const { packsSeriesMap, series } = useLoaderData<typeof loader>()

  return (
    <>
      <Accordion type="multiple">
        {series.map((serie) => (
          <AccordionItem key={serie._id} value={serie._id}>
            <AccordionTrigger>
              <div className="flex flex-row gap-2 w-full items-center">
                <h2 className="cursor-pointer">{serie.name}</h2>
                <div className="bg-secondary rounded-sm py-0.5 px-1">{packsSeriesMap.get(serie._id)?.length ?? 0}</div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="flex flex-row gap-4 flex-wrap">
                {packsSeriesMap.get(serie._id)?.map((pack) => (
                  <div key={pack.number} className="border rounded-md p-4">
                    <div>#{pack.number}</div>
                    <ComplexityGrade metrics={pack.metrics} />
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </>
  )
}
