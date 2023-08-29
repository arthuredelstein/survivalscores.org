import { JSDOM } from "jsdom";
import { readYAML, countryToCode, writeJsonData } from "./utils.js";
import esMain from 'es-main';
import { disarmament } from "./disarmament.js";
import { populationInfo } from "./population.js";

const formatDate = (raw) => {
  const cleanString = raw.replaceAll(/\t|\&nbsp;/g, " ").trim();
  console.log({raw, cleanString});
  const rawDate = new Date(cleanString);
  const year = rawDate.getFullYear().toString();
  const month = (rawDate.getMonth() + 1).toString().padStart(2, "0");
  const day = rawDate.getDate().toString().padStart(2, "0");
  if (year === "NaN") {
    return undefined;
  } else {
    return `${year}-${month}-${day}`;
  }
};

const extractDate = td => formatDate(
  td.textContent.trim().split(/\s+/).slice(0, 3).join(" "));

const getUNDataFromRow = (row, columnCount) => {
  const [td0, td1, td2] = row.querySelectorAll("td");
  //  console.log([td0, td1, td2].map(t => t.textContent));
  const footnote = td0.querySelector("sup");
  if (footnote) {
    td0.removeChild(footnote);
  }
  const country_code = countryToCode(td0.textContent.trim());
  if (td1.textContent.startsWith("[")) {
    return {
      country_code,
      withdrew: true
    };
  }
  if (columnCount === 3) {
    const joined = extractDate(td2);
    return {
      country_code,
      signed: extractDate(td1),
      joined
    };
  } else if (columnCount === 2) {
    console.log(td1.textContent);
    return {
      country_code,
      joined: extractDate(td1)
    };
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
  return rows.slice(1).map(row => getUNDataFromRow(row, columnCount));
};

const other = async (other_un_treaties) =>
      mapParallelToObject(async treaty => {
        const { code, chapter, mtdsg_no, columnCount } = treaty;
        const url = `https://treaties.un.org/pages/ViewDetails.aspx?src=TREATY&mtdsg_no=${mtdsg_no}&chapter=${chapter}&clang=_en`;
        return [treaty.code,
                await unTreatyInfo(url, columnCount)];
      }, other_un_treaties);

const getAllData = async (inputs) => {
  const { other_un_treaties, disarmament_treaties, nwfz_treaties } = inputs;
  const [otherData, disarmamentData, nwfzData] = await Promise.all([
    other(other_un_treaties),
    disarmament(disarmament_treaties),
    disarmament(nwfz_treaties),
  ]);
  return Object.assign({}, otherData, disarmamentData, nwfzData);
};

const aggregate = (rawData) => {
  const results = {};
  for (const [treaty, data] of Object.entries(rawData)) {
    for (const { country_code, signed, joined, joining_mechanism, withdrew } of data) {
      if (results[country_code] === undefined) {
        results[country_code] = {};
      }
      results[country_code][treaty] = { signed, joined, joining_mechanism, withdrew };
    }
  }
  return results;
};

const collectAllData = async () => {
  const inputs = readYAML("inputs.yaml");
  const [rawTreatyData, populationData] = await Promise.all([
    getAllData(inputs),
    populationInfo(),
  ]);
  return {rawTreatyData, populationData, aggregatedData: aggregate(rawTreatyData)};
};

const main = async () => {
  const {rawTreatyData, populationData, aggregatedData} = await collectAllData();
  console.log(Object.keys(rawTreatyData));
  writeJsonData("raw.json", rawTreatyData);
  writeJsonData("population.json", populationData);

  writeJsonData("aggregated.json", aggregatedData);
};

if (esMain(import.meta)) {
  main();
}

