import type { DerivedData } from '~/schemas/derivedData'
import type { BaseGame, Game } from '~/schemas/game'
import { defaultGameMetrics } from '~/schemas/game'
import type { BaseGameResult, GameResult } from '~/schemas/gameResult'
import { defaultGameResultMetrics } from '~/schemas/gameResult'
import { defaultPackMetrics } from '~/schemas/pack'
import { BaseSeries, Series } from '~/schemas/series'
import type { Team } from '~/schemas/team'

export class DerivedDataJoiner {
  constructor(private derivedData: DerivedData) {}

  joinToTeams<T extends Team | Team[]>(teams: T): T extends Team[] ? Team[] : Team {
    if (Array.isArray(teams)) {
      return teams.map((team) => this.joinToTeam(team)) as T extends Team[] ? Team[] : Team
    }
    return this.joinToTeam(teams) as T extends Team[] ? Team[] : Team
  }

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

  joinToSeries<T extends BaseSeries | BaseSeries[]>(series: T): T extends BaseSeries[] ? Series[] : Series {
    if (Array.isArray(series)) {
      return series.map((s) => this.joinToSerie(s)) as T extends BaseSeries[] ? Series[] : Series
    }
    return this.joinToSerie(series) as T extends BaseSeries[] ? Series[] : Series
  }

  private joinToGame(game: BaseGame): Game {
    return {
      ...game,
      metrics: this.derivedData.games[game._id] ?? defaultGameMetrics,
      pack: {
        ...game.pack,
        metrics: this.derivedData.packs[game.pack._id] ?? defaultPackMetrics,
      },
      series: {
        ...game.series,
        ...this.derivedData.series[game.series._id],
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
        series: {
          ...result.game.series,
          ...this.derivedData.series[result.game.series._id],
        },
      },
    }
  }

  private joinToSerie(series: BaseSeries): Series {
    // const maxSum = this.derivedData.series[series._id] ?? 0

    return {
      ...series,
      ...this.derivedData.series[series._id],
    }
  }

  private joinToTeam(team: Team): Team {
    return {
      ...team,
      metrics: this.derivedData.teams[team._id],
    }
  }
}
