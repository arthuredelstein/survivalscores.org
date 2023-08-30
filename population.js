import unzipper from "unzipper";
import { parse } from "csv-parse/sync";
import { countryToCode } from "./utils";

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
  const country_code = countryToCode(countryName);
  return { country_code, population };
};

const getPopulationZip = async () => {
  const populationUrl = `http://data.un.org/Handlers/DownloadHandler.ashx?DataFilter=variableID:12;varID:2&DataMartId=PopDiv&Format=csv&c=2,4,7&s=_crEngNameOrderBy:asc,_timeEngNameOrderBy:desc,_varEngNameOrderBy:asc`;
  return await readRemoteZippedCSV(populationUrl);
};

export const populationInfo = async () => {
  const itemsRaw = await getPopulationZip();
  const thisYear = new Date().getFullYear().toString();
  const items = itemsRaw.filter(i => i["Year(s)"] === thisYear);
  const result = {};
  for (const item of items) {
    try {
      const { country_code, population } = getPopulationDataFromItem(item);
      result[country_code] = population;
    } catch (e) {
      console.log(e.message);
    }
  }
  return result;
};
