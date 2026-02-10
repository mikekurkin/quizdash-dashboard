import { parse } from 'csv-parse'
import { createReadStream } from 'fs'
import path from 'path'
import { getDataSourceConfig } from '~/config/environment.server'
import { City, CitySchema } from '~/schemas/city'
import { DerivedData } from '~/schemas/derivedData'
import { BaseGame, BaseGameSchema, Game, GamesResponse, GamesResponseSchema } from '~/schemas/game'
import {
  BaseGameResult,
  BaseGameResultSchema,
  GameResult,
  GameResultsResponse,
  MinimalGameResult,
} from '~/schemas/gameResult'
import { Pack } from '~/schemas/pack'
import { Rank, RankSchema } from '~/schemas/rank'
import { BaseSeries, BaseSeriesSchema, Series } from '~/schemas/series'
import { Team, TeamSchema, TeamsResponse, TeamsResponseSchema } from '~/schemas/team'
import { dataSyncService } from '~/services/dataSync.server'
import { MetricsCalculator } from '~/services/metrics.server'
import { CsvCache } from './csvCache.server'
import { DerivedDataJoiner } from './derivedDataJoiner.server'
import { FindTeamResultsParams, GetGamesParams, GetTeamsParams, Storage } from './interface.server'

// Get data directory from environment configuration
const config = getDataSourceConfig()
const DATA_DIR = path.join(process.cwd(), config.dataDir)

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
  latitude?: string
  longitude?: string
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
  private dataDir = DATA_DIR

  private cache = {
    games: new CsvCache<BaseGame[], RawCsvGame[]>('games.csv', this.dataDir),
    results: new CsvCache<BaseGameResult[], RawCsvResult[]>('results.csv', this.dataDir),
    teams: new CsvCache<Team[], RawCsvTeam[]>('teams.csv', this.dataDir),
    cities: new CsvCache<City[], RawCsvCity[]>('cities.csv', this.dataDir),
    series: new CsvCache<BaseSeries[], RawCsvSeries[]>('series.csv', this.dataDir),
    ranks: new CsvCache<Rank[], RawCsvRank[]>('ranks.csv', this.dataDir),
    derivedData: new CsvCache<DerivedData, BaseGameResult[]>('results.csv', this.dataDir),
  }

  // Manual indexes for performance
  private resultsByTeam = new Map<string, BaseGameResult[]>()
  private resultsByCity = new Map<number, BaseGameResult[]>()

  private buildResultsIndexes(results: BaseGameResult[]): void {
    // Clear existing indexes
    this.resultsByTeam.clear()
    this.resultsByCity.clear()

    // Build indexes
    for (const result of results) {
      // Index by team
      if (!this.resultsByTeam.has(result.team._id)) {
        this.resultsByTeam.set(result.team._id, [])
      }
      this.resultsByTeam.get(result.team._id)!.push(result)

      // Index by city
      if (!this.resultsByCity.has(result.game.city._id)) {
        this.resultsByCity.set(result.game.city._id, [])
      }
      this.resultsByCity.get(result.game.city._id)!.push(result)
    }
  }

  private clearResultsIndexes(): void {
    this.resultsByTeam.clear()
    this.resultsByCity.clear()
  }

  private calculator = new MetricsCalculator()
  private dataSourceConfig = config

  constructor() {
    // Initialize data and then preload caches
    this.initializeDataAndPreloadCaches()
  }

  /**
   * Initialize data and then preload caches in the correct sequence
   */
  private async initializeDataAndPreloadCaches(): Promise<void> {
    try {
      // First make sure all data is downloaded
      console.log('Initializing data...')
      await this.initializeData()
      console.log('Data initialization complete')

      // Then preload caches after a short delay
      setTimeout(() => {
        console.log('Initiating cache preloading after data initialization...')
        this.preloadCriticalCaches()
          .then(() => {
            console.log('Application startup cache preloading completed')
          })
          .catch((error) => {
            console.error('Error during startup cache preloading:', error)
          })
      }, 1000) // Small delay before preloading
    } catch (error) {
      console.error('Failed to initialize data and preload caches:', error)
    }
  }

  /**
   * Initialize data based on configuration
   */
  private async initializeData(): Promise<void> {
    try {
      // Wait for data to be fully initialized before returning
      await dataSyncService.initializeData()
    } catch (error) {
      console.error('Failed to initialize data:', error)
      throw error // Rethrow to propagate the error up
    }
  }

  /**
   * Refresh data from external source (used by the refresh-data route)
   */
  public async refreshData(): Promise<boolean> {
    const success = await dataSyncService.syncDataFromGitHub()

    if (success) {
      console.log('Data refresh successful, invalidating caches')

      // Clear indexes since data has changed
      this.clearResultsIndexes()

      // Invalidate all caches
      Object.values(this.cache).forEach((cache) => cache.invalidate())

      // Asynchronously preload the most computationally expensive data
      // This happens in the background after returning success response to the client
      this.preloadCriticalCaches().catch((error) => {
        console.error('Error preloading caches after refresh:', error)
      })
    }

    return success
  }

  /**
   * Preload critical caches after data refresh to prevent user-facing delays
   * This is run asynchronously after a refresh operation
   */
  private async preloadCriticalCaches(): Promise<void> {
    console.log('Starting to preload critical caches...')
    const startTime = performance.now()

    try {
      // Preload essential data first - these will be needed by most operations
      const [_cities, _series, _ranks] = await Promise.all([this.getCities(), this.getRawSeries(), this.getRanks()])

      console.log(`Basic data preloaded in ${((performance.now() - startTime) / 1000).toFixed(2)}s`)

      // Preload the most computation-heavy caches in parallel
      // These are typically the ones that need derived calculations
      await Promise.all([
        // Games and teams are dependencies for results, so they get loaded anyway
        this.getRawGames(),
        this.getRawTeams(),

        // This triggers the most expensive calculations (metrics)
        this.getDerivedData(),
      ])

      const totalTime = (performance.now() - startTime) / 1000
      console.log(`Critical caches preloaded in ${totalTime.toFixed(2)}s`)
    } catch (error) {
      console.error('Error during cache preloading:', error)
      throw error
    }
  }

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
        let _batchParsed = 0
        let _batchSkipped = 0

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
                _batchSkipped++
                continue
              }

              // If rank_id exists but rank not found, skip
              if (rankId && !rank) {
                _batchSkipped++
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
              _batchParsed++
            } catch (e) {
              _batchSkipped++
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
        const [series, cities] = await Promise.all([this.getRawSeries(), this.getCities()])

        // Create lookup maps
        const seriesMap = new Map(series.map((s) => [s._id, s]))
        const citiesMap = new Map(cities.map((c) => [c._id, c]))

        // Process games in batches
        const batchSize = 1000
        const parsedGames: BaseGame[] = []
        let _batchParsed = 0
        let _batchSkipped = 0

        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize)

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
                  _id: record._id,
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
                if (!game.is_stream) parsedGames.push(parsed)
                _batchParsed++
              } catch (e) {
                console.error('Failed to parse game:', e, 'Record:', record)
                _batchSkipped++
              }
            } else {
              console.log(`Skipping game ${record._id}, missing serie or city:`, {
                serie: !!serie,
                city: !!city,
                series_id: record.series_id,
                city_id: record.city_id,
              })
              _batchSkipped++
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
            latitude: isNaN(Number(record.latitude)) ? undefined : Number(record.latitude),
            longitude: isNaN(Number(record.longitude)) ? undefined : Number(record.longitude),
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

    const seriesId =
      (params?.seriesId
        ? params?.seriesId
        : params?.seriesSlug
          ? (await this.getSeriesBySlug(params?.seriesSlug))?._id
          : null) ?? null

    const filterIds = params?.teamId
      ? (await this.getGameResultsByTeam(params.teamId)).map((result) => result.game._id)
      : null

    const filteredGames = allGames.filter((game) => {
      if (filterIds && !filterIds.includes(game._id)) return false
      if (city && game.city._id !== city._id) return false
      if (seriesId && game.series._id !== seriesId) return false
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
    try {
      const parsedresponse = GamesResponseSchema.strip().parse({
        data: joiner.joinToGames(paginatedGames),
        nextCursor: endIndex < filteredGames.length ? endIndex : null,
      })
      return parsedresponse
    } catch (e) {
      console.log(joiner.joinToGames(paginatedGames).map((game) => game.series))
      throw e
    }
  }

  async getGameById(id: string): Promise<Game | null> {
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

  async getGameResults(gameId: string | string[]): Promise<GameResult[]> {
    if (Array.isArray(gameId))
      return Promise.all(gameId.map((id) => this.getGameResults(id))).then((results) => results.flat())

    const allResults = await this.getRawGameResults()
    const filteredResults = allResults.filter((result) => result.game._id === gameId)

    const joiner = await this.getJoiner()
    return joiner.joinToGameResults(filteredResults)
  }

  async findTeamResults({ teamId, ...params }: FindTeamResultsParams): Promise<GameResultsResponse> {
    const gamesResponse = await this.getGamesByTeam({ teamId, ...params })

    const gameIds = gamesResponse.data.map((game) => game._id)
    const results = (await this.getGameResults(gameIds)).filter((result) => result.team._id === teamId)

    const joiner = await this.getJoiner()
    const resultsResponse = {
      ...gamesResponse,
      data: joiner.joinToGameResults(results),
    }

    return resultsResponse
  }

  async getGameResultsByCity(cityId: number): Promise<GameResult[]> {
    const allResults = await this.getRawGameResults()

    // Build indexes if not already built
    if (this.resultsByCity.size === 0) {
      this.buildResultsIndexes(allResults)
    }

    const results = this.resultsByCity.get(cityId) || []
    const joiner = await this.getJoiner()
    return joiner.joinToGameResults(results)
  }

  async getGameResultsByPack(seriesId: string, packNumber: string): Promise<GameResult[]> {
    const allResults = await this.getRawGameResults()
    const filteredResults = allResults.filter(
      (result) => result.game.series._id === seriesId && result.game.pack.number === packNumber
    )

    const joiner = await this.getJoiner()
    return joiner.joinToGameResults(filteredResults)
  }

  async getGameResultsByTeam(teamId: string): Promise<GameResult[]> {
    const allResults = await this.getRawGameResults()
    const filteredResults = allResults.filter((result) => result.team._id === teamId)

    const joiner = await this.getJoiner()
    return joiner.joinToGameResults(filteredResults)
  }

  async getMinimalGameResultsByTeam(teamId: string): Promise<MinimalGameResult[]> {
    const allResults = await this.getRawGameResults()
    const filteredResults = allResults.flatMap(
      ({
        team,
        game: {
          _id: game_id,
          date: game_date,
          series: { _id: game_series_id },
          pack: { formatted: pack_formatted },
        },
        ...rest
      }) => (team._id === teamId ? [{ ...rest, game_id, game_date, game_series_id, pack_formatted }] : [])
    )

    return filteredResults
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

  async getRawSeries(): Promise<BaseSeries[]> {
    return this.cache.series.get(
      () => this.readCsvFile('series.csv'),
      (records) =>
        records.map((record) =>
          BaseSeriesSchema.strip().parse({
            _id: record._id,
            name: record.name,
            slug: record.slug,
          })
        )
    )
  }

  async getSeries(): Promise<Series[]> {
    const baseSeries = await this.getRawSeries()

    const joiner = await this.getJoiner()
    const joinedSeries = joiner.joinToSeries(baseSeries)

    return joinedSeries
  }

  async getSeriesById(id: string): Promise<Series | null>
  async getSeriesById(id: string[]): Promise<Series[]>
  async getSeriesById(id: string | string[]): Promise<Series | null | Series[]> {
    if (Array.isArray(id))
      return Promise.all(id.map((id) => this.getSeriesById(id))).then((results) =>
        results.filter((res) => res !== null)
      )

    const rawSeries = await this.getRawSeries()

    const series = rawSeries.find((s) => s._id === id) || null
    const joiner = await this.getJoiner()

    return series !== null ? joiner.joinToSeries(series) : null
  }

  async getSeriesBySlug(slug: string): Promise<Series | null> {
    const rawSeries = await this.getRawSeries()
    const series = rawSeries.find((s) => s.slug === slug) || null

    const joiner = await this.getJoiner()
    return series !== null ? joiner.joinToSeries(series) : null
  }

  async getTeams(params?: GetTeamsParams): Promise<TeamsResponse> {
    const allTeams = await this.getRawTeams()
    const joiner = await this.getJoiner()
    const seriesId =
      params?.seriesId ??
      (params?.seriesSlug ? (await this.getSeriesBySlug(params.seriesSlug))?._id : undefined)
    const city = params?.cityId
      ? await this.getCityById(params.cityId)
      : params?.citySlug
        ? await this.getCityBySlug(params.citySlug)
        : null

    const filteredTeams = allTeams.filter((team) => {
      if (city && team.city?._id !== city._id) return false
      if (params?.search) return team.name.toLowerCase().includes(params.search.toLowerCase())
      return true
    })

    const joinedTeams = joiner.joinToTeams(filteredTeams)
    const seriesFilteredTeams = seriesId
      ? joinedTeams.filter((team) => (team.metrics?.series?.[seriesId]?.gamesCount ?? 0) > 0)
      : joinedTeams

    const sort = params?.sort ?? 'name'
    const order = params?.order ?? 'asc'
    const direction = order === 'desc' ? -1 : 1
    const normalizedSearch = params?.search?.toLowerCase().trim()

    const getMetrics = (team: Team) =>
      seriesId ? team.metrics?.series?.[seriesId] : team.metrics

    const minGames = params?.minGames ?? 0
    const minGamesFilteredTeams =
      sort === 'avg_sum' && minGames > 0
        ? seriesFilteredTeams.filter((team) => (getMetrics(team)?.gamesCount ?? 0) >= minGames)
        : seriesFilteredTeams

    const sortedTeams = minGamesFilteredTeams.sort((a, b) => {
      if (normalizedSearch) {
        const aName = a.name.toLowerCase()
        const bName = b.name.toLowerCase()
        const aStarts = aName.startsWith(normalizedSearch)
        const bStarts = bName.startsWith(normalizedSearch)
        if (aStarts !== bStarts) {
          return aStarts ? -1 : 1
        }
      }

      switch (sort) {
        case 'city': {
          const aCity = a.city?.name ?? ''
          const bCity = b.city?.name ?? ''
          return direction * aCity.localeCompare(bCity)
        }
        case 'games': {
          const aGames = getMetrics(a)?.gamesCount ?? 0
          const bGames = getMetrics(b)?.gamesCount ?? 0
          return direction * (aGames - bGames)
        }
        case 'avg_sum': {
          const aAvg = getMetrics(a)?.avgSum ?? 0
          const bAvg = getMetrics(b)?.avgSum ?? 0
          return direction * (aAvg - bAvg)
        }
        case 'sum_total': {
          const aSum = getMetrics(a)?.sumTotal ?? 0
          const bSum = getMetrics(b)?.sumTotal ?? 0
          return direction * (aSum - bSum)
        }
        case 'avg_place': {
          const aAvg = getMetrics(a)?.avgPlace ?? 0
          const bAvg = getMetrics(b)?.avgPlace ?? 0
          return direction * (aAvg - bAvg)
        }
        case 'best_sum': {
          const aBest = getMetrics(a)?.bestSum ?? 0
          const bBest = getMetrics(b)?.bestSum ?? 0
          return direction * (aBest - bBest)
        }
        case 'id':
          return direction * a._id.localeCompare(b._id)
        case 'name':
        default:
          return direction * a.name.localeCompare(b.name)
      }
    })

    const offset = params?.cursor ?? 0
    const limit = params?.limit ?? 20
    const paginatedTeams = sortedTeams.slice(offset, offset + limit)

    return TeamsResponseSchema.strip().parse({
      data: paginatedTeams,
      total: minGamesFilteredTeams.length,
      hasMore: offset + limit < minGamesFilteredTeams.length,
      nextCursor: offset + limit < minGamesFilteredTeams.length ? (offset + limit).toString() : undefined,
    })
  }

  async getTeamBySlug(slug: string, cityId: number): Promise<Team | null> {
    const teams = await this.getRawTeams()
    const team = teams.find((team) => team.slug === slug && team.city?._id === cityId) || null
    if (!team) return null
    const joiner = await this.getJoiner()
    return joiner.joinToTeams(team)
  }


  async getTeamResults(teamId: string): Promise<GameResult[]> {
    const allResults = await this.getRawGameResults()

    // Build indexes if not already built
    if (this.resultsByTeam.size === 0) {
      this.buildResultsIndexes(allResults)
    }

    const results = this.resultsByTeam.get(teamId) || []
    const joiner = await this.getJoiner()
    return joiner.joinToGameResults(results)
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
