import type { DerivedData } from '~/schemas/derivedData'
import type { BaseGame, Game } from '~/schemas/game'
import { defaultGameMetrics } from '~/schemas/game'
import type { BaseGameResult, GameResult } from '~/schemas/gameResult'
import { defaultGameResultMetrics } from '~/schemas/gameResult'
import { defaultPackMetrics } from '~/schemas/pack'

export class DerivedDataJoiner {
  constructor(private derivedData: DerivedData) {}

  joinToGames<T extends BaseGame | BaseGame[]>(games: T): T extends BaseGame[] ? Game[] : Game {
    if (Array.isArray(games)) {
      return games.map((game) => this.joinToGame(game)) as T extends BaseGame[] ? Game[] : Game
    }
    return this.joinToGame(games) as T extends BaseGame[] ? Game[] : Game
  }

  joinToGameResults<T extends BaseGameResult | BaseGameResult[]>(
    results: T
  ): T extends BaseGameResult[] ? GameResult[] : GameResult {
    if (Array.isArray(results)) {
      return results.map((result) => this.joinToGameResult(result)) as T extends BaseGameResult[]
        ? GameResult[]
        : GameResult
    }
    return this.joinToGameResult(results) as T extends BaseGameResult[] ? GameResult[] : GameResult
  }

  private joinToGame(game: BaseGame): Game {
    return {
      ...game,
      metrics: this.derivedData.games[game._id] ?? defaultGameMetrics,
      pack: {
        ...game.pack,
        metrics: this.derivedData.packs[game.pack._id] ?? defaultPackMetrics,
      },
    }
  }

  private joinToGameResult(result: BaseGameResult): GameResult {
    return {
      ...result,
      metrics: this.derivedData.results[result._id] ?? defaultGameResultMetrics,
      game: {
        ...result.game,
        metrics: this.derivedData.games[result.game._id] ?? defaultGameMetrics,
        pack: {
          ...result.game.pack,
          metrics: this.derivedData.packs[result.game.pack._id] ?? defaultPackMetrics,
        },
      },
    }
  }
}
