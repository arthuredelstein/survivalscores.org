import { JSDOM } from "jsdom";
import unzipper from "unzipper";
import { parse } from "csv-parse/sync";
import { readYAML, countryToCode, writeJsonData } from "./utils.js";
import esMain from 'es-main';

const mapParallel = (asyncFunc, items) =>
      Promise.all(items.map(item => asyncFunc(item)));

const mapParallelToObject = async (asyncFunc, items) =>
  Object.fromEntries(await mapParallel(asyncFunc, items));

const readRemoteZippedCSV = async (url) => {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const directory = await unzipper.Open.buffer(Buffer.from(buffer));
  const mainFile = await directory.files[0].buffer();
  return parse(mainFile,
               { columns: true, skipEmptyLines: true, encoding: "utf8" });
};

const fixBrokenUtf8 = (s) => Buffer.from(s, "ascii").toString("utf8");

const getPopulationDataFromItem = (item) => {
  const countryName = fixBrokenUtf8(item["Country or Area"]);
  const population = Math.round(parseFloat(fixBrokenUtf8(item.Value)) * 1000);
  let country_code;
  try {
    country_code = countryToCode(countryName);
  } catch (e) {
    country_code = countryName;
    //console.log(`no country code found for ${countryName}`);
  }
  return { country_code, population };
};

const getPopulationZip = async () => {
  const populationUrl = `http://data.un.org/Handlers/DownloadHandler.ashx?DataFilter=variableID:12;varID:2&DataMartId=PopDiv&Format=csv&c=2,4,7&s=_crEngNameOrderBy:asc,_timeEngNameOrderBy:desc,_varEngNameOrderBy:asc`;
  return await readRemoteZippedCSV(populationUrl);
};

const populationInfo = async () => {
  const itemsRaw = await getPopulationZip();
  const thisYear = new Date().getFullYear().toString();
  const items = itemsRaw.filter(i => i["Year(s)"] === thisYear);
  const result = {};
  for (const item of items) {
    const { country_code, population } = getPopulationDataFromItem(item);
    result[country_code] = population;
  }
  return result;
};

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

const disarmamentGraphQLQuery = {
  operationName: 'Treaty',
  variables: { input: { id: null, short_name: 'tpnw', type: 'GET_TREATY' } },
  query: `query Treaty($input: TreatyRequestInput_) {
    treaty_(input: $input) {
      ... on ReadResponse {
        data {
          ... on Treaty_ {
            id
            description
            full_name
            is_protocol
            name
            protocol_parent_id
            protocols_ {
              id
              name
              short_name
              count_states_parties
              adopted_date
              open_for_signature_date
              __typename
            }
            short_name
            treaty_text
            note
            is_amendment
            signature_location
            show_deposit_location
            show_signature_location
            show_signature_for_protocol
            adopted_date
            adopted_location
            open_for_signature_date
            entry_into_force_date
            entry_into_force_note
            search_keywords
            certified_copy_url
            count_sig_states
            count_states_parties
            depositaries_ {
              id
              short_name
              name
              url_name
              __typename
            }
            actions_ {
              id
              date
              note
              type
              action_type_
              state {
                name
                country_id
                country_ {
                  country_persistent_name
                  country_country_name {
                    countryname_official_short_name
                    countryname_official_long_name
                    countryname_country_code_2
                    __typename
                  }
                  country_country_groups {
                    countrygroup_group_name
                    countrygroup_group_type
                    __typename
                  }
                  __typename
                }
                __typename
              }
              depositary {
                id
                short_name
                name
                url_name
                __typename
              }
              objections_ {
                date
                note
                state {
                  country_ {
                    country_persistent_name
                    country_country_name {
                      countryname_country_code_3
                      countryname_official_short_name
                      __typename
                    }
                    __typename
                  }
                  __typename
                }
                __typename
              }
              __typename
            }
            __typename
          }
          __typename
        }
        __typename
      }
      __typename
    }
  }`
};

const getDisarmamentTreatyData = async (treaty) => {
  const response = await fetch("https://gql-api-dataportal.unoda.org/", {
    "headers": {
      "content-type": "application/json",
    },
    "body": JSON.stringify(disarmamentGraphQLQuery),
    "method": "POST",
  });
  const json = await response.json();
  return json.data.treaty_.data;
}

const disarmamentTreatyInfo = async (treaty, tableSelector) => {
  const dom = await domFromUrl(`https://treaties.unoda.org/t/${treaty}/participants`);
  const table = dom.window.document.querySelectorAll("mat-table");
  return table;
  //return table.querySelectorAll("mat-row")
//  return rows.slice(1).map(getDisarmamentDataFromRow);
};

const unTreatyInfo = async (url, columnCount) => {
  const rows = await tableRowsFromUrl(url, "#ctl00_ctl00_ContentPlaceHolder1_ContentPlaceHolderInnerPage_tblgrid");
  return rows.slice(1).map(row => getUNDataFromRow(row, columnCount));
};

const disarmament = async (treaties) =>
      mapParallelToObject(async treaty => [
        treaty.code,
        await disarmamentTreatyInfo(treaty.code, treaty.tableSelector)],
                                          treaties);

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
  //console.log(disarmamentData);
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

