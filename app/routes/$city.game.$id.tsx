import { MetaFunction, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import i18next from '~/i18n/i18next.server';
import { storage } from '~/services/storage.server';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: data?.meta.title }, { name: 'description', content: data?.meta.description }];
};

export const handle = { i18n: "game" };

export async function loader({ params }: LoaderFunctionArgs) {
  const t = await i18next.getFixedT(params.locale ?? 'ru', [handle.i18n, 'common']);

  if (params.id === undefined || isNaN(parseInt(params.id))) {
    throw new Response('Not Found', { status: 404 });
  }

  const gameId = parseInt(params.id);
  const game = await storage.getGameById(gameId);

  if (game === null) {
    throw new Response('Not Found', { status: 404 });
  }

  const results = await storage.getGameResults(gameId);
  const gameTitle = `${game.series.name} ${game.pack.formatted}`;
  const resultsWithEfficiency = await Promise.all(results.map(async result => ({
    ...result,
    efficiency: result.sum / await storage.getMaxScoreByPack(game.series._id, game.pack.number),
  })));

  return {
    t: {
      title: t('title', { gameTitle }),
    },
    game,
    results: resultsWithEfficiency,
    meta: {
      title: t('meta.title', { gameTitle }),
      description: t('meta.description', { gameTitle }),
    },
  };
}

export default function GameRoute() {
  const { t, game, results } = useLoaderData<typeof loader>();
  return <div>
      <h1 className="text-2xl font-bold my-6 mx-4 sm:mx-0">
        {t.title}
      </h1>
      {game.location}
      {results.map(result => (
        <div key={result._id}>
          #{result.place} {result.team.name}: {result.sum} eff. {Number(result.efficiency * 100).toFixed(1)}%
        </div>
      ))}
    </div>
}
