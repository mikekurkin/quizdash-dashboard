import { Reader } from '@maxmind/geoip2-node'
import * as fs from 'fs'
import { isIP } from 'net'
import { getDataSourceConfig } from '~/config/environment.server'
import { nearestNeighbor } from '~/lib/utils'
import { City } from '~/schemas/city'
import { storage } from './storage.server'

const config = getDataSourceConfig()

export class LocationService {
  constructor() {
    this.cities = []
    storage.getCitiesWithGames().then((cities) => (this.cities = cities))
    if (config.maxMindDbPath) {
      const dbBuf = fs.readFileSync(config.maxMindDbPath)
      try {
        this.reader = Reader.openBuffer(dbBuf)
      } catch (e) {
        console.error(e)
      }
    }
  }

  private reader
  cities: City[]
  get mode() {
    return this.reader ? 'ip' : 'default'
  }

  getNearestCity(ip?: string | null): City | undefined {
    if (this.cities.length === 0) return undefined
    const defaultCity = this.cities.at(0)

    if (!ip || !isIP(ip) || !this.reader) return defaultCity

    let ipCity = undefined
    try {
      ipCity = this.reader.city(ip)

    } catch (e) {
      console.error(e)
    }

    const ipCityName = ipCity?.city?.names.ru

    const matchingNameCity = this.cities.find((c) => c.name === ipCityName)
    if (matchingNameCity) return matchingNameCity

    const ipCityLocation = ipCity?.location
    if (!ipCityLocation) return defaultCity

    const citiesWithLocations = this.cities.filter(
      (c) => c.latitude !== undefined && c.longitude !== undefined
    ) as Required<City>[]

    const nearestCity = nearestNeighbor(ipCityLocation, citiesWithLocations)
    return nearestCity ?? defaultCity
  }
}

export const locationService = new LocationService()
