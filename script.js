import { polyfillCountryFlagEmojis } from './country-flag-emoji-polyfill/country-flag-emoji-polyfill.js'

// Initially will be sorted by population
const state = { sortedColumn: 1, ascending: true }

const rowComparator = (row1, row2, columnIndex, reverse = false) => {
  const reverseFactor = reverse ? -1 : 1
  const td1 = [...row1.querySelectorAll('td')][columnIndex]
  const td2 = [...row2.querySelectorAll('td')][columnIndex]
  const value1 = td1.getAttribute('data-value')
  const value2 = td2.getAttribute('data-value')
  if (!isNaN(value1) && !isNaN(value2)) {
    return reverseFactor * (value1 - value2)
  }
  const text1 = td1.innerText.trim()
  const text2 = td2.innerText.trim()
  return -reverseFactor * text1.localeCompare(text2)
}

const sortColumn = (columnIndex, ascending) => {
  state.ascending = ascending
  state.sortedColumn = columnIndex
  const rows = [...document.querySelectorAll('table tr.data')]
  const table = document.querySelector('table')
  const rows2 = rows.sort((rowA, rowB) => rowComparator(rowA, rowB, columnIndex, state.ascending))
  for (const row of rows2) {
    table.appendChild(row)
  }
  const arrowImages = [...document.querySelectorAll('thead tr th.sort-arrows img')]
  arrowImages.forEach(img => { img.src = './images/sortArrowsUnsorted.svg' })
  const arrowImage = arrowImages[columnIndex - 1]
  arrowImage.src = !state.ascending ? './images/sortArrowsDown.svg' : './images/sortArrowsUp.svg'
}

const toggleSortedColumn = (columnIndex) => {
  let ascending
  if (state.sortedColumn === columnIndex) {
    ascending = !state.ascending
  } else {
    ascending = true
  }
  sortColumn(columnIndex, ascending)
}

window.addEventListener('DOMContentLoaded', (e) => {
  console.log('DOMContentLoaded')
  polyfillCountryFlagEmojis()
  const headers = [...document.querySelectorAll('thead tr th.sort-arrows')]
  const updatedElement = document.getElementById('updated')
  updatedElement.innerText = 'Data from ' + dataDate.toLocaleDateString() // eslint-disable-line no-undef
  for (let i = 0; i < headers.length; ++i) {
    headers[i].addEventListener('click', (e) => {
      toggleSortedColumn(i)
    })
  }
  sortColumn(2, false)
})
