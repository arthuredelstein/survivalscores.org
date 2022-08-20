import fetch from "node-fetch";
import { JSDOM } from "jsdom";
import YAML from "yaml";
import fs from "fs";

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
  const country = td0.getAttribute("data-order");
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
  return { country, signed, joined, joining_mechanism };
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
  const country = td0.textContent.trim();
  if (td1.textContent.startsWith("[")) {
    return {
      country,
      withdrew: true
    };
  }
  if (columnCount === 3) {
    const joined = extractDate(td2);
    return {
      country,
      signed: extractDate(td1),
      joined
    };
  } else if (columnCount === 2) {
    return {
      country,
      joined: extractDate(td1)
    };
  }
};

const domFromUrl = async (url) => {
  const response = await fetch(url);
  const text = await response.text();
  return new JSDOM(text);
};

const disarmamentTreatyInfo = async (treaty, tableSelector) => {
  const dom = await domFromUrl(`https://treaties.unoda.org/t/${treaty}`);
  const rows = dom.window.document
    .querySelector(tableSelector)
    .querySelectorAll("tr");
  return [...rows].slice(1).map(getDisarmamentDataFromRow);
};

const unTreatyInfo = async (url, columnCount) => {
  const dom = await domFromUrl(url);
  const rows = dom.window.document.querySelector("#ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolderInnerPage_tblgrid").querySelectorAll("tr");
  return [...rows].slice(1).map(row => getUNDataFromRow(row, columnCount));
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
    for (const { country, signed, joined, joining_mechanism, withdrew } of data) {
      if (results[country] === undefined) {
        results[country] = {};
      }
      results[country][treaty] = { signed, joined, joining_mechanism, withdrew };
    }
  }
  return results;
};

const tabulate = (inputs, aggregatedData) => {
  const { other_un_treaties, disarmament_treaties, nwfz_treaties } = inputs;
  const treatyList = [...other_un_treaties.map(t => t.code),
    ...disarmament_treaties.map(t => t.code)];
  const nwfzList = nwfz_treaties.map(t => t.code);
  const header = ["country", ...treatyList, "nwfz"];
  let rows = header.join("\t") + "\n";
  for (const [country, treatyData] of Object.entries(aggregatedData)) {
    console.log(country, treatyData);
    const row = [];
    row.push(country);
    for (const treaty of treatyList) {
      row.push((treatyData[treaty] && treatyData[treaty].joined) ? "yes" : "no");
    }
    let nwfzMember = false;
    for (const nwfz of nwfzList) {
      if (treatyData[nwfz] && treatyData[nwfz].joined) {
        nwfzMember = true;
      }
    }
    row.push(nwfzMember ? "yes" : "no");
    const rowText = row.join("\t");
    console.log(rowText);
    rows += rowText + "\n";
  }
  return rows;
};

const writeData = (filename, data) => {
  fs.writeFileSync(filename, JSON.stringify(data), "utf-8");
  console.log(`data written to '${filename}'.`);
};

const main = async () => {
  const inputs = YAML.parse(fs.readFileSync("inputs.yaml").toString());
  const rawData = await getAllData(inputs);
  console.log(Object.keys(rawData));
  writeData("raw.json", rawData);
  const aggregatedData = aggregate(rawData);
  writeData("aggregated.json", aggregatedData);
  const tabulatedText = tabulate(inputs, aggregatedData);
  fs.writeFileSync("data.txt", tabulatedText, "utf-8");
};

const test = async () => {
  return disarmament([{ code: "npt", tableSelector: "#sort_table_special" }]);

//  return other([ { code: 'rome', mtdsg_no: 'XVIII-10', chapter: 18, columnCount: 2
  //               }])
};

const runTest = async () => {
  console.log(await test());
};

main();
// runTest();
