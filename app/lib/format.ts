import { formatInTimeZone } from 'date-fns-tz'
import { ru } from 'date-fns/locale'

export const formatDateTime = (date: Date, timeZone: string) =>
  formatInTimeZone(date, timeZone, 'eeeeee, dd.MM.yy, HH:mm', { locale: ru }).toLowerCase()
