import { mapParallelToObject, formatDate } from "./utils.js";
import { JSDOM } from "jsdom";
import { countryToCode } from './utils.js'

const extractData = (td) => {
  const pieces = td.textContent.trim().split(/\s+/);
  const raw = pieces.slice(0, 3).join(" ");
  const cleanString = raw.replaceAll(/\t|\&nbsp;/g, " ").trim();
  const rawDate = new Date(cleanString);
  const date = formatDate(rawDate);
  const tag = pieces[3];
  return { date, tag };
};

const tagToMechanism = {
  "a": "acceded",
  "AA": "approved",
  "d": "succeeded",
  "A": "accepted",
};

const mechanismFromTag = (tag) => tagToMechanism[tag] ?? "ratified";

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
    const { date: joined, tag: tagJoined } = extractData(td2);
    const { date: signed } = extractData(td1);
    const joining_mechanism = mechanismFromTag(tagJoined);
    return [
      country_code,
      {signed, joined, joining_mechanism}];
  } else if (columnCount === 2) {
    const { date: joined, tag } = extractData(td1);
    const joining_mechanism = mechanismFromTag(tag);
    return [
      country_code,
      { joined, tag, joining_mechanism }];
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

const unTreatyInfo = async (treaty) => {
  const { code, chapter, mtdsg_no, columnCount } = treaty;
  const url = `https://treaties.un.org/pages/ViewDetails.aspx?src=TREATY&mtdsg_no=${mtdsg_no}&chapter=${chapter}&clang=_en`;
  const rows = await tableRowsFromUrl(url, "#ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolderInnerPage_tblgrid");
  return Object.fromEntries(rows.slice(1).map(row => getUNDataFromRow(row, columnCount)));
};

export const other = async (other_un_treaties) =>
      mapParallelToObject(async treaty => {
        return [treaty.code,
                await unTreatyInfo(treaty)];
      }, other_un_treaties);