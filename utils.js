import YAML from "yaml";
import fs from "fs";
import _ from 'lodash';

export const readYAML = f => YAML.parse(fs.readFileSync(f).toString());

const countryData = _.memoize(() => {
  const codeToCountry = readYAML("countries.yaml");
  const countryToCodeInitial = invertMap(codeToCountry);
  const countryAliases = readYAML("country_aliases.yaml");
  return {codeToCountry,
          countryToCode: {...countryToCodeInitial, ...countryAliases}};
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

export const treatyCodeToName = _.memoize((code) => {
  let result = {};
  const {disarmament_treaties, other_un_treaties} = inputs();
  const list = [...disarmament_treaties, ...other_un_treaties, {code: "nwfz", name: "Nuclear-Weapon-Free Zone"}];
  for (const item of list) {
    result[item.code] = item.name;
  }
  return result[code];
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
