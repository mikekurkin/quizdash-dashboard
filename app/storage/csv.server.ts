import { parse } from 'csv-parse'
import { createReadStream } from 'fs'
import path from 'path'
import { City, CitySchema } from '~/schemas/city'
import { Game, GameSchema, GamesResponse, GamesResponseSchema } from '~/schemas/game'
import { GameResult, GameResultSchema } from '~/schemas/gameResult'
import { Rank, RankSchema } from '~/schemas/rank'
import { Series, SeriesSchema } from '~/schemas/series'
import { Team, TeamSchema, TeamsResponse, TeamsResponseSchema } from '~/schemas/team'
import { QueryParams } from '~/types/data'
import { CsvCache } from './csvCache.server'
import { GetGamesParams, Storage } from './interface.server'

const DATA_DIR = path.join(process.cwd(), 'data.full')

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
    games: new CsvCache<Game[], RawCsvGame[]>('games.csv', DATA_DIR),
    results: new CsvCache<GameResult[], RawCsvResult[]>('results.csv', DATA_DIR),
    ranks: new CsvCache<Rank[], RawCsvRank[]>('ranks.csv', DATA_DIR),
    series: new CsvCache<Series[], RawCsvSeries[]>('series.csv', DATA_DIR),
    teams: new CsvCache<Team[], RawCsvTeam[]>('teams.csv', DATA_DIR),
  }

  async getCities(): Promise<City[]> {
    const cities = await this.cache.cities.get(
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
    return cities
  }

  async getCitiesWithGames(): Promise<City[]> {
    const games = await this.getAllGames()
    const allCities = await this.getCities()

    const cityIds = Array.from(new Set(games.map((game) => game.city._id)))
    const cities = allCities.filter((c) => cityIds.includes(c._id))

    return cities
  }

  async getCityBySlug(slug: string): Promise<City | null> {
    const cities = await this.getCities()
    return cities.find((city) => city.slug === slug) || null
  }

  async getCityById(id: number): Promise<City | null> {
    const cities = await this.getCities()
    return cities.find((city) => city._id === id) || null
  }

  private async getAllGames(): Promise<Game[]> {
    const allGames = await this.cache.games.get(
      () => this.readCsvFile('games.csv'),
      async (records) => {
        const games = records.map((record) => {
          const game = {
            _id: parseInt(record._id),
            city_id: parseInt(record.city_id),
            series_id: record.series_id,
            number: record.number,
            date: new Date(record.date),
            price: parseFloat(record.price),
            location: record.location,
            address: record.address,
            is_stream: record.is_stream === 'true',
          }

          const gamesInPackAndSeries = records
            .filter((g) => g.number === record.number && g.series_id === record.series_id)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

          const replayNumber = gamesInPackAndSeries.findIndex((g) => g._id === record._id) + 1

          return {
            ...game,
            replay_number: replayNumber,
          }
        })

        const series = await this.getSeries()
        const cities = await this.getCities()

        const parsedGames = games.map((game) =>
          GameSchema.strip().parse({
            ...game,
            pack: {
              number: game.number,
              replay_number: game.replay_number,
              formatted: `#${game.number}.${game.replay_number}`,
            },
            series: series.find((s) => s._id === game.series_id),
            city: cities.find((c) => c._id === game.city_id),
          })
        )

        return parsedGames
      }
    )

    return allGames
  }

  async getGames(params?: GetGamesParams): Promise<GamesResponse> {
    const allGames = await this.getAllGames()

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

    return GamesResponseSchema.strip().parse({
      data: paginatedGames,
      nextCursor: endIndex < filteredGames.length ? endIndex : null,
    })
  }

  async getGameById(id: number): Promise<Game | null> {
    const games = await this.getAllGames()
    const game = games.find((game) => game._id === id)

    return game ?? null
  }

  async getGamesByTeam({ teamId, ...params }: GetGamesParams): Promise<GamesResponse> {
    return this.getGames({ teamId, ...params })
  }

  async getGamesByPack(seriesId: string, packNumber: string): Promise<Game[]> {
    return (await this.getGames({ seriesId, packNumber })).data
  }

  private async getAllGameResults(): Promise<GameResult[]> {
    const allResults = await this.cache.results.get(
      () => this.readCsvFile('results.csv'),
      async (records) => {
        const results = records.map((record) => ({
          _id: record._id,
          game_id: parseInt(record.game_id),
          team_id: record.team_id,
          rounds: record.rounds.split(',').map(Number),
          sum: parseFloat(record.sum),
          place: parseInt(record.place),
          rank_id: record.rank_id,
          has_errors: record.has_errors === 'true',
        }))

        const games = await this.getAllGames()
        const teams = await this.getAllTeams()
        const ranks = await this.getRanks()

        const gamesMap = new Map(games.map((g) => [g._id, g]))
        const teamsMap = new Map(teams.map((t) => [t._id, t]))
        const ranksMap = new Map(ranks.map((r) => [r._id, r]))

        const parsedResults = results
          .map((result) => {
            try {
              return GameResultSchema.strip().parse({
                ...result,
                game: gamesMap.get(result.game_id),
                team: teamsMap.get(result.team_id),
                rank: ranksMap.get(result.rank_id ?? ''),
              })
            } catch {
              return null
            }
          })
          .filter((result): result is GameResult => result !== null)

        return parsedResults
      }
    )

    return allResults
  }

  async getGameResults(gameId: number): Promise<GameResult[]> {
    const allResults = await this.getAllGameResults()
    return allResults.filter((result) => result.game._id === gameId)
  }

  async getGameResultsByCity(cityId: number): Promise<GameResult[]> {
    const allResults = await this.getAllGameResults()
    return allResults.filter((result) => result.game.city._id === cityId)
  }

  async getGameResultsByPack(seriesId: string, packNumber: string): Promise<GameResult[]> {
    const allResults = await this.getAllGameResults()
    return allResults.filter((result) => result.game.series._id === seriesId && result.game.pack.number == packNumber)
  }

  async getMaxScoreByPack(seriesId: string, packNumber: string): Promise<number> {
    const results = await this.getGameResultsByPack(seriesId, packNumber)
    if (results.length === 0) return 0
    return Math.max(...results.map((result) => result.sum))
  }

  async getRanks(): Promise<Rank[]> {
    const ranks = await this.cache.ranks.get(
      () => this.readCsvFile('ranks.csv'),
      (records) =>
        records.map((record) =>
          RankSchema.strip().parse({
            _id: record._id,
            name: record.name,
          })
        )
    )
    return ranks
  }

  async getSeries(): Promise<Series[]> {
    const series = await this.cache.series.get(
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
    return series
  }

  async getSeriesById(id: string): Promise<Series | null> {
    const series = await this.getSeries()
    return series.find((s) => s._id === id) || null
  }

  async getSeriesBySlug(slug: string): Promise<Series | null> {
    const series = await this.getSeries()
    return series.find((s) => s.slug === slug) || null
  }

  private async getAllTeams(): Promise<Team[]> {
    const allTeams = await this.cache.teams.get(
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

    return allTeams
  }

  async getTeams(params?: QueryParams & { cityId?: number }): Promise<TeamsResponse> {
    const allTeams = await this.getAllTeams()

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
    const teams = await this.getAllTeams()
    return teams.find((team) => team.slug === slug && team.city?._id === cityId) || null
  }

  async getTeamResults(teamId: string): Promise<GameResult[]> {
    const results = await this.getAllGameResults()

    return results.filter((result) => result.team._id === teamId)
  }

  private async readCsvFile<T>(filename: string, options: { columns: boolean } = { columns: true }): Promise<T[]> {
    const records: T[] = []
    const parser = createReadStream(path.join(DATA_DIR, filename)).pipe(
      parse({
        columns: options.columns,
        skip_empty_lines: true,
      })
    )

    for await (const record of parser) {
      records.push(record)
    }

    return records
  }
}
