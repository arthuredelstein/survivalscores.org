import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import YAML from "yaml";
import fs from "fs";
import { readYAML, countryToCode } from './utils.js';

const formatDate = (raw) => {
  const rawDate = new Date(raw.trim().replace("\t", " "));
  const year = rawDate.getFullYear().toString();
  const month = (rawDate.getMonth() + 1).toString().padStart(2, "0");
  const day = rawDate.getDate().toString().padStart(2, "0");
  if (year === "NaN") {
    return undefined;
  } else {
    return `${year}-${month}-${day}`;
  }
};

const getDisarmamentDateFromDataOrder = (td) =>
  td.getAttribute("data-order").split("-")[0];

const joining_mechanisms = {
  RAT: "ratified",
  ACC: "acceded",
  SUC: "succeeded"
};

const getDisarmamentDataFromRow = (row) => {
  const [td0, td1, td2] = row.querySelectorAll("td");
  const country_code = countryToCode(td0.getAttribute("data-order"));
  const signed = formatDate(getDisarmamentDateFromDataOrder(td1));
  const td2_date = formatDate(getDisarmamentDateFromDataOrder(td2));
  const link = td2.querySelector("a");
  let joined, joining_mechanism;
  if (link) {
    const href = td2.querySelector("a").getAttribute("href");
    for (const [code, type] of Object.entries(joining_mechanisms)) {
      if (href.includes(code)) {
        joined = td2_date;
        joining_mechanism = type;
      }
    }
  }
  return { country_code, signed, joined, joining_mechanism };
};

const getPopulationDataFromRow = (row) => {
  const [td0, td1, td2] = row.querySelectorAll("td");
  const link = td1.querySelector("a");
  const country_code = countryToCode(link.textContent.trim());
  const population = parseInt(td2.textContent.replaceAll(",",""));
  return { country_code, population };
};

const extractDate = td => formatDate(
  td.textContent.split(/\s+/).slice(0, 3).join(" "));

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
    return {
      country_code,
      joined: extractDate(td1)
    };
  }
};

const domFromUrl = async (url) => {
  const response = await fetch(url);
  const text = await response.text();
  return new JSDOM(text);
};

const tableRowsFromUrl = async (url, selector) => {
  const dom = await domFromUrl(url);
  const table = dom.window.document.querySelector(selector);
  return [...table.querySelectorAll("tr")];
};

const disarmamentTreatyInfo = async (treaty, tableSelector) => {
  const rows = await tableRowsFromUrl(`https://treaties.unoda.org/t/${treaty}`, tableSelector);
  return rows.slice(1).map(getDisarmamentDataFromRow);
};

const unTreatyInfo = async (url, columnCount) => {
  const rows = await tableRowsFromUrl(url, "#ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolderInnerPage_tblgrid");
  return rows.slice(1).map(row => getUNDataFromRow(row, columnCount));
};

const disarmament = async (treaties) => {
  const results = {};
  for (const treaty of treaties) {
    const { code, tableSelector } = treaty;
    const statuses = await disarmamentTreatyInfo(code, tableSelector);
    results[code] = statuses;
  }
  return results;
};

const other = async (other_un_treaties) => {
  const results = {};
  for (const treaty of other_un_treaties) {
    const { code, chapter, mtdsg_no, columnCount } = treaty;
    const url = `https://treaties.un.org/pages/ViewDetails.aspx?src=TREATY&mtdsg_no=${mtdsg_no}&chapter=${chapter}&clang=_en`;
    const statuses = await unTreatyInfo(url, columnCount);
    results[code] = statuses;
  }
  return results;
};

const populationInfo = async () => {
  const rows = await tableRowsFromUrl("https://www.worldometers.info/world-population/population-by-country/", "#example2");
  let result = {};
  for (let row of rows.slice(1)) {
    const { country_code, population } = getPopulationDataFromRow(row);
    result[country_code] = population;
  }
  return result;
}

const getAllData = async (inputs) => {
  const { other_un_treaties, disarmament_treaties, nwfz_treaties } = inputs;
  const otherData = await other(other_un_treaties);
  const disarmamentData = await disarmament(disarmament_treaties);
  const nwfzData = await disarmament(nwfz_treaties);
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


const writeData = (filename, data) => {
  fs.writeFileSync(filename, JSON.stringify(data), "utf-8");
  console.log(`data written to '${filename}'.`);
};

const main = async () => {
  const inputs = readYAML("inputs.yaml");
  const rawTreatyData = await getAllData(inputs);
  const populationData = await populationInfo();
  console.log(Object.keys(rawTreatyData));
  writeData("raw.json", rawTreatyData);
  writeData("population.json", populationData);
  const aggregatedData = aggregate(rawTreatyData);
  writeData("aggregated.json", aggregatedData);
};

const test = async () => {
//  return disarmament([{ code: "npt", tableSelector: "#sort_table_special" }]);

//  return other([ { code: 'rome', mtdsg_no: 'XVIII-10', chapter: 18, columnCount: 2
  //               }])


};

const runTest = async () => {
  console.log(await test());
};

main();
// runTest();
