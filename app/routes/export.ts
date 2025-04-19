import { LoaderFunctionArgs } from '@remix-run/node'
import { createObjectCsvWriter } from 'csv-writer'
import { storage } from '~/services/storage.server'
import { GameResult } from '~/schemas/gameResult'
import path from 'path'
import os from 'os'
import { promises as fs } from 'fs'

export async function loader({ request }: LoaderFunctionArgs) {
  // Get all results
  const results = await storage.getGameResultsByCity(17) // 0 to get all results

  // Process results to flatten the data for CSV
  const processedResults = results.map((result: GameResult) => ({
    game_id: result.game._id,
    game_date: new Date(result.game.date).toISOString().slice(0, 19).replace('T', ' '), // YYYY-MM-DD HH:mm:ss
    game_location: result.game.location,
    series_name: result.game.series.name,
    pack_number: result.game.pack.number,
    pack_replay: result.game.pack.replay_number,
    team_name: result.team.name,
    team_city: result.team.city?.name || '',
    place: result.place,
    sum: result.sum,
    rounds: result.rounds.join(','),
    game_efficiency: result.metrics.game_efficiency,
    pack_efficiency: result.metrics.pack_efficiency,
    pack_place: result.metrics.pack_place,
    rank: result.rank?.name || '',
    has_errors: result.has_errors,
  }))

  // Create temporary file path
  const tmpDir = os.tmpdir()
  const csvFilePath = path.join(tmpDir, 'game_results_export.csv')

  // Setup CSV writer
  const csvWriter = createObjectCsvWriter({
    path: csvFilePath,
    header: [
      { id: 'game_id', title: 'Game ID' },
      { id: 'game_date', title: 'Game Date' },
      { id: 'game_location', title: 'Location' },
      { id: 'series_name', title: 'Series' },
      { id: 'pack_number', title: 'Pack #' },
      { id: 'pack_replay', title: 'Replay #' },
      { id: 'team_name', title: 'Team' },
      { id: 'team_city', title: 'City' },
      { id: 'place', title: 'Place' },
      { id: 'sum', title: 'Sum' },
      { id: 'rounds', title: 'Rounds' },
      { id: 'game_efficiency', title: 'Game Efficiency' },
      { id: 'pack_efficiency', title: 'Pack Efficiency' },
      { id: 'pack_place', title: 'Pack Place' },
      { id: 'rank', title: 'Rank' },
      { id: 'has_errors', title: 'Has Errors' },
    ],
  })

  // Write data to CSV
  await csvWriter.writeRecords(processedResults)

  // Read the file and return it as a response
  const fileBuffer = await fs.readFile(csvFilePath)

  // Clean up temporary file
  await fs.unlink(csvFilePath)

  return new Response(fileBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="game_results_export.csv"',
    },
  })
}
