import fs from 'fs'
import { inputs, codeToCountry, treatyInfoByCode } from './utils.js'
import _ from 'lodash'
import esMain from 'es-main'
import captureWebsite from 'capture-website'
import cleaner from 'clean-html'
import { marked } from 'marked'

const page = ({ css, js, content }) => `
<!DOCTYPE html>
<html>
 <head>
  <title>SurvivalScores.org: Monitoring treaties critical to the survival of humanity</title>
  <meta charset="utf8"/>
  <meta name="format-detection" content="telephone=no" />
  <meta name="viewport" content="width=device-width, initial-scale=0.7" />
  <meta name="twitter:card" content="summary_large_image"/>
  <meta property="og:image" content="https://survivalscores.org/index-preview.png"/>
  <meta property="og:title" content="Can humanity survive?"/>
  <meta property="og:description" content="Monitoring treaties critical to human survival."/>
  <meta property="og:type" content="website"/>
  <link rel="icon" type="image/x-icon" href="./images/survivalscores_logo_dark.svg">
  <link rel="preload" href="./images/sortArrowsDown.svg" as="image">
  <link rel="preload" href="./images/sortArrowsUp.svg" as="image">
  <link rel="preload" href="./images/sortArrowsUnsorted.svg" as="image">
  <style>${css}</style>
  <script type="module">${js}</script>
 </head>
 <body>
  ${content}
 </body>
</html>
`

const cleanHtml = (content) => new Promise(resolve => cleaner.clean(content, { wrap: 0 }, resolve))

const createPreviewImage = async (htmlFile, pngFile) => {
  await captureWebsite.file(htmlFile, pngFile, {
    width: 1000,
    height: 523,
    scaleFactor: 1.0,
    overwrite: true
  })
  console.log('wrote', pngFile)
}

const loadJs = () => fs.readFileSync('./script.js')

const render = async (filename, html, dataDate, js) => {
  //  consolee.log(aggregated);
  const css = fs.readFileSync('./main.css').toString()
  const htmlPage = await cleanHtml(page({ css, js, content: html }))
  const path = `./build/${filename}`
  fs.writeFileSync(path, htmlPage)
  console.log(`wrote ${path}`)
}

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

const convertCharacter = (char) => {
  const index = char.charCodeAt(0) - 64
  const newIndex = index + 127461
  return `&#${newIndex};`
}

const flagEmojiHtml = (countryCode) => {
  if (countryCode === 'TP') {
    countryCode = 'TL'
  }
  return countryCode.split('').map(convertCharacter).join('')
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
  const { nwfzTreaties } = inputs
  // const treatyList = [...otherUNTreaties.map(t => t.code),
  //  ...disarmamentTreaties.map(t => t.code)];
  const nwfzList = nwfzTreaties.map(t => t.code)
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
        const found = findNwfzMembership(treatyData, nwfzList)
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

const htmlHeading = () =>
  `<div class='title'>
    <div class='title-group'>
      <div class='title-text'><a href="/"><img id='logo' src='./images/survivalscores_logo.svg'>SurvivalScores.org</a></div>
      <div class='tagline-text'>Monitoring treaties critical to the survival of humanity</div>
    </div>
    <div id='updated'></div>
    <div class='links'>
    <a href="./about">About</a> &#x2022;
    <a href="https://twitter.com/survivalscores">Twitter</a> &#x2022;
    <a rel="me" href="https://mastodon.social/@survivalscores">Mastodon</a>
  </div>
  </div>
`

const htmlFooter = (dataDate) => `
  <div class="footer"><b>Data sources</b><br>
    Data presented in this table was retrieved from live databases maintained by the United Nations:
    <ul>
      <li><a href="https://treaties.unoda.org/">Disarmament Treaties Database</a>, United Nations Office for Disarmament Affairs</li>
      <li><a href="https://treaties.un.org/Pages/ParticipationStatus.aspx">Multilateral Treaties Deposited with the Secretary-General</a>, United Nations, New York</li>
      <li><a href="https://data.un.org/">UNdata</a>, United Nations Statistics Division</li>
    </ul>
    Data retrieved at ${(new Date(dataDate)).toISOString()}
  </div>
`

const htmlTable = ({ header, rows }) => {
  const fragments = []
  const total = rows.length
  fragments.push('<table id="treaties">')
  fragments.push('<thead>')
  fragments.push("<tr class='header'>")
  for (const headerItem of header) {
    const treatyInfo = treatyInfoByCode()[headerItem.name]
    const logo = treatyInfo ? treatyInfo.logo : undefined
    const imageElement = logo ? `<img src='./images/${logo}' class='treaty-logo'>` : ''
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
        fragments.push(`<td ${tooltip} data-value="${cell.dataValue}" class="${cell.value === 'yes' ? 'good' : 'bad'}">&nbsp;</td>`)
      }
    }
    fragments.push('</tr>')
  }
  fragments.push('</tbody>')
  fragments.push('</table>')
  return fragments.join('')
}

export const renderSite = async (
  { dataDate, aggregatedData, populationData }, generatePreview) => {
  delete aggregatedData.EU
  delete aggregatedData.XX
  const { rows, header } = tabulate(inputs(), aggregatedData, populationData)
  const js = `const dataDate = new Date('${dataDate}');\n` + loadJs()
  await render('index.html', htmlHeading() + "<div class='table-container'>" + htmlTable({ rows, header }) + htmlFooter(dataDate) + '</div>', dataDate, js)
  if (generatePreview) {
    await createPreviewImage('./build/index.html', './build/index-preview.png')
  }
}

export const aboutPage = async (dataDate) => {
  const js = ''
  const copy = fs.readFileSync('./about.md').toString()
  const content = htmlHeading() + "<div class='copy'><div class='markdown-container'>" + marked.parse(copy) + '</div></div>'
  await render('about.html', content, dataDate, js)
}

const main = async () => {
  const aggregatedData = JSON.parse(fs.readFileSync('aggregated.json').toString())
  const populationData = JSON.parse(fs.readFileSync('population.json').toString())
  const dataDate = '1945-10-24T12:00:00Z'
  await renderSite({ aggregatedData, populationData, dataDate }, false)
  await aboutPage(dataDate)
}

if (esMain(import.meta)) {
  await main()
}
