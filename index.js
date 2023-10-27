import { collectAllData } from './collect.js'
import { renderSite } from './render.js'
import esMain from 'es-main'

const main = async () => {
  const dataDate = new Date()
  const { aggregatedData, populationData } = await collectAllData()
  await renderSite({ aggregatedData, populationData, dataDate }, true)
}

if (esMain(import.meta)) {
  await main()
}
