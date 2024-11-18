import { Game } from '~/schemas/game'

interface GameInfoProps {
  className?: string
  game: Game
  teamsCount: number
  labels: {
    location: string
    date: string
    teams: string
  }
}

export function GameInfo({ className, game, teamsCount, labels }: GameInfoProps) {
  return (
    <div className={className}>
      <h1 className="text-2xl font-bold mb-2">
        {game.series.name} {game.pack.formatted}
      </h1>
      <div className="text-sm text-muted-foreground">
        <div>
          {labels.location}: {game.location}
        </div>
        <div>
          {labels.date}:{' '}
          {new Date(game.date)
            .toLocaleString('ru-RU', {
              year: '2-digit',
              month: 'numeric',
              day: 'numeric',
              weekday: 'short',
              hour: 'numeric',
              minute: 'numeric',
            })
            .toLowerCase()}
        </div>
      </div>
      <div className="text-sm text-muted-foreground">{teamsCount} {labels.teams}</div>
    </div>
  )
}
