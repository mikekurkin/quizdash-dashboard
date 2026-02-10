import { City } from '~/schemas/city'
import { Game, GamesResponse } from '~/schemas/game'
import { GameResult, GameResultsResponse, MinimalGameResult } from '~/schemas/gameResult'
import { Rank } from '~/schemas/rank'
import { Series } from '~/schemas/series'
import { Team, TeamsResponse } from '~/schemas/team'

export type GetGamesParams = {
  limit?: number
  cursor?: number
  search?: string
  dateFrom?: string
  dateTo?: string
  teamId?: string
  seriesId?: string
  packNumber?: string
} & ({ seriesId?: string; seriesSlug?: never } | { seriesId?: never; seriesSlug?: string }) &
  ({ cityId?: number; citySlug?: never } | { cityId?: never; citySlug?: string })

export type FindTeamResultsParams = {
  teamId: string
  limit?: number
  cursor?: number
  search?: string
  dateFrom?: string
  dateTo?: string
  packNumber?: string
} & ({ seriesId?: string; seriesSlug?: never } | { seriesId?: never; seriesSlug?: string }) &
  ({ cityId?: number; citySlug?: never } | { cityId?: never; citySlug?: string })

export type GetTeamsParams = {
  limit?: number
  cursor?: number
  search?: string
  sort?: string
  order?: 'asc' | 'desc'
  minGames?: number
} & ({ seriesId?: string; seriesSlug?: never } | { seriesId?: never; seriesSlug?: string }) &
  ({ cityId?: number; citySlug?: never } | { cityId?: never; citySlug?: string })

export interface Storage {
  // City operations
  getCities(): Promise<City[]>
  getCityBySlug(slug: string): Promise<City | null>
  getCityById(id: number): Promise<City | null>
  getCitiesWithGames(): Promise<City[]>

  // Game operations
  getGames(params?: GetGamesParams): Promise<GamesResponse>
  getGameById(id: string): Promise<Game | null>
  getGamesByTeam(params: GetGamesParams): Promise<GamesResponse>
  getGamesByPack(seriesId: string, packNumber: string): Promise<Game[]>

  // Result operations
  getGameResults(gameId: string | string[]): Promise<GameResult[]>
  getTeamResults(teamId: string): Promise<GameResult[]>
  getGameResultsByPack(seriesId: string, packNumber: string): Promise<GameResult[]>
  getGameResultsByCity(cityId: number): Promise<GameResult[]>
  getGameResultsByTeam(teamId: string): Promise<GameResult[]>
  getMinimalGameResultsByTeam(teamId: string): Promise<MinimalGameResult[]>
  getMaxScoreByPack(seriesId: string, packNumber: string): Promise<number>
  findTeamResults(params: FindTeamResultsParams): Promise<GameResultsResponse>

  // Team operations
  getTeams(params?: GetTeamsParams): Promise<TeamsResponse>
  getTeamBySlug(slug: string, cityId: number): Promise<Team | null>

  // Series operations
  getSeries(): Promise<Series[]>
  getSeriesById(id: string): Promise<Series | null>
  getSeriesById(id: string[]): Promise<Series[]>
  getSeriesBySlug(slug: string): Promise<Series | null>

  // Rank operations
  getRanks(): Promise<Rank[]>
}

export class StorageError extends Error {
  constructor(
    message: string,
    public cause?: unknown
  ) {
    super(message)
    this.name = 'StorageError'
  }
}
