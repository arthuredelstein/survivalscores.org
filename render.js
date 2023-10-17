import fs from "fs";
import { inputs, codeToCountry, treatyInfoByCode } from "./utils.js";
import _ from "lodash";
import esMain from 'es-main';
import captureWebsite from 'capture-website';

const page = ({css, js, content }) => `
<!DOCTYPE html>
<html>
 <head>
  <title>SurvivalScores.org: Monitoring treaties critical to the survival of humanity</title>
  <meta charset="utf8"/>
  <meta name="format-detection" content="telephone=no" />
  <meta name="viewport" content="width=device-width, initial-scale=0.7" />
  <link rel="icon" type="image/x-icon" href="./images/survivalscores_logo_dark.svg">
  <style>${css}</style>
  <script>${js}</script>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta property="og:image" content="https://survivalscores.org/index-preview.png"/>
  <meta property="og:title" content="Is humanity doing its best?"/>
  <meta property="og:description" content="Monitoring treaties critical to human survival."/>
  <meta property="og:type" content="website"/>
 </head>
 <body>
  ${content}
 </body>
</html>
`;

const createPreviewImage = async (htmlFile, pngFile) => {
  await captureWebsite.file(htmlFile, pngFile, {
    width: 1280,
    height: 669,
    scaleFactor: 0.625,
    overwrite: true
  });
  console.log('wrote', pngFile);
};

const loadJs = () => fs.readFileSync("./script.js");

const render = (filename, html, dataDate) => {
  //  consolee.log(aggregated);
  const js = `const dataDate = new Date('${dataDate}');\n` + loadJs();
  const css = fs.readFileSync("./main.css").toString();
  const htmlPage = page({css, js, content: html});
  const path = `./build/${filename}`;
  fs.writeFileSync(path, htmlPage);
  console.log(`wrote ${path}`);
};

const treatyList = [
  "rome", "aggression", "npt", "ctbt", "nwfz", "tpnw", "bwc", "biodiversity", "paris"
];

const findNwfzMembership = (treatyData, nwfzList) => {
  for (const nwfz of nwfzList) {
    if (treatyData[nwfz] && treatyData[nwfz].joined) {
      return { joined: treatyData[nwfz].joined, nwfz } ;
    }
  }
  return { joined: false };
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

const composeDescription = ({country, treaty, nwfz, joining_mechanism, joined, signed}) => {
  let description = "";
  const isNwfz = treaty === "nwfz";
  const { name: treatyName } = treatyInfoByCode()[isNwfz ? (nwfz ?? "nwfz"): treaty];
  if (!joined) {
    description = `${country} has not yet joined ${isNwfz ? "a" : "the"} ${treatyName}.`;
  } else {
    const treatyOrNwfzName = treatyName;
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
  const headerNames = ["", "Country", "Score", "Population", ...treatyList];
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
      let joined, nwfz;
      if (treaty === "nwfz") {
        let found = findNwfzMembership(treatyData, nwfzList);
        joined = found.joined;
        nwfz = found.nwfz;
      } else {
        joined = treatyData[treaty] && treatyData[treaty].joined;
      }
      if (joined) {
        ++memberCount;
        treatyCount[treaty] = 1 + (treatyCount[treaty] ?? 0);
      }
      const value = joined ? "yes" : "no";
      const { joining_mechanism, signed } = treatyData[treaty] ?? {};
      const description = composeDescription({country, treaty, nwfz, joined, joining_mechanism, signed});
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
  `<div class='title'><h1><img id='logo' src='./images/survivalscores_logo.svg'>SurvivalScores.org</h1>
    <h3>Monitoring treaties critical to the survival of humanity</h3>
    <div id='updated'></div>
    <div class='links'>
    <a href="./about">About</a> &#x2022;
    <a href="https://twitter.com/survivalscores">Twitter</a> &#x2022;
    <a rel="me" href="https://mastodon.social/@survivalscores">Mastodon</a>
  </div>
  </div>
`;

const htmlFooter = (dataDate) => `
  <div class="footer"><b>Data sources</b><br>
    Data presented in this table was retrieved from live databases maintained by the United Nations:
    <ul>
      <li><a href="https://treaties.unoda.org/">Disarmament Treaties Database</a>, United Nations Office for Disarmament Affairs</li>
      <li><a href="https://treaties.un.org/Pages/ParticipationStatus.aspx">Multilateral Treaties Deposited with the Secretary-General</a>, United Nations, New York</li>
      <li><a href="https://data.un.org/">UNdata</a>, United Nations Statistics Division</li>
    </ul>
    Data retrieved at ${(new Date(dataDate)).toISOString()}
  </div>
`;

const htmlTable = ({ header, rows }) => {
  const fragments = [];
  const total = rows.length;
  fragments.push("<table>");
  fragments.push("<thead>");
  fragments.push("<tr class='header'>");
  for (const headerItem of header) {
    const treatyInfo = treatyInfoByCode()[headerItem.name];
    const logo = treatyInfo ? treatyInfo.logo : undefined;
    const imageElement = logo ? `<img src='./images/${logo}' height=48>` : '';
    const className = imageElement.length > 0 ? 'treaty-header' : 'data-header'
    fragments.push(`<th class='${className}'>${imageElement}<br>${treatyInfo?.name ?? headerItem.name}</th>`);
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
      fragments.push(`<img src="./images/sortArrowsUnsorted.svg" width="16">`);
    }
    fragments.push(`</th>`);
  }
  fragments.push("</tr>");
  fragments.push("</thead>");
  fragments.push("<tbody>");
  for (const row of rows) {
    fragments.push(`<tr class='data'>`);
    for (const cell of row) {
      const tooltip = cell.description ? `title="${cell.description}"` : "";
      if (cell.row_header) {
        fragments.push(`<td ${tooltip} class="row_header">${cell.value}</td>`);
      } else {
        fragments.push(`<td ${tooltip} class="${cell.value === "yes" ? "good" : "bad"}">&nbsp;</td>`);
      }
    }
    fragments.push("</tr>");
  }
  fragments.push("</tbody>");
  fragments.push("</table>");
  return fragments.join("");
};


export const renderSite = async ({dataDate, aggregatedData, populationData}) => {
  delete aggregatedData.EU;
  delete aggregatedData.XX;
  const { rows, header } = tabulate(inputs(), aggregatedData, populationData);
  render("index.html", htmlHeading() + "<div class='table-container'>" + htmlTable({ rows, header }) + htmlFooter(dataDate) + "</div>", dataDate);
  await createPreviewImage("./build/index.html", "./build/index-preview.png");
};

const main = async () => {
  const aggregatedData = JSON.parse(fs.readFileSync("aggregated.json").toString());
  const populationData = JSON.parse(fs.readFileSync("population.json").toString());
  const dataDate = '2010-01-01T00:00:00Z';
  await renderSite({ aggregatedData, populationData, dataDate });
};

if (esMain(import.meta)) {
  await main();
}
