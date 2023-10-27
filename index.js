import { collectAllData } from './collect.js'
import { renderSite, aboutPage } from './render.js'
import esMain from 'es-main'

const main = async () => {
  const dataDate = new Date()
  const { aggregatedData, populationData } = await collectAllData()
  await renderSite({ aggregatedData, populationData, dataDate }, true)
  await aboutPage(dataDate)
}

if (esMain(import.meta)) {
  await main()
}
