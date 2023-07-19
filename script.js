
// Initially will be sorted by population
let state = { sortedColumn: 1, ascending: false };

const rowComparator = (row1, row2, columnIndex, reverse = false) => {
  const reverseFactor = reverse ? -1 : 1;
  const td1 = [...row1.querySelectorAll("td")][columnIndex];
  const td2 = [...row2.querySelectorAll("td")][columnIndex];
  const text1 = td1.innerText.trim();
  const text2 = td2.innerText.trim();
  if (text1.length > 0 && !isNaN(text1)) {
    return reverseFactor * (parseInt(text1) - parseInt(text2));
  }
  const class1 = td1.className;
  const class2 = td2.className;
  if (class1 && (class1.includes("good") || class1.includes("bad"))) {
    return reverseFactor * class1.localeCompare(class2);
  }
  return reverseFactor * text1.localeCompare(text2);
};

const sortValue = (row, columnIndex) => {
  const td = [...row.querySelectorAll("td")][columnIndex];
  return td.innerText;
};

const sortColumn = (columnIndex) => {
  if (state.sortedColumn === columnIndex) {
    state.ascending = !state.ascending;
  } else {
    state.ascending = true;
  }
  state.sortedColumn = columnIndex;
  const rows = [...document.querySelectorAll("table tr.data")];
  const table = document.querySelector("table");
  let rows2 = rows.sort((rowA, rowB) => rowComparator(rowA, rowB, columnIndex, state.ascending));
  for (const row of rows2) {
    table.appendChild(row);
  }
}

window.addEventListener("DOMContentLoaded", (e) => {
  const headers = [...document.querySelectorAll("thead tr th")];
  for (let i = 0; i < headers.length; ++i) {
    headers[i].addEventListener("click", (e) => {
      sortColumn(i);
    });
  }
});
