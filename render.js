import fs from "fs";
import { inputs, codeToCountry, treatyCodeToName } from "./utils.js";
import _ from "lodash";

const page = ({css, js, content}) => `
<!DOCTYPE html>
<html>
 <head>
  <title>Key Treaties for Human Survival</title>
  <meta charset="utf8"/>
  <meta name="format-detection" content="telephone=no"/>
  <style>${css}</style>
  <script>${js}</script>
 </head>
 <body>
  ${content}
 </body>
</html>
`;

const loadJs = () => fs.readFileSync("./script.js");

const render = (html) => {
  //  consolee.log(aggregated);
  const js = loadJs();
  const css = fs.readFileSync("./main.css").toString();
  const htmlPage = page({css, js, content: html});
  fs.writeFileSync("index.html", htmlPage);
};

const treatyList = [
  "rome", "aggression", "npt", "ctbt", "nwfz", "tpnw", "bwc", "biodiversity", "paris"
];

const findNwfzMembership = (treatyData, nwfzList) => {
  for (const nwfz of nwfzList) {
    if (treatyData[nwfz] && treatyData[nwfz].joined) {
      return treatyData[nwfz].joined;
    }
  }
  return false;
};

const convertCharacter = (char) => {
  const index = char.charCodeAt(0) - 64;
  const newIndex = index + 127461;
  return `&#${newIndex};`;
};

const flagEmojiHtml = (country_code) => {
  if (country_code === "TP") {
    country_code = "TL";
  }
  return country_code.split("").map(convertCharacter).join("");
};

const composeDescription = ({country, treaty, joining_mechanism, joined, signed}) => {
  let description = "";
  const isNwfz = treaty === "nwfz";
  const treatyName = treatyCodeToName(treaty);
  if (!joined) {
    description = `${country} has not yet joined ${isNwfz ? "a" : "the"} ${treatyName}.`;
  } else {
    const treatyOrNwfzName = isNwfz ? "pelindaba" : treatyName;
    description = country;
    let treatyMentioned = false;
    if (signed) {
      description += ` signed the ${treatyOrNwfzName} on ${signed} and`;
      treatyMentioned = true;
    }
    description += " " + ({"ratified": "ratified",
                           "acceded": "acceded to",
                           "accepted": "accepted membership of",
                           "approved": "gave its approval to",
                           "succeeded": "inherited membership of",
                           "joined": "joined"}[joining_mechanism] ?? "joined");
    description += treatyMentioned ? " it" : ` the ${treatyOrNwfzName}`;
    description += ` on ${joined}.`;
  }
  return description;
};

const tabulate = (inputs, aggregatedData, population) => {
  const { other_un_treaties, disarmament_treaties, nwfz_treaties } = inputs;
  //const treatyList = [...other_un_treaties.map(t => t.code),
  //  ...disarmament_treaties.map(t => t.code)];
  const nwfzList = nwfz_treaties.map(t => t.code);
  const headerNames = ["", "Country", "Country Score", "Population", ...treatyList];
  let rows = [];
  const treatyCount = {};
  for (const [country_code, treatyData] of Object.entries(aggregatedData)) {
    const row = [];
    const country = codeToCountry(country_code);
    const flagItem = {value: flagEmojiHtml(country_code), row_header: true };
    const countryItem = { value: country, row_header: true, };
    const populationItem = { value: population[country_code], row_header: true };
    let memberCount = 0;
    for (const treaty of treatyList) {
      let joined;
      if (treaty === "nwfz") {
        joined = findNwfzMembership(treatyData, nwfzList);
      } else {
        joined = treatyData[treaty] && treatyData[treaty].joined;
      }
      if (joined) {
        ++memberCount;
        treatyCount[treaty] = 1 + (treatyCount[treaty] ?? 0);
      }
      const value = joined ? "yes" : "no";
      const { joining_mechanism, signed } = treatyData[treaty] ?? {};
      const description = composeDescription({country, treaty, joined, joining_mechanism, signed});
      row.push({ description, value });
    }
    const countryScoreItem = {
      value: `${memberCount}/${treatyList.length}`,
      row_header: true,
      description: ""
    };
    rows.push([flagItem, countryItem, countryScoreItem, populationItem, ...row]);
  }
  const header = headerNames.map(name => ({ name, count: treatyCount[name]}));
  // Sort by population
  rows = _.sortBy(rows, row => row[3].value).reverse();
  return { rows, header };
};


const htmlHeading = () =>
  `<h1>KeyTreaties.org</h1><h3>Key Treaties for Human Survival</h3>`

const htmlFooter = () => `
  <div class="footer"><b>Data sources</b><br>
    Data presented in this table is updated from live databases maintained by the United Nations:
    <ul>
      <li><a href="https://treaties.unoda.org/">Disarmament Treaties Database</a>, United Nations Office for Disarmament Affairs</li>
      <li>Multilateral Treaties Deposited with the Secretary-General, United Nations, New York, as available on <a href="https://treaties.un.org/Pages/ParticipationStatus.aspx">https://treaties.\
un.org/Pages/ParticipationStatus.aspx</a> on [date on which the material was accessed]</li>
      <li><a href="https://data.un.org/">UNdata</a>, United Nations Statistics Division</li>
    </ul>
  </div>
`;

const htmlTable = ({ header, rows }) => {
  const fragments = [];
  const total = rows.length;
  fragments.push("<table>");
  fragments.push("<thead>");
  fragments.push("<tr class='header'>");
  for (const headerItem of header) {
    fragments.push(`<th>${treatyCodeToName(headerItem.name) ?? headerItem.name}</th>`);
  }
  fragments.push("</tr>");
  fragments.push("<tr class='header'>");
  for (const headerItem of header) {
    const countString = headerItem.count ? `${headerItem.count}/${total}`: "";
    fragments.push(`<th class='treaty-count'>${countString}</th>`)
  }
  fragments.push("</tr>");
  fragments.push("<tr class='header'>");
  for (const headerItem of header) {
    fragments.push(`<th class='sort-arrows'>`);
    if (headerItem.name.length > 0) {
      fragments.push(`<img src="./sortArrowsUnsorted.svg" width="16">`);
    }
    fragments.push(`</th>`);
  }
  fragments.push("</tr>");
  fragments.push("</thead>");
  fragments.push("<tbody>");
  for (const row of rows) {
    fragments.push(`<tr class='data'>`);
    for (const cell of row) {
      if (cell.row_header) {
        fragments.push(`<td title="${cell.description}" class="row_header">${cell.value}</td>`);
      } else {
        fragments.push(`<td title="${cell.description}" class="${cell.value === "yes" ? "good" : "bad"}">&nbsp;</td>`);
      }
    }
    fragments.push("</tr>");
  }
  fragments.push("</tbody>");
  fragments.push("</table>");
  return fragments.join("");
};


const main = () => {
  const aggregated = JSON.parse(fs.readFileSync("aggregated.json").toString());
  const population = JSON.parse(fs.readFileSync("population.json").toString());
  //console.log(population);
  delete aggregated.EU;
  delete aggregated.XX;
  const { rows, header } = tabulate(inputs(), aggregated, population);
  render(htmlHeading() + htmlTable({ rows, header }) + htmlFooter());
};

main();
