import esMain from 'es-main'
import { render, createPreviewImage, htmlFooter, flagEmojiHtml } from './render-utils.js'
import fs from 'fs'
import { codeToCountry, treatyInfoByCode, nwfzList } from './utils.js'

const listDataByTime = (aggregatedData) => {
  const events = []
  for (const [country, countryData] of Object.entries(aggregatedData)) {
    for (const [treaty, { signed, joined, withdrew, joiningMechanism }] of Object.entries(countryData)) {
      if (signed) {
        events.push({ date: signed, type: 'signed', country, treaty })
      }
      if (joined) {
        events.push({ date: joined, type: joiningMechanism, country, treaty })
      }
      if (withdrew) {
        events.push({ date: withdrew, type: 'withdrew', country, treaty })
      }
    }
  }
  return events.sort((a, b) => new Date(a.date) - new Date(b.date)).reverse()
}

const addPrepositions = (type) => ({
  withdrew: 'withdrew from',
  acceded: 'acceded to'
})[type] ?? type

const getTypeLogo = (type) => ({
  withdrew: 'cross.svg',
  acceded: 'check.svg',
  ratified: 'check.svg',
  signed: 'quill.svg',
  accepted: 'check.svg',
  succeeded: 'check.svg',
  approved: 'check.svg'
})[type] ?? type

const regularCountryName = (countryCode) => {
  const raw = codeToCountry(countryCode)
  if (raw.includes(', ')) {
    const [a, b] = raw.split(', ')
    return `${b} ${a}`
  } else {
    return raw
  }
}

const htmlTimelineTable = (aggregatedData) => {
  const eventsList = listDataByTime(aggregatedData)
  // console.log('htmlTimelineTable')
  let html = `<h1 id="timeline-heading">Survival Treaty Timeline</h1>
  <table id="timeline-table">`
  for (const event of eventsList) {
    const isNwfz = nwfzList().includes(event.treaty)
    const treatyInfo = treatyInfoByCode()[isNwfz ? 'nwfz' : event.treaty]
    const treatyName = treatyInfoByCode()[event.treaty].name
    //    console.log(event.treaty, treatyName)
    const treatyLogo = treatyInfo ? treatyInfo.logo : undefined
    const imageElement = treatyLogo ? `<img alt='${treatyInfo?.name} logo' src='./images/${treatyLogo}' class='treaty-logo'>` : ''
    html += '<tr>'
    html += `<td class='date'>${event.date}</td>`
    html += `<td class='flag'>${flagEmojiHtml(event.country)}</td>`
    html += `<td class='type'><img src='images/${getTypeLogo(event.type)}'></td>`
    html += `<td class='treaty'>${imageElement}</td>`
    html += `<td>${regularCountryName(event.country)} ${addPrepositions(event.type)} the ${treatyName}.</td>`
    html += '</tr>'
  }
  return html
}

export const renderTimelinePage = async (
  { dataDate, aggregatedData }, generatePreview) => {
  delete aggregatedData.EU
  delete aggregatedData.XX
  const js = `const dataDate = new Date('${dataDate}');\n`
  const css = fs.readFileSync('./main.css').toString() + '\n' + fs.readFileSync('./timeline-table.css').toString()
  await render('timeline.html', '<div class=\'table-container\'>' + htmlTimelineTable(aggregatedData) + '</div>' + '<div>' + htmlFooter(dataDate) + '</div>', dataDate, js, css)
  if (generatePreview) {
    await createPreviewImage('./build/index.html', './build/index-preview.png')
  }
}

const main = async () => {
  const aggregatedData = JSON.parse(fs.readFileSync('aggregated.json').toString())
  const dataDate = '1945-10-24T12:00:00Z'
  await renderTimelinePage({ aggregatedData, dataDate }, false)
}

if (esMain(import.meta)) {
  await main()
}
