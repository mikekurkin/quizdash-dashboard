import { parse } from 'csv-parse'
import { createReadStream } from 'fs'
import path from 'path'
import { City, CitySchema } from '~/schemas/city'
import { DerivedData } from '~/schemas/derivedData'
import { BaseGame, BaseGameSchema, Game, GamesResponse, GamesResponseSchema } from '~/schemas/game'
import { BaseGameResult, BaseGameResultSchema, GameResult } from '~/schemas/gameResult'
import { Pack } from '~/schemas/pack'
import { Rank, RankSchema } from '~/schemas/rank'
import { Series, SeriesSchema } from '~/schemas/series'
import { Team, TeamSchema, TeamsResponse, TeamsResponseSchema } from '~/schemas/team'
import { MetricsCalculator } from '~/services/metrics.server'
import { QueryParams } from '~/types/data'
import { CsvCache } from './csvCache.server'
import { DerivedDataJoiner } from './derivedDataJoiner.server'
import { GetGamesParams, Storage } from './interface.server'

const DATA_DIR = path.join(process.cwd(), 'data.fuller')

interface RawCsvGame {
  _id: string
  city_id: string
  series_id: string
  number: string
  date: string
  price: string
  location: string
  address?: string
  is_stream: string
  processed?: string
}

interface RawCsvCity {
  _id: string
  name: string
  slug: string
  timezone: string
  last_game_id?: string
}

interface RawCsvTeam {
  _id: string
  city_id: string
  name: string
  slug: string
  previous_team_id?: string
  inconsistent_rank: string
}

interface RawCsvResult {
  _id: string
  game_id: string
  team_id: string
  rounds: string
  sum: string
  place: string
  rank_id?: string
  has_errors: string
}

interface RawCsvRank {
  _id: string
  name: string
  image_urls: string
}

interface RawCsvSeries {
  _id: string
  name: string
  slug: string
}

export class CsvStorage implements Storage {
  private cache = {
    cities: new CsvCache<City[], RawCsvCity[]>('cities.csv', DATA_DIR),
    games: new CsvCache<BaseGame[], RawCsvGame[]>('games.csv', DATA_DIR),
    results: new CsvCache<BaseGameResult[], RawCsvResult[]>('results.csv', DATA_DIR),
    ranks: new CsvCache<Rank[], RawCsvRank[]>('ranks.csv', DATA_DIR),
    series: new CsvCache<Series[], RawCsvSeries[]>('series.csv', DATA_DIR),
    teams: new CsvCache<Team[], RawCsvTeam[]>('teams.csv', DATA_DIR),
    derivedData: new CsvCache<DerivedData, BaseGameResult[]>('results.csv', DATA_DIR),
  }

  private calculator = new MetricsCalculator()

  // Raw data methods
  private async getRawGameResults(): Promise<BaseGameResult[]> {
    return this.cache.results.get(
      () => this.readCsvFile('results.csv'),
      async (records) => {
        // Fetch related data in parallel
        const [games, teams, ranks] = await Promise.all([this.getRawGames(), this.getRawTeams(), this.getRanks()])

        // Create lookup maps with string keys
        const gamesMap = new Map(games.map((g) => [String(g._id), g]))
        const teamsMap = new Map(teams.map((t) => [String(t._id), t]))
        const ranksMap = new Map(ranks.map((r) => [String(r._id), r]))

        // Parse results in batches
        const parsedResults: BaseGameResult[] = []
        const batchSize = 1000
        let batchParsed = 0
        let batchSkipped = 0

        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize)

          for (const record of batch) {
            try {
              // Ensure IDs are strings
              const gameId = String(record.game_id)
              const teamId = String(record.team_id)
              const rankId = record.rank_id ? String(record.rank_id) : null

              const game = gamesMap.get(gameId)
              const team = teamsMap.get(teamId)
              const rank = rankId ? ranksMap.get(rankId) : null

              if (!game || !team) {
                batchSkipped++
                continue
              }

              // If rank_id exists but rank not found, skip
              if (rankId && !rank) {
                batchSkipped++
                continue
              }

              const rounds = record.rounds.split(',').map(Number)
              const parsed = BaseGameResultSchema.parse({
                _id: String(record._id),
                game,
                team,
                rank,
                rounds,
                sum: rounds.reduce((a, b) => a + b, 0),
                place: Number(record.place),
                has_errors: record.has_errors === 'true',
              })

              parsedResults.push(parsed)
              batchParsed++
            } catch (e) {
              batchSkipped++
            }
          }
        }

        return parsedResults
      }
    )
  }

  private async getRawGames(): Promise<BaseGame[]> {
    return this.cache.games.get(
      () => this.readCsvFile('games.csv'),
      async (records) => {
        // Fetch related data first
        const [series, cities] = await Promise.all([this.getSeries(), this.getCities()])

        // Create lookup maps
        const seriesMap = new Map(series.map((s) => [s._id, s]))
        const citiesMap = new Map(cities.map((c) => [c._id, c]))

        // Process games in batches
        const batchSize = 1000
        const parsedGames: BaseGame[] = []

        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize)
          let batchParsed = 0
          let batchSkipped = 0

          for (const record of batch) {
            const serie = seriesMap.get(record.series_id)
            const city = citiesMap.get(parseInt(record.city_id))

            if (serie && city) {
              try {
                // Get replay number by counting games with same number in series
                const gamesInPackAndSeries = records
                  .filter((g) => g.number === record.number && g.series_id === record.series_id)
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                const replayNumber = gamesInPackAndSeries.findIndex((g) => g._id === record._id) + 1

                // Create game object matching schema
                const game = {
                  _id: parseInt(record._id),
                  city, // Use full city object
                  series: serie, // Use full series object
                  pack: {
                    _id: `${serie.slug}_${record.number}`,
                    number: record.number,
                    replay_number: replayNumber,
                    formatted: `#${record.number}${replayNumber > 0 ? `.${replayNumber}` : ''}`,
                  },
                  date: new Date(record.date),
                  price: parseInt(record.price),
                  location: record.location,
                  address: record.address || '',
                  is_stream: record.is_stream === 'true',
                }

                const parsed = BaseGameSchema.parse(game)
                parsedGames.push(parsed)
                batchParsed++
              } catch (e) {
                console.error('Failed to parse game:', e, 'Record:', record)
                batchSkipped++
              }
            } else {
              console.log(`Skipping game ${record._id}, missing serie or city:`, {
                serie: !!serie,
                city: !!city,
                series_id: record.series_id,
                city_id: record.city_id,
              })
              batchSkipped++
            }
          }
        }

        return parsedGames
      }
    )
  }

  private async getRawTeams(): Promise<Team[]> {
    return this.cache.teams.get(
      () => this.readCsvFile('teams.csv'),
      async (records) => {
        const teams = records.map((record) => ({
          _id: record._id,
          city_id: parseInt(record.city_id),
          name: record.name,
          slug: record.slug,
          previous_team_id: record.previous_team_id === '' ? null : record.previous_team_id,
          inconsistent_rank: record.inconsistent_rank === 'true',
        }))

        const cities = await this.getCities()

        return teams.map((team) =>
          TeamSchema.strip().parse({
            ...team,
            city: cities.find((c) => c._id === team.city_id),
          })
        )
      }
    )
  }

  private async getDerivedData(): Promise<DerivedData> {
    return this.cache.derivedData.get(
      () => this.getRawGameResults(),
      async (results) => {
        const metrics = await this.calculator.calculateMetrics(results)
        return metrics
      }
    )
  }

  // Public methods
  async getCities(): Promise<City[]> {
    return this.cache.cities.get(
      () => this.readCsvFile('cities.csv'),
      (records) =>
        records.map((record) =>
          CitySchema.strip().parse({
            _id: parseInt(record._id),
            name: record.name,
            slug: record.slug,
            timezone: record.timezone,
          })
        )
    )
  }

  async getCitiesWithGames(): Promise<City[]> {
    const games = await this.getRawGames()
    const allCities = await this.getCities()

    const cityIds = Array.from(new Set(games.map((game) => game.city._id)))

    return allCities.filter((c) => cityIds.includes(c._id))
  }

  async getCityBySlug(slug: string): Promise<City | null> {
    const cities = await this.getCities()
    return cities.find((city) => city.slug === slug) || null
  }

  async getCityById(id: number): Promise<City | null> {
    const cities = await this.getCities()
    return cities.find((city) => city._id === id) || null
  }

  async getGames(params?: GetGamesParams): Promise<GamesResponse> {
    const allGames = await this.getRawGames()

    const city = params?.cityId
      ? await this.getCityById(params.cityId)
      : params?.citySlug
        ? await this.getCityBySlug(params.citySlug)
        : null

    const filteredGames = allGames.filter((game) => {
      if (city && game.city._id !== city._id) return false
      if (params?.seriesId && game.series._id !== params.seriesId) return false
      if (params?.packNumber && game.pack.number !== params.packNumber) return false
      if (
        params?.dateFrom &&
        params?.dateTo &&
        !(new Date(params.dateFrom) <= game.date && game.date <= new Date(params.dateTo))
      )
        return false
      if (params?.search) {
        const search = params.search.toLowerCase()
        return (
          game._id.toString().startsWith(search) ||
          game.series.name.toLowerCase().includes(search) ||
          game.pack.formatted.toLowerCase().startsWith(search) ||
          game.pack.formatted.toLowerCase().replace('#', '').startsWith(search) ||
          game.location.toLowerCase().includes(search)
        )
      }
      return true
    })

    const sortedGames = filteredGames.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const offset = params?.cursor ?? 0
    const limit = params?.limit ?? 20
    const endIndex = offset + limit
    const paginatedGames = sortedGames.slice(offset, offset + limit)

    const joiner = await this.getJoiner()
    return GamesResponseSchema.strip().parse({
      data: joiner.joinToGames(paginatedGames),
      nextCursor: endIndex < filteredGames.length ? endIndex : null,
    })
  }

  async getGameById(id: number): Promise<Game | null> {
    const games = await this.getRawGames()
    const game = games.find((game) => game._id === id)
    if (!game) return null

    const joiner = await this.getJoiner()
    return joiner.joinToGames(game)
  }

  async getGamesByTeam({ teamId, ...params }: GetGamesParams): Promise<GamesResponse> {
    const gamesResponse = await this.getGames({ teamId, ...params })
    return gamesResponse // Already joined in getGames
  }

  async getGamesByPack(seriesId: string, packNumber: string): Promise<Game[]> {
    const allGames = await this.getRawGames()
    const filteredGames = allGames.filter((game) => game.series._id === seriesId && game.pack.number === packNumber)

    const joiner = await this.getJoiner()
    return joiner.joinToGames(filteredGames)
  }

  async getGameResults(gameId: number): Promise<GameResult[]> {
    const allResults = await this.getRawGameResults()
    const filteredResults = allResults.filter((result) => result.game._id === gameId)

    const joiner = await this.getJoiner()
    return joiner.joinToGameResults(filteredResults)
  }

  async getGameResultsByCity(cityId: number): Promise<GameResult[]> {
    const allResults = await this.getRawGameResults()
    const filteredResults = allResults.filter((result) => result.game.city._id === cityId)

    const joiner = await this.getJoiner()
    return joiner.joinToGameResults(filteredResults)
  }

  async getGameResultsByPack(seriesId: string, packNumber: string): Promise<GameResult[]> {
    const allResults = await this.getRawGameResults()
    const filteredResults = allResults.filter(
      (result) => result.game.series._id === seriesId && result.game.pack.number === packNumber
    )

    const joiner = await this.getJoiner()
    return joiner.joinToGameResults(filteredResults)
  }

  async getMaxScoreByPack(seriesId: string, packNumber: string): Promise<number> {
    const results = await this.getGameResultsByPack(seriesId, packNumber)
    if (results.length === 0) return 0
    return Math.max(...results.map((result) => result.sum))
  }

  async getRanks(): Promise<Rank[]> {
    return this.cache.ranks.get(
      () => this.readCsvFile('ranks.csv'),
      (records) =>
        records.map((record) =>
          RankSchema.strip().parse({
            _id: record._id,
            name: record.name,
          })
        )
    )
  }

  async getPacks(): Promise<Map<string, Pack[]>> {
    const games = await this.getRawGames()
    const joiner = await this.getJoiner()
    const joinedGames = await joiner.joinToGames(games)

    const packsMap = new Map<string, Pack>()
    const packsSeriesMap = new Map<string, Pack[]>()

    joinedGames.forEach((game) => {
      if (!packsMap.has(game.pack._id)) {
        packsMap.set(game.pack._id, game.pack)
        const seriesId = game.series._id
        if (!packsSeriesMap.has(seriesId)) {
          packsSeriesMap.set(seriesId, [])
        }
        packsSeriesMap.get(seriesId)?.push(game.pack)
      }
    })

    return packsSeriesMap
  }

  async getSeries(): Promise<Series[]> {
    return this.cache.series.get(
      () => this.readCsvFile('series.csv'),
      (records) =>
        records.map((record) =>
          SeriesSchema.strip().parse({
            _id: record._id,
            name: record.name,
            slug: record.slug,
          })
        )
    )
  }

  async getSeriesById(id: string): Promise<Series | null> {
    const series = await this.getSeries()
    return series.find((s) => s._id === id) || null
  }

  async getSeriesBySlug(slug: string): Promise<Series | null> {
    const series = await this.getSeries()
    return series.find((s) => s.slug === slug) || null
  }

  async getTeams(params?: QueryParams & { cityId?: number }): Promise<TeamsResponse> {
    const allTeams = await this.getRawTeams()

    const filteredTeams = allTeams.filter((team) => {
      if (params?.cityId && team.city?._id !== params.cityId) return false
      if (params?.search) return team.name.toLowerCase().includes(params.search.toLowerCase())
      return true
    })

    const sortedTeams = filteredTeams.sort((a, b) => a.name.localeCompare(b.name))

    const offset = params?.cursor ?? 0
    const limit = params?.limit ?? 20
    const paginatedTeams = sortedTeams.slice(offset, offset + limit)

    return TeamsResponseSchema.strip().parse({
      data: paginatedTeams,
      total: filteredTeams.length,
      hasMore: offset + limit < filteredTeams.length,
      nextCursor: offset + limit < filteredTeams.length ? (offset + limit).toString() : undefined,
    })
  }

  async getTeamBySlug(slug: string, cityId: number): Promise<Team | null> {
    const teams = await this.getRawTeams()
    return teams.find((team) => team.slug === slug && team.city?._id === cityId) || null
  }

  async getTeamResults(teamId: string): Promise<GameResult[]> {
    const results = await this.getRawGameResults()
    const filteredResults = results.filter((result) => result.team._id === teamId)

    const joiner = await this.getJoiner()
    return joiner.joinToGameResults(filteredResults)
  }

  private async readCsvFile<T>(filename: string, options: { columns: boolean } = { columns: true }): Promise<T[]> {
    const filePath = path.join(DATA_DIR, filename)
    const records: T[] = []

    return new Promise((resolve, reject) => {
      createReadStream(filePath, { highWaterMark: 64 * 1024 }) // 64KB chunks
        .pipe(
          parse({
            columns: options.columns,
            skip_empty_lines: true,
            bom: true,
            cast: false,
            cast_date: false,
          })
        )
        .on('data', (record) => records.push(record))
        .on('end', () => resolve(records))
        .on('error', reject)
    })
  }

  // Helper method to create joiner instance
  private async getJoiner(): Promise<DerivedDataJoiner> {
    const derivedData = await this.getDerivedData()
    return new DerivedDataJoiner(derivedData)
  }
}
