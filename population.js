import { gunzipSync } from 'zlib'
import { parse } from 'csv-parse/sync'
import { readYAML } from './utils.js'

const WPP_POPULATION_URL =
  'https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/CSV_FILES/WPP2024_TotalPopulationBySex.csv.gz'

const readRemoteGzippedCSV = async (url) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`population download failed: ${response.status} ${url}`)
  }
  const compressed = Buffer.from(await response.arrayBuffer())
  const csvText = gunzipSync(compressed).toString('utf8')
  return parse(csvText, { columns: true, skip_empty_lines: true, bom: true })
}

export const populationInfo = async () => {
  const knownCodes = new Set(Object.keys(readYAML('countries.yaml')))
  const rows = await readRemoteGzippedCSV(WPP_POPULATION_URL)
  const thisYear = new Date().getFullYear().toString()
  const items = rows.filter(row =>
    row.LocTypeName === 'Country/Area' &&
    row.Variant === 'Medium' &&
    row.Time === thisYear)
  const result = {}
  for (const item of items) {
    const countryCode = item.ISO2_code?.trim()
    if (!countryCode || !knownCodes.has(countryCode)) {
      continue
    }
    // PopTotal is reported in thousands.
    result[countryCode] = Math.round(parseFloat(item.PopTotal) * 1000)
  }
  return result
}
