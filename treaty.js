import { mapParallelToObject, formatDate } from "./utils.js";
import { JSDOM } from "jsdom";
import { countryToCode } from './utils.js'

const extractDate = (td) => {
  const raw = td.textContent.trim().split(/\s+/).slice(0, 3).join(" ");
  const cleanString = raw.replaceAll(/\t|\&nbsp;/g, " ").trim();
  const rawDate = new Date(cleanString);
  return formatDate(rawDate);
};

const getUNDataFromRow = (row, columnCount) => {
  const [td0, td1, td2] = row.querySelectorAll("td");
  const footnote = td0.querySelector("sup");
  if (footnote) {
    td0.removeChild(footnote);
  }
  const country_code = countryToCode(td0.textContent.trim());
  if (td1.textContent.startsWith("[")) {
    return [
      country_code,
      {withdrew: true}
    ];
  }
  if (columnCount === 3) {
    const joined = extractDate(td2);
    return [
      country_code,
      {signed: extractDate(td1),
      joined}
      ];
  } else if (columnCount === 2) {
    return [
      country_code,
      {joined: extractDate(td1)}
    ];
  }
};

const domFromUrl = async (url) => {
  const t1 = performance.now();
  console.log("start:", t1, url);
  const response = await fetch(url);
  const t2 = performance.now();
  console.log("delta:", t2-t1, url);
  const text = await response.text();
  return new JSDOM(text);
};

const tableRowsFromUrl = async (url, selector) => {
  const dom = await domFromUrl(url);
  const table = dom.window.document.querySelector(selector);
  return [...table.querySelectorAll("tr")];
};

const unTreatyInfo = async (url, columnCount) => {
  const rows = await tableRowsFromUrl(url, "#ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolderInnerPage_tblgrid");
  return Object.fromEntries(rows.slice(1).map(row => getUNDataFromRow(row, columnCount)));
};

export const other = async (other_un_treaties) =>
      mapParallelToObject(async treaty => {
        const { code, chapter, mtdsg_no, columnCount } = treaty;
        const url = `https://treaties.un.org/pages/ViewDetails.aspx?src=TREATY&mtdsg_no=${mtdsg_no}&chapter=${chapter}&clang=_en`;
        return [code,
                await unTreatyInfo(url, columnCount)];
      }, other_un_treaties);