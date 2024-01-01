// import { collectAllData } from './collect.js'
// import _ from 'lodash'

export const analyzeData = (data) => {
  const items = []
  for (const treaty of Object.keys(data)) {
    for (const countryCode of Object.keys(data[treaty])) {
      console.log(data[treaty][countryCode])
      const item = Object.assign({}, { treaty, countryCode }, data[treaty][countryCode])
      items.push(item)
    }
  }
  return items
}
