import { collectAllData } from './collect.js'
import { renderTable, aboutPage } from './render-table.js'
import esMain from 'es-main'

const main = async () => {
  const dataDate = new Date()
  const { aggregatedData, populationData } = await collectAllData()
  await renderTable({ aggregatedData, populationData, dataDate }, true)
  await aboutPage(dataDate)
}

if (esMain(import.meta)) {
  await main()
}
