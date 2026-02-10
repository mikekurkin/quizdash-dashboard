import { Game } from '~/schemas/game'
import { formatDateTime } from '~/lib/format'

interface GameInfoProps {
  className?: string
  game: Game
  labels: {
    location: string
    date: string
    teams: string
  }
}

export function GameInfo({ className, game, labels }: GameInfoProps) {
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
          {formatDateTime(new Date(game.date), game.city.timezone)}
        </div>
      </div>
      <div className="text-sm text-muted-foreground">{labels.teams}</div>
    </div>
  )
}
