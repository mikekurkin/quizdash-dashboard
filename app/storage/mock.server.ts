// import { City, CitySchema } from '~/schemas/city';
// import { Game, GameSchema, GamesResponse, GamesResponseSchema } from '~/schemas/game';
// import { GameResult, GameResultSchema } from '~/schemas/gameResult';
// import { Rank, RankSchema } from '~/schemas/rank';
// import { Series, SeriesSchema } from '~/schemas/series';
// import { Team, TeamSchema, TeamsResponse, TeamsResponseSchema } from '~/schemas/team';
// import { QueryParams } from '~/types/data';
// import type { Storage } from './interface.server';
// import { StorageError } from './interface.server';

// export class MockStorage implements Storage {
//   async getCitiesWithGames(): Promise<City[]> {
//     try {
//       // Get unique city IDs from games
//       const cityIds = new Set(this.games.map(game => game.city_id));

//       // Filter cities to only those that have games
//       return this.cities.filter(city => cityIds.has(city._id));
//     } catch (error) {
//       throw new StorageError('Failed to get cities with games', error);
//     }
//   }

//   async getCityById(id: number): Promise<City | null> {
//     try {
//       return this.cities.find(city => city._id === id) || null;
//     } catch (error) {
//       throw new StorageError('Failed to get city by ID', error);
//     }
//   }

//   async getGamesByPackage(seriesId: string, packageNumber: string): Promise<Game[]> {
//     try {
//       return this.games.filter(game => game.series_id === seriesId && game.number === packageNumber);
//     } catch (error) {
//       throw new StorageError('Failed to get games by package', error);
//     }
//   }

//   async getGameResultsByPackage(
//     seriesId: string,
//     packageNumber: string,
//     options: { withTeams: boolean } = { withTeams: false }
//   ): Promise<GameResult[]> {
//     try {
//       const games = await this.getGamesByPackage(seriesId, packageNumber);
//       const gameIds = games.map(game => game._id);
//       const results = this.results.filter(result => gameIds.includes(result.game_id));

//       if (options.withTeams) {
//         return results.map(result => ({
//           ...result,
//           team: this.teams.find(team => team._id === result.team_id),
//         }));
//       }

//       return results;
//     } catch (error) {
//       throw new StorageError('Failed to get game results by package', error);
//     }
//   }

//   async getMaxScoreByPackage(seriesId: string, packageNumber: string): Promise<number> {
//     try {
//       const results = await this.getGameResultsByPackage(seriesId, packageNumber);
//       if (results.length === 0) return 0;

//       const maxScore = Math.max(...results.map(result => result.sum));
//       return maxScore;
//     } catch (error) {
//       throw new StorageError('Failed to get max score by package', error);
//     }
//   }

//   private cities: City[] = [
//     { _id: 9, name: 'Moscow', slug: 'moscow', timezone: 'Europe/Moscow' },
//     { _id: 17, name: 'Saint-Petersburg', slug: 'spb', timezone: 'Europe/Moscow' },
//   ];

//   private series: Series[] = [
//     { _id: 'c799f8ff-1597-4afa-b262-eb6397eadbb4', name: '[кино и музыка] SPB', slug: 'kino-i-muzyka-spb' },
//     { _id: 'e1152e27-d41f-4b34-b3b1-faac7dba9380', name: 'Квиз, плиз! SPB', slug: 'quiz-please-spb' },
//   ];

//   private rankMappings: RankMapping[] = [
//     {
//       _id: '8a4c2b1d-9e3f-4a5d-b7c6-2d1e9f8a3b5c',
//       name: 'Виниловая пластинка',
//       image_urls: [
//         '/storage/source/1/nn2dnGqcNIOtgh2IWHoVWeIzZLluIysP.png',
//         '/storage/source/1/eeS4YdNfGSASffh61AJEfyAIVrL6ioDH.png',
//       ],
//     },
//     {
//       _id: '6c2e1d9f-7a3b-4c5d-b8e7-4f2a1b9c8d3e',
//       name: 'Две виниловые пластинки',
//       image_urls: ['/storage/source/1/j3jAjN6nyWlB6a83By-sLYCstlyTdq9b.png'],
//     },
//     {
//       _id: '5d1f2e9a-6b4c-3d5e-c9f8-5a2b1c9d8e3f',
//       name: 'Три виниловые пластинки',
//       image_urls: ['/storage/source/1/lSk7YZRHNXb4dhl5HD96EZ0FIpZ11bnR.png'],
//     },
//     {
//       _id: '4e2a3f1b-5c6d-2e7f-d8a9-6b3c2d1e9f4a',
//       name: 'Золотая пластинка',
//       image_urls: ['/storage/source/1/yFFvZ3as7tiUbBj095Yp5Olv2Zk-dYNY.png'],
//     },
//     {
//       _id: '3f1b2a4e-4d5c-1f6e-e7b8-7c4d2e1f9a5b',
//       name: 'Две золотые пластинки',
//       image_urls: ['/storage/source/1/Id6HipkbuIXwuUAlJgxCQmk7y82Y_Tpk.png'],
//     },
//     {
//       _id: '2a3c4b1d-3e5f-2g6h-f9i8-8d5e2f1a9b6c',
//       name: 'Три золотые пластинки',
//       image_urls: ['/storage/source/1/z3E-ZHHJp8d01yV3k2l3X3fy1A62GGxE.png'],
//     },
//     {
//       _id: '1b2c3d4e-2f3g-4h5i-j6k7-9e6f3g2h1i4j',
//       name: 'Платиновая пластинка',
//       image_urls: ['/storage/source/1/alWqb2W3ldubQjRng2pUI4AWrGa0ySfw.png'],
//     },
//     {
//       _id: '9c8b7a6d-1e2f-3g4h-i5j6-0f7g4h1i2j3k',
//       name: 'Бриллиантовая пластинка',
//       image_urls: ['/storage/source/1/2tI0y4HGorrt-vUOcj5DGDhZ3L4HbfPM.png'],
//     },
//     {
//       _id: '8d7c6b5a-9f1e-2g3h-i4j5-1g8h5i2j3k4l',
//       name: 'Сержант',
//       image_urls: ['/storage/source/1/_RxoDTGn5dtAARj_0kWXrbvEBOtUqak5.png'],
//     },
//     {
//       _id: '7e6d5c4b-8a1f-2g3h-i4j5-2h9i6j3k4l5m',
//       name: 'Рэмбо',
//       image_urls: ['/storage/source/1/fvd3W53LivI8kYQT16M3O1FIEmSBeDjw.png'],
//     },
//     {
//       _id: '6f5e4d3c-7b2a-1g3h-i4j5-3i0j7k4l5m6n',
//       name: 'Лейтенант',
//       image_urls: ['/storage/source/1/ss5kmfFa3l2Z1zx2nbheYKAHG4j7GUOS.png'],
//     },
//     {
//       _id: '5g6f4e3d-6c3b-1h2i-j4k5-4j1k8l5m6n7o',
//       name: 'Чак Норрис',
//       image_urls: ['/storage/source/1/ga4O8ALF0T9e14dW3PbBkleDRczFyWo8.png'],
//     },
//     {
//       _id: '4h7g5f3e-5d4c-1i2j-k4l5-5k2l9m6n7o8p',
//       name: 'Генерал',
//       image_urls: ['/storage/source/1/WKgIZdl-KOuBSWFWRo1CbPnkQsB1qrHG.png'],
//     },
//     {
//       _id: '3i8h6g4f-4e5d-1j2k-l4m5-6l3m0n7o8p9q',
//       name: 'Недосягаемые',
//       image_urls: ['/storage/source/1/Fj8fkSUZSleH1na2hTJ0ZF5TxI2V_wP7.png'],
//     },
//     {
//       _id: '2j9i7h5g-3f6e-1k2l-m4n5-7m4n1o8p9q0r',
//       name: 'Легенда',
//       image_urls: ['/storage/source/1/vymbAtLhrNGoinHXbRE0MSb4MwUHNGLp.png'],
//     },
//   ];

//   private games: Game[] = this.initializeGames();

//   private initializeGames(): Game[] {
//     // Generate packages first
//     const packages = this.series.flatMap(series =>
//       Array.from({ length: 10 }, (_, i) => ({
//         seriesId: series._id,
//         number: (i + 1).toString(),
//         gameCount: Math.floor(Math.random() * 3) + 3, // Random number between 3 and 5
//       }))
//     );

//     // Generate games for each package
//     return packages.flatMap(pkg => {
//       return Array.from({ length: pkg.gameCount }, () => ({
//         _id: Math.floor(Math.random() * 1000000) + 1,
//         city_id: this.cities[Math.floor(Math.random() * this.cities.length)]._id,
//         series_id: pkg.seriesId,
//         number: pkg.number,
//         date: new Date(Date.now() - Math.random() * 10000000000),
//         price: Math.floor(Math.random() * 50) + 50,
//         location: 'Test Location',
//         address: '123 Test Street',
//         is_stream: Math.random() > 0.8,
//         processed: true,
//       }));
//     });
//   }

//   private teams: Team[] = Array.from({ length: 200 }, () => {
//     const adjectives = [
//       'Happy',
//       'Smart',
//       'Quick',
//       'Clever',
//       'Brave',
//       'Mysterious',
//       'Cool',
//       'Energetic',
//       'Bold',
//       'Sudden',
//     ];
//     const nouns = [
//       'Experts',
//       'Scholars',
//       'Thinkers',
//       'Geniuses',
//       'Winners',
//       'Players',
//       'Masters',
//       'Philosophers',
//       'Strategists',
//       'Intellectuals',
//     ];
//     const prefixes = ['Team', 'Club', 'Squad', 'Friends', 'Fans'];
//     const suffixes = ['& Co', 'Plus', '2.0', 'PRO', 'MAX'];

//     const generateName = () => {
//       const rand = Math.random();
//       if (rand < 0.3) {
//         return `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${
//           nouns[Math.floor(Math.random() * nouns.length)]
//         }`;
//       } else if (rand < 0.32) {
//         return `${prefixes[Math.floor(Math.random() * prefixes.length)]} "${
//           nouns[Math.floor(Math.random() * nouns.length)]
//         }"`;
//       } else {
//         return `${nouns[Math.floor(Math.random() * nouns.length)]} ${
//           suffixes[Math.floor(Math.random() * suffixes.length)]
//         }`;
//       }
//     };

//     const name = generateName();
//     const slug = name
//       .toLowerCase()
//       .replace(/[^a-z0-9\s-]/g, '')
//       .replace(/\s+/g, '-');

//     return {
//       _id: `${Math.random().toString(36).substring(2, 15)}-${Math.random()
//         .toString(36)
//         .substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}-${Math.random()
//         .toString(36)
//         .substring(2, 15)}`,
//       city_id: this.cities[Math.floor(Math.random() * this.cities.length)]._id,
//       name,
//       slug,
//       inconsistent_rank: Math.random() > 0.9,
//     };
//   });

//   private results: GameResult[] = this.initializeResults();

//   private initializeResults(): GameResult[] {
//     // Track used teams per package
//     const usedTeamsPerPackage = new Map<string, Set<string>>();
//     // Track rounds per package
//     const roundsPerPackage = new Map<string, number>();

//     return this.games
//       .flatMap(game => {
//         const packageKey = `${game.series_id}-${game.number}`;

//         // Initialize package tracking if needed
//         if (!usedTeamsPerPackage.has(packageKey)) {
//           usedTeamsPerPackage.set(packageKey, new Set<string>());
//           // Set random number of rounds (7-10) for this package
//           roundsPerPackage.set(packageKey, Math.floor(Math.random() * 4) + 7);
//         }

//         const usedTeamsInPackage = usedTeamsPerPackage.get(packageKey)!;
//         const numberOfRounds = roundsPerPackage.get(packageKey)!;

//         const teamIds = new Set<string>();

//         return Array.from({ length: Math.floor(Math.random() * 10) + 5 }, (_, i) => {
//           let team;
//           do {
//             team = this.teams[Math.floor(Math.random() * this.teams.length)];
//           } while (
//             teamIds.has(team._id) || // Check if team is already in this game
//             usedTeamsInPackage.has(team._id) // Check if team is already in this package
//           );

//           teamIds.add(team._id);
//           usedTeamsInPackage.add(team._id);

//           return {
//             _id: `${Math.random().toString(36).substring(2, 15)}-${Math.random()
//               .toString(36)
//               .substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}-${Math.random()
//               .toString(36)
//               .substring(2, 15)}`,
//             game_id: game._id,
//             team_id: team._id,
//             rounds: Array.from({ length: numberOfRounds }, () => Math.floor(Math.random() * 6)),
//             sum: 0,
//             place: i + 1,
//             rank_id:
//               Math.random() > 0.3 ? this.rankMappings[Math.floor(Math.random() * this.rankMappings.length)]._id : null,
//             has_errors: Math.random() > 0.95,
//           };
//         });
//       })
//       .map(result => ({
//         ...result,
//         sum: result.rounds.reduce((a, b) => a + b, 0),
//       }));
//   }

//   async getCities(): Promise<City[]> {
//     return this.cities;
//   }

//   async getCityBySlug(slug: string): Promise<City | null> {
//     return this.cities.find(city => city.slug === slug) || null;
//   }

//   async getGames(
//     { citySlug, cursor, limit = 20 }: { citySlug: string; cursor?: string | number; limit?: number },
//     { withSeries = false }: { withSeries?: boolean } = {}
//   ) {
//     const city = this.cities.find((c) => c.slug === citySlug);
//     if (!city) throw new Error(`City ${citySlug} not found`);

//     const games = this.games.filter((g) => g.city_id === city._id);

//     // Convert cursor to number and handle pagination
//     const startIndex = cursor ? parseInt(cursor.toString()) : 0;
//     const endIndex = startIndex + limit;
//     const paginatedGames = games.slice(startIndex, endIndex);

//     // Add series data if requested
//     const gamesWithSeries = withSeries
//       ? paginatedGames.map((game) => ({
//           ...game,
//           series: this.series.find((s) => s._id === game.series_id),
//         }))
//       : paginatedGames;

//     return {
//       data: gamesWithSeries,
//       nextCursor: endIndex < games.length ? endIndex : null,
//     };
//   }

//   async getGameById(id: number, options: { withSeries: boolean } = { withSeries: false }): Promise<Game | null> {
//     const game = this.games.find(game => game._id === id) || null;

//     if (options.withSeries && game) {
//       return {
//         ...game,
//         series: this.series.find(series => series._id === game.series_id),
//       };
//     }

//     return game;
//   }

//   async getGamesByTeam(
//     teamId: string,
//     params: {
//       cursor?: string;
//       limit?: number;
//       sort?: string;
//       order?: 'asc' | 'desc';
//       search?: string;
//       series?: string;
//     },
//     options: { withSeries: boolean } = { withSeries: false }
//   ): Promise<PaginatedResponse<Game>> {
//     const teamResults = this.results.filter(result => result.team_id === teamId);
//     const gameIds = new Set(teamResults.map(result => result.game_id));
//     const filteredGames = this.games.filter(game => gameIds.has(game._id));

//     const startIndex = params.cursor ? parseInt(params.cursor) : 0;
//     const limit = params.limit || 20;
//     const endIndex = startIndex + limit;

//     const games = filteredGames.slice(startIndex, endIndex);

//     if (options.withSeries) {
//       return {
//         data: games.map(game => ({
//           ...game,
//           series: this.series.find(series => series._id === game.series_id),
//         })),
//         total: filteredGames.length,
//         hasMore: endIndex < filteredGames.length,
//         nextCursor: endIndex < filteredGames.length ? endIndex.toString() : undefined,
//       };
//     }

//     return {
//       data: games,
//       total: filteredGames.length,
//       hasMore: endIndex < filteredGames.length,
//       nextCursor: endIndex < filteredGames.length ? endIndex.toString() : undefined,
//     };
//   }

//   async getGameResults(gameId: number, options: { withTeams: boolean } = { withTeams: false }): Promise<GameResult[]> {
//     const results = this.results.filter(result => result.game_id === gameId);

//     if (options.withTeams) {
//       return results.map(result => ({
//         ...result,
//         team: this.teams.find(team => team._id === result.team_id),
//       }));
//     }

//     return results;
//   }

//   async getTeamResults(teamId: string): Promise<GameResult[]> {
//     return this.results.filter(result => result.team_id === teamId);
//   }

//   async getTeamBySlug(slug: string, cityId: number): Promise<Team | null> {
//     return this.teams.find(team => team.slug === slug && team.city_id === cityId) || null;
//   }

//   async getTeamStats(params: {
//     cityId?: number;
//     cursor?: string;
//     limit?: number;
//     sort?: string;
//     order?: 'asc' | 'desc';
//     search?: string;
//     series?: string;
//   }): Promise<{
//     data: Team[];
//     total: number;
//     hasMore: boolean;
//     nextCursor?: string;
//   }> {
//     let filteredTeams = [...this.teams];

//     if (params.cityId) {
//       filteredTeams = filteredTeams.filter(team => team.city_id === params.cityId);
//     }

//     if (params.search) {
//       const search = params.search.toLowerCase();
//       filteredTeams = filteredTeams.filter(team => team.name.toLowerCase().includes(search));
//     }

//     const startIndex = params.cursor ? parseInt(params.cursor) : 0;
//     const limit = params.limit || 20;
//     const endIndex = startIndex + limit;

//     return {
//       data: filteredTeams.slice(startIndex, endIndex),
//       total: filteredTeams.length,
//       hasMore: endIndex < filteredTeams.length,
//       nextCursor: endIndex < filteredTeams.length ? endIndex.toString() : undefined,
//     };
//   }

//   async getSeries(): Promise<Series[]> {
//     return this.series;
//   }

//   async getSeriesBySlug(slug: string): Promise<Series | null> {
//     return this.series.find(s => s.slug === slug) || null;
//   }

//   async getSeriesById(id: string): Promise<Series | null> {
//     return this.series.find(s => s._id === id) || null;
//   }

//   async getRankMappings(): Promise<RankMapping[]> {
//     return this.rankMappings;
//   }
// }
