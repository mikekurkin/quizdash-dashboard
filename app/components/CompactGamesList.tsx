import { Link } from '@remix-run/react'
import { Game } from '~/schemas/game'

interface CompactGamesListProps {
  className?: string
  games: Game[]
  heading?: JSX.Element
}

export function CompactGamesList({ className, heading, games }: CompactGamesListProps) {
  return (
    <div className={className}>
      {heading}
      <div className="h-auto overflow-y-scroll">
        {games.map((game) => (
          <Link to={`/${game.city.slug}/game/${game._id}`} key={game._id}>
            <div className="flex items-center justify-between text-sm py-1 px-2 rounded-sm hover:bg-muted/80">
              <span className="font-medium">{game.pack.formatted}</span>
              <span className="text-muted-foreground m-0">{`${game.location}, ${game.date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}`}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
