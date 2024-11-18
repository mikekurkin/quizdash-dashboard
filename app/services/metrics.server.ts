import { compareRounds } from '~/lib/utils'
import type { DerivedData } from '~/schemas/derivedData'
import type { BaseGameResult } from '~/schemas/gameResult'
import type { PackMetrics } from '~/schemas/pack'

export class MetricsCalculator {
  calculateMetrics(results: BaseGameResult[]): DerivedData {
    const resultsDD = this.calculateResultsMetrics(results)
    const packsDD = this.calculatePacksMetrics(results)
    const gamesDD = this.calculateGamesMetrics(results)

    return {
      results: resultsDD,
      games: gamesDD,
      packs: packsDD,
      teams: {},
    }
  }

  private groupResultsByGame(results: BaseGameResult[]) {
    const map = new Map<number, BaseGameResult[]>()
    for (const result of results) {
      const gameResults = map.get(result.game._id)
      if (gameResults) {
        gameResults.push(result)
      } else {
        map.set(result.game._id, [result])
      }
    }
    return map
  }

  private groupResultsByPack(results: BaseGameResult[]) {
    const map = new Map<string, BaseGameResult[]>()
    for (const result of results) {
      const packResults = map.get(result.game.pack._id)
      if (packResults) {
        packResults.push(result)
      } else {
        map.set(result.game.pack._id, [result])
      }
    }
    return map
  }

  private groupResultsBySeriesAndPack(results: BaseGameResult[]) {
    const seriesMap = new Map<string, Map<string, BaseGameResult[]>>()

    for (const result of results) {
      const seriesId = result.game.series._id
      const packId = result.game.pack._id

      let packMap = seriesMap.get(seriesId)
      if (!packMap) {
        packMap = new Map()
        seriesMap.set(seriesId, packMap)
      }

      let packResults = packMap.get(packId)
      if (!packResults) {
        packResults = []
        packMap.set(packId, packResults)
      }

      packResults.push(result)
    }

    return seriesMap
  }

  private calculateResultsMetrics(results: BaseGameResult[]) {
    const gameResultsMap = this.groupResultsByGame(results)
    const packResultsMap = this.groupResultsByPack(results)

    const maxSums = {
      games: new Map<number, number>(),
      packs: new Map<string, number>(),
    }

    for (const [gameId, gameResults] of gameResultsMap) {
      maxSums.games.set(gameId, Math.max(...gameResults.map((r) => r.sum)))
    }

    for (const [packId, packResults] of packResultsMap) {
      maxSums.packs.set(packId, Math.max(...packResults.map((r) => r.sum)))
    }

    return Object.fromEntries(
      Array.from(packResultsMap).flatMap(([packId, packResults]) => {
        const maxPackSum = maxSums.packs.get(packId)!

        const uniqueResults = new Map<string, { sum: number; rounds: number[] }>()
        for (const result of packResults) {
          const key = `${result.sum}-${result.rounds.join('-')}`
          if (!uniqueResults.has(key)) {
            uniqueResults.set(key, { sum: result.sum, rounds: result.rounds })
          }
        }

        const sortedUniqueResults = Array.from(uniqueResults.values()).sort((a, b) => {
          if (b.sum !== a.sum) return b.sum - a.sum
          return compareRounds(a.rounds, b.rounds)
        })

        return packResults.map((result) => [
          result._id,
          {
            pack_place:
              sortedUniqueResults.findIndex(
                (r) => r.sum === result.sum && r.rounds.every((round, i) => round === result.rounds[i])
              ) + 1,
            game_efficiency: result.sum / maxSums.games.get(result.game._id)!,
            pack_efficiency: result.sum / maxPackSum,
          },
        ])
      })
    )
  }

  private calculatePacksMetrics(results: BaseGameResult[]) {
    const seriesPackMap = this.groupResultsBySeriesAndPack(results)

    return Object.fromEntries(
      Array.from(seriesPackMap.entries()).flatMap(([_seriesId, packMap]) => {
        const packEntries = Array.from(packMap.entries())
        const accumulatedMetrics = {
          sumAvgs: [] as number[],
          roundAvgs: [] as number[][],
          prevCount: 0,
        }

        return packEntries.map(([packId, packResults]) => {
          const metrics = this.calculatePackMetrics(packResults, accumulatedMetrics)

          accumulatedMetrics.sumAvgs.push(metrics.sumAvg)
          accumulatedMetrics.roundAvgs.push(metrics.roundAverages)
          accumulatedMetrics.prevCount += 1

          return [packId, this.createPackDerivedData(metrics)]
        })
      })
    )
  }

  private calculatePackMetrics(
    packResults: BaseGameResult[],
    accumulatedMetrics: {
      sumAvgs: number[]
      roundAvgs: number[][]
      prevCount: number
    }
  ) {
    if (packResults.length === 0) {
      return {
        sumAvg: 0,
        roundAverages: [],
        historicalSumGrade: 0,
        historicalRoundGrades: [],
        prevCount: accumulatedMetrics.prevCount,
      }
    }

    packResults.sort((a, b) => b.sum - a.sum)
    const top10Results = packResults.slice(0, 10)

    let sumTotal = 0
    const maxRounds = Math.max(...packResults.map((r) => r.rounds.length))
    const roundTotals = new Array(maxRounds).fill(0)
    const roundCounts = new Array(maxRounds).fill(0)

    for (const result of top10Results) {
      sumTotal += result.sum
      for (let i = 0; i < result.rounds.length; i++) {
        roundTotals[i] += result.rounds[i]
        roundCounts[i]++
      }
    }

    const sumAvg = top10Results.length > 0 ? sumTotal / top10Results.length : 0
    const roundAverages = roundTotals.map((total, i) => (roundCounts[i] > 0 ? total / roundCounts[i] : 0))

    const historicalSumGrade =
      accumulatedMetrics.sumAvgs.length > 0
        ? this.calculateHistoricalGrade(sumAvg, accumulatedMetrics.sumAvgs, (curr, prev) => curr < prev)
        : 0

    const historicalRoundGrades = roundAverages.map((avg, roundIndex) => {
      if (!accumulatedMetrics.roundAvgs.length) return 0

      const previousRounds = accumulatedMetrics.roundAvgs.map((rounds) =>
        roundIndex < rounds.length ? rounds[roundIndex] : 0
      )

      return this.calculateHistoricalGrade(avg, previousRounds, (curr, prev) => curr < prev)
    })

    return {
      sumAvg,
      roundAverages,
      historicalSumGrade,
      historicalRoundGrades,
      prevCount: accumulatedMetrics.prevCount,
    }
  }

  private calculateGamesMetrics(results: BaseGameResult[]) {
    const gameResultsMap = this.groupResultsByGame(results)

    return Object.fromEntries(
      Array.from(gameResultsMap.entries()).map(([gameId, gameResults]) => {
        const metrics = this.calculateGameMetrics(gameResults)
        return [gameId, this.createGameDerivedData(metrics)]
      })
    )
  }

  private calculateGameMetrics(gameResults: BaseGameResult[]) {
    if (gameResults.length === 0) {
      return {
        sumAvg: 0,
        roundAverages: [],
      }
    }

    gameResults.sort((a, b) => b.sum - a.sum)
    const top10Results = gameResults.slice(0, 10)

    let sumTotal = 0
    const maxRounds = Math.max(...gameResults.map((r) => r.rounds.length))
    const roundTotals = new Array(maxRounds).fill(0)
    const roundCounts = new Array(maxRounds).fill(0)

    for (const result of top10Results) {
      sumTotal += result.sum
      for (let i = 0; i < result.rounds.length; i++) {
        roundTotals[i] += result.rounds[i]
        roundCounts[i]++
      }
    }

    return {
      sumAvg: top10Results.length > 0 ? sumTotal / top10Results.length : 0,
      roundAverages: roundTotals.map((total, i) => (roundCounts[i] > 0 ? total / roundCounts[i] : 0)),
    }
  }

  private calculateRoundAverages(results: BaseGameResult[], maxRounds: number) {
    return Array.from({ length: maxRounds }, (_, i) => {
      const validResults = results.filter((r) => i < r.rounds.length)
      if (validResults.length === 0) return 0
      return validResults.reduce((acc, r) => acc + r.rounds[i], 0) / validResults.length
    })
  }

  private calculateHistoricalGrade(
    current: number,
    previous: number[],
    comparator: (curr: number, prev: number) => boolean
  ) {
    if (previous.length === 0) return 5
    const harderCount = previous.filter((prev) => comparator(current, prev)).length
    return Math.ceil((9 * harderCount) / previous.length) + 1
  }

  private createPackDerivedData(metrics: {
    sumAvg: number
    roundAverages: number[]
    historicalSumGrade: number
    historicalRoundGrades: number[]
    prevCount: number
  }): PackMetrics {
    return {
      topNAvg: {
        n: 10,
        sum: metrics.sumAvg,
        rounds: metrics.roundAverages,
      },
      prevCount: metrics.prevCount,
      complexityGrade: {
        sum: metrics.historicalSumGrade,
        rounds: metrics.historicalRoundGrades,
      },
    }
  }

  private createGameDerivedData(metrics: { sumAvg: number; roundAverages: number[] }) {
    return {
      gameTopNAvg: {
        n: 10,
        sum: metrics.sumAvg,
        rounds: metrics.roundAverages,
      },
    }
  }
}
