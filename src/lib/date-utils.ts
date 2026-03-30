import { THAI_MONTHS, THAI_MONTHS_SHORT, THAI_DAYS, BE_OFFSET } from './constants'

/** แปลง ค.ศ. → พ.ศ. */
export function toBuddhistYear(ceYear: number): number {
  return ceYear + BE_OFFSET
}

/** แปลง พ.ศ. → ค.ศ. */
export function toCEYear(beYear: number): number {
  return beYear - BE_OFFSET
}

/** format วันที่เป็นภาษาไทย เช่น "30 มีนาคม 2569" */
export function formatThaiDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const day = d.getDate()
  const month = THAI_MONTHS[d.getMonth()]
  const year = toBuddhistYear(d.getFullYear())
  return `${day} ${month} ${year}`
}

/** format วันที่แบบสั้น เช่น "30 มี.ค. 69" */
export function formatThaiDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const day = d.getDate()
  const month = THAI_MONTHS_SHORT[d.getMonth()]
  const year = toBuddhistYear(d.getFullYear()) % 100
  return `${day} ${month} ${year}`
}

/** ชื่อเดือนภาษาไทย (0-based index) */
export function getMonthName(monthIndex: number): string {
  return THAI_MONTHS[monthIndex]
}

/** ชื่อวันภาษาไทย (0=อาทิตย์) */
export function getDayName(dayIndex: number): string {
  return THAI_DAYS[dayIndex]
}

/** format เดือน+ปี เช่น "มีนาคม 2569" */
export function formatMonthYear(month: number, year: number): string {
  return `${THAI_MONTHS[month - 1]} ${toBuddhistYear(year)}`
}
