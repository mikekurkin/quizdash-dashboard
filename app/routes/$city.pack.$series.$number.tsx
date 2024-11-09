import { MetaFunction, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import i18next from '~/i18n/i18next.server';
import { storage } from '~/services/storage.server';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: data?.meta.title }, { name: 'description', content: data?.meta.description }];
};

export const handle = { i18n: "pack" };

export async function loader({ params }: LoaderFunctionArgs) {
  const t = await i18next.getFixedT(params.locale ?? 'ru', [handle.i18n, 'common']);

  if (params.series === undefined || params.number === undefined) {
    throw new Response('Not Found', { status: 404 });
  }

  const series = await storage.getSeriesBySlug(params.series);

  if (series === null) {
    throw new Response('Not Found', { status: 404 });
  }

  const results = await storage.getGameResultsByPack(series._id, params.number);

  if (results.length === 0) {
    throw new Response('Not Found', { status: 404 });
  }

  const games = results.map(r => r.game);

  const packTitle = `${series.name} #${params.number}`;
  const resultsWithEfficiency = await Promise.all(results.map(async result => ({
    ...result,
    efficiency: result.sum / Math.max(...results.map(r => r.sum)),
  })));

  return {
    t: {
      title: t('title', { packTitle }),
    },
    games,
    results: resultsWithEfficiency,
    meta: {
      title: t('meta.title', { packTitle }),
      description: t('meta.description', { packTitle }),
    },
  };
}

export default function PackRoute() {
  const { t, results } = useLoaderData<typeof loader>();
  return <div>
      <h1 className="text-2xl font-bold my-6 mx-4 sm:mx-0">
        {t.title}
      </h1>
      {results.map(result => (
        <div key={result._id}>
          #{result.place} {result.team.name}: {result.sum} eff. {Number(result.efficiency * 100).toFixed(1)}%
        </div>
      ))}
    </div>
}
