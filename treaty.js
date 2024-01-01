import { mapParallelToObject, formatDate, countryToCode } from './utils.js'
import { JSDOM } from 'jsdom'

const extractData = (td) => {
  const pieces = td.textContent.replace(/[[\]]/g, '').trim().split(/\s+/)
  const raw = pieces.slice(0, 3).join(' ')
  const cleanString = raw.replaceAll(/\t|&nbsp;/g, ' ').trim()
  const rawDate = new Date(cleanString)
  const date = formatDate(rawDate)
  const tag = pieces[3]
  return { date, tag }
}

const tagToMechanism = {
  a: 'acceded',
  AA: 'approved',
  d: 'succeeded',
  A: 'accepted'
}

const mechanismFromTag = (tag) => tagToMechanism[tag] ?? 'ratified'

const getUNDataFromRow = (row, columnCount) => {
  const [td0, td1, td2] = row.querySelectorAll('td')
  const footnote = td0.querySelector('sup')
  if (footnote) {
    td0.removeChild(footnote)
  }
  const countryCode = countryToCode(td0.textContent.trim())
  if (columnCount === 3) {
    const { date: joined, tag: tagJoined } = extractData(td2)
    const { date: signed } = extractData(td1)
    const joiningMechanism = mechanismFromTag(tagJoined)
    return [
      countryCode,
      { signed, joined, joiningMechanism }]
  } else if (columnCount === 2) {
    const { date: joined, tag } = extractData(td1)
    const joiningMechanism = mechanismFromTag(tag)
    return [
      countryCode,
      { joined, tag, joiningMechanism }]
  }
}

const domFromUrl = async (url) => {
  const t1 = performance.now()
  console.log('start:', t1, url)
  const response = await fetch(url)
  const t2 = performance.now()
  console.log('delta:', t2 - t1, url)
  const text = await response.text()
  return new JSDOM(text)
}

const tableRowsFromUrl = async (url, selector) => {
  const dom = await domFromUrl(url)
  const table = dom.window.document.querySelector(selector)
  return [...table.querySelectorAll('tr')]
}

const getNoteDataFromRow = (row) => {
  const [t1,, t3] = row.querySelectorAll('td')
  const country = t1?.textContent
  const dateOfEffect = t3?.textContent
  if (dateOfEffect === undefined) {
    return
  }
  if (country.includes(':')) {
    return
  }
  if (dateOfEffect.includes('Withdrawn')) {
    return
  }
  return [countryToCode(country), formatDate(new Date(dateOfEffect))]
}

const unTreatyInfo = async (treaty) => {
  const { chapter, mtdsgNo, columnCount } = treaty
  const url = `https://treaties.un.org/pages/ViewDetails.aspx?src=TREATY&mtdsg_no=${mtdsgNo}&chapter=${chapter}&clang=_en`
  const rows = await tableRowsFromUrl(url, '#ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolderInnerPage_tblgrid')
  const mainData = Object.fromEntries(rows.slice(1).map(row => getUNDataFromRow(row, columnCount)))
  if (treaty.code === 'rome') {
    const rows2 = await tableRowsFromUrl(url, '#ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolderInnerPage_dgNotesAll_ctl03_divNotesAll')
    const withdrawalData = rows2.map(getNoteDataFromRow).filter(x => x)
    for (const [country, withdrawalDate] of withdrawalData) {
      mainData[country].withdrew = withdrawalDate
    }
  }
  return mainData
}

export const other = async (otherUNTreaties) =>
  mapParallelToObject(async treaty => {
    return [treaty.code,
      await unTreatyInfo(treaty)]
  }, otherUNTreaties)
