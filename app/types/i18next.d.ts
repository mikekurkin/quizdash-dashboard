import 'i18next'
import type common from '../../public/locales/ru/common.json'
import type game from '../../public/locales/ru/game.json'
import type games from '../../public/locales/ru/common.json'
import type pack from '../../public/locales/ru/pack.json'

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: {
      common: typeof common
      games: typeof games
      game: typeof game
      pack: typeof pack
    }
    returnNull: false
    jsonFormat: 'v4'
  }
}
