import fs from 'fs'
import { inputs, codeToCountry, treatyInfoByCode, nwfzList } from './utils.js'
import _ from 'lodash'
import esMain from 'es-main'
import { marked } from 'marked'
import { render, createPreviewImage, htmlHeading, flagEmojiHtml, htmlFooter } from './render-utils.js'

const loadJs = () => fs.readFileSync('./script.js')

const treatyList = [
  'rome', 'aggression', 'npt', 'ctbt', 'nwfz', 'tpnw', 'bwc', 'biodiversity', 'paris'
]

const findNwfzMembership = (treatyData, nwfzList) => {
  for (const nwfz of nwfzList) {
    if (treatyData[nwfz] && treatyData[nwfz].joined) {
      return { joined: treatyData[nwfz].joined, nwfz }
    }
  }
  return { joined: false }
}

const composeDescription = ({ country, treaty, nwfz, withdrew, joiningMechanism, joined, signed }) => {
  let description = ''
  const isNwfz = treaty === 'nwfz'
  const { name: treatyName } = treatyInfoByCode()[isNwfz ? (nwfz ?? 'nwfz') : treaty]
  if (!joined) {
    description = `${country} has not yet joined ${isNwfz ? 'a' : 'the'} ${treatyName}.`
  } else {
    const treatyOrNwfzName = treatyName
    description = country
    let treatyMentioned = false
    if (signed) {
      description += ` signed the ${treatyOrNwfzName} on ${signed} and`
      treatyMentioned = true
    }
    description += ' ' + ({
      ratified: 'ratified',
      acceded: 'acceded to',
      accepted: 'accepted membership of',
      approved: 'gave approval to',
      succeeded: 'inherited membership of',
      joined: 'joined'
    }[joiningMechanism] ?? 'joined')
    description += treatyMentioned ? ' it' : ` the ${treatyOrNwfzName}`
    description += ` on ${joined}`
    if (withdrew) {
      description += `, but withdrew on ${withdrew}`
    }
    description += '.'
  }
  return description
}

const formatPopulation = (populationInteger) => {
  try {
    return populationInteger.toLocaleString('en-US')
  } catch (e) {
    return populationInteger
  }
}

const tabulate = (inputs, aggregatedData, population) => {
  const headerNames = ['', 'Country', 'Score', 'Population', ...treatyList]
  let rows = []
  const treatyCount = {}
  for (const [countryCode, treatyData] of Object.entries(aggregatedData)) {
    const row = []
    const country = codeToCountry(countryCode)
    const flagItem = { value: flagEmojiHtml(countryCode), classValue: 'flag' }
    const countryItem = { value: country, classValue: 'row_header' }
    const populationValue = population[countryCode]
    const populationItem = { value: formatPopulation(populationValue), dataValue: populationValue, classValue: 'row_header' }
    let memberCount = 0
    for (const treaty of treatyList) {
      let joined, nwfz
      const withdrew = treatyData[treaty] && treatyData[treaty].withdrew
      if (treaty === 'nwfz') {
        const found = findNwfzMembership(treatyData, nwfzList())
        joined = found.joined
        nwfz = found.nwfz
      } else {
        joined = treatyData[treaty] && treatyData[treaty].joined
      }
      const member = joined && !withdrew
      if (member) {
        ++memberCount
        treatyCount[treaty] = 1 + (treatyCount[treaty] ?? 0)
      }
      const value = member ? 'yes' : 'no'
      const dataValue = member ? 1 : 0
      const { joiningMechanism, signed } = treatyData[treaty] ?? {}
      const description = composeDescription({ country, treaty, nwfz, joined, joiningMechanism, signed, withdrew })
      row.push({ description, value, dataValue })
    }
    const countryScoreItem = {
      value: `${memberCount}/${treatyList.length}`,
      classValue: 'row_header',
      dataValue: memberCount,
      description: ''
    }
    rows.push([flagItem, countryItem, countryScoreItem, populationItem, ...row])
  }
  const header = headerNames.map(name => ({ name, count: treatyCount[name] }))
  // Sort by population
  rows = _.sortBy(rows, row => row[1].value)
  rows = _.sortBy(rows, row => row[2].value)
  return { rows, header }
}

const htmlTable = ({ header, rows }) => {
  const fragments = []
  const total = rows.length
  fragments.push('<table id="treaties">')
  fragments.push('<thead>')
  fragments.push("<tr class='header'>")
  for (const headerItem of header) {
    const treatyInfo = treatyInfoByCode()[headerItem.name]
    const logo = treatyInfo ? treatyInfo.logo : undefined
    const imageElement = logo ? `<img alt='${treatyInfo?.name} logo' src='./images/${logo}' class='treaty-logo'>` : ''
    const className = imageElement.length > 0 ? 'treaty-header' : 'data-header'
    fragments.push(`<th class='${className}'>${imageElement}<br>${treatyInfo?.name ?? headerItem.name}</th>`)
  }
  fragments.push('</tr>')
  fragments.push("<tr class='header'>")
  for (const headerItem of header) {
    const countString = headerItem.count ? `${headerItem.count}/${total}` : ''
    fragments.push(`<th class='treaty-count'>${countString}</th>`)
  }
  fragments.push('</tr>')
  fragments.push("<tr class='header'>")
  for (const headerItem of header) {
    fragments.push('<th class=\'sort-arrows\'>')
    if (headerItem.name.length > 0) {
      fragments.push('<img src="./images/sortArrowsUnsorted.svg" class="arrow-icon">')
    }
    fragments.push('</th>')
  }
  fragments.push('</tr>')
  fragments.push('</thead>')
  fragments.push('<tbody>')
  for (const row of rows) {
    fragments.push('<tr class=\'data\'>')
    for (const cell of row) {
      const tooltip = cell.description ? `title="${cell.description}"` : ''
      if (cell.classValue) {
        fragments.push(`<td ${tooltip} data-value="${cell.dataValue}" class="${cell.classValue}">${cell.value}</td>`)
      } else {
        const yes = cell.value === 'yes'
        fragments.push(`<td ${tooltip} data-value="${cell.dataValue}" class="${yes ? 'good' : 'bad'}">
                          <img class="status" alt="${yes ? 'member' : 'non-member'}">
                        </td>`)
      }
    }
    fragments.push('</tr>')
  }
  fragments.push('</tbody>')
  fragments.push('</table>')
  return fragments.join('')
}

export const renderTable = async (
  { dataDate, aggregatedData, populationData }, generatePreview) => {
  delete aggregatedData.EU
  delete aggregatedData.XX
  const { rows, header } = tabulate(inputs(), aggregatedData, populationData)
  const js = `const dataDate = new Date('${dataDate}');\n` + loadJs()
  const css = fs.readFileSync('./main.css').toString() + fs.readFileSync('./main-table.css').toString()
  await render('index.html', htmlHeading() + "<div class='table-container'>" + htmlTable({ rows, header }) + htmlFooter(dataDate) + '</div>', dataDate, js, css)
  if (generatePreview) {
    await createPreviewImage('./build/index.html', './build/index-preview.png')
  }
}

export const aboutPage = async (dataDate) => {
  const js = ''
  const copy = fs.readFileSync('./about.md').toString()
  const content = htmlHeading() + "<div class='copy'><div class='markdown-container'>" + marked.parse(copy) + '</div></div>'
  const css = fs.readFileSync('./main.css').toString()
  await render('about.html', content, dataDate, js, css)
}

const main = async () => {
  const aggregatedData = JSON.parse(fs.readFileSync('aggregated.json').toString())
  const populationData = JSON.parse(fs.readFileSync('population.json').toString())
  const dataDate = '1945-10-24T12:00:00Z'
  await renderTable({ aggregatedData, populationData, dataDate }, false)
  await aboutPage(dataDate)
}

if (esMain(import.meta)) {
  await main()
}
