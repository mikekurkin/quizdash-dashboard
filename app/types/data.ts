// export interface GameResult {
//   _id: string;
//   game_id: number;
//   team_id: string;
//   team?: Team;
//   rounds: number[];
//   sum: number;
//   place: number;
//   rank_id?: string | null;
//   has_errors: boolean;
// }

// export interface Game {
//   _id: number;
//   city_id: number;
//   series: Series;
//   number: string;
//   replayNumber: number;
//   date: Date;
//   price: number;
//   location: string;
//   address?: string;
//   is_stream: boolean;
//   processed?: boolean;
// }

// export interface Team {
//   _id: string;
//   city_id: number;
//   name: string;
//   slug: string;
//   previous_team_id?: string;
//   inconsistent_rank: boolean;
// }

// export interface City {
//   _id: number;
//   name: string;
//   slug: string;
//   timezone: string;
//   last_game_id?: number;
// }

// export interface Series {
//   _id: string;
//   name: string;
//   slug: string;
// }

// export interface RankMapping {
//   _id: string;
//   name: string;
//   image_urls: string[];
// }

export interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  icon: React.ComponentType;
}

// export interface PaginatedResponse<T> {
//   data: T[];
//   total: number;
//   hasMore: boolean;
//   nextCursor?: string;
// }

export interface QueryParams {
  cursor?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  series?: string;
  team?: string;
  city_id?: string;
}

// export interface TeamStats {
//   team_id: string;
//   team_name: string;
//   totalPoints: number;
//   gamesPlayed: number;
//   avgPoints: number;
//   bestPlace: number;
// }
