import YAML from "yaml";
import fs from "fs";
import _ from "lodash";

// Read data from a YAML file.
export const readYAML = f => YAML.parse(fs.readFileSync(f).toString());

// Write JSON data to a file.
export const writeJsonData = (filename, jsonData) => {
  fs.writeFileSync(filename, JSON.stringify(jsonData), "utf-8");
  console.log(`data written to '${filename}'.`);
};

export const formatDate = (rawDate) => {
  const year = rawDate.getFullYear().toString();
  const month = (rawDate.getMonth() + 1).toString().padStart(2, "0");
  const day = rawDate.getDate().toString().padStart(2, "0");
  if (year === "NaN") {
    return undefined;
  } else {
    return `${year}-${month}-${day}`;
  }
};

const countryData = _.memoize(() => {
  const codeToCountry = readYAML("countries.yaml");
  const countryToCodeInitial = invertMap(codeToCountry);
  const countryAliases = readYAML("country_aliases.yaml");
  return {
    codeToCountry,
    countryToCode: { ...countryToCodeInitial, ...countryAliases }
  };
});

export const countryToCode = (country) => {
  const { countryToCode } = countryData();
  if (!countryToCode[country]) {
    throw new Error(`country code for '${country}' not found.`);
  }
  return countryToCode[country];
};

export const codeToCountry = (code) => {
  const { codeToCountry } = countryData();
  if (!codeToCountry[code]) {
    throw new Error(`country name for code '${code}' not found.`);
  }
  return codeToCountry[code];
};

export const inputs = _.memoize(() => readYAML("inputs.yaml"));

export const treatyInfoByCode = _.memoize(() => {
  const results = {};
  const { disarmament_treaties, other_un_treaties } = inputs(); 
  const list = [...disarmament_treaties, ...other_un_treaties,
                { code: "nwfz", name: "Nuclear-Weapon-Free Zone", logo: "nwfz.jpeg" }];
  for (const item of list) {
    results[item.code] = item;
  }
  return results;
});

export const invertMap = (m) => {
  const result = {};
  for (const [k, v] of Object.entries(m)) {
    if (result[v]) {
      throw new Error("Map not invertable");
    }
    result[v] = k;
  }
  return result;
};

export const mapParallel = (asyncFunc, items) =>
      Promise.all(items.map(item => asyncFunc(item)));

export const mapParallelToObject = async (asyncFunc, items) =>
  Object.fromEntries(await mapParallel(asyncFunc, items));
