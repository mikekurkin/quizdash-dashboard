import 'i18next'
import type { default as common, default as games } from '../../public/locales/ru/common.json'
import type game from '../../public/locales/ru/game.json'
import type pack from '../../public/locales/ru/pack.json'
import type team from '../../public/locales/ru/team.json'

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: {
      common: typeof common
      games: typeof games
      game: typeof game
      pack: typeof pack
      team: typeof team
    }
    returnNull: false
    jsonFormat: 'v4'
  }
}
