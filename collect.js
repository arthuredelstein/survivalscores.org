import { readYAML, writeJsonData } from './utils.js'
import esMain from 'es-main'
import { disarmament } from './disarmament.js'
import { populationInfo } from './population.js'
import { other } from './treaty.js'

const getAllData = async (inputs) => {
  const { otherUNTreaties, disarmamentTreaties, nwfzTreaties } = inputs
  const [otherData, disarmamentData, nwfzData] = await Promise.all([
    other(otherUNTreaties),
    disarmament(disarmamentTreaties),
    disarmament(nwfzTreaties)
  ])
  return Object.assign({}, otherData, disarmamentData, nwfzData)
}

const aggregate = (rawData) => {
  const results = {}
  for (const [treaty, data] of Object.entries(rawData)) {
    for (const [countryCode, { signed, joined, joiningMechanism, withdrew }] of Object.entries(data)) {
      if (results[countryCode] === undefined) {
        results[countryCode] = {}
      }
      results[countryCode][treaty] = { signed, joined, joiningMechanism, withdrew }
    }
  }
  return results
}

export const collectAllData = async () => {
  const inputs = readYAML('inputs.yaml')
  const [rawTreatyData, populationData] = await Promise.all([
    getAllData(inputs),
    populationInfo()
  ])
  const aggregatedData = aggregate(rawTreatyData)
  writeJsonData('raw.json', rawTreatyData)
  writeJsonData('population.json', populationData)
  writeJsonData('aggregated.json', aggregatedData)
  return { rawTreatyData, populationData, aggregatedData }
}

const main = async () => {
  await collectAllData()
}

if (esMain(import.meta)) {
  main()
}
