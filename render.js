import fs from "fs";
import { inputs, codeToCountry, treatyCodeToName } from "./utils.js";
import _ from "lodash";

const css = `
  table {
    position: relative;
    border-collapse: collapse;
    margin: 10px;
  }
  td {
    text-align: center;
    margin: 0px;
    border: 0px;
    padding: 5px;
    height: 30px;
  }
  td:nth-child(2) {
    text-align: left;
    padding-left: 20px;
  }
  td:nth-child(3) {
    text-align: right;
  }
  table tr:first {
    display: flex;
    flex-direction: row;
  }
  th {
    text-align: center;
    margin: 0px;
    border: 0px;
    padding: 5px;
    padding: 5px 10px;
    hyphens: auto;
    flex-direction: column;
  }
  td, th {
    cursor: pointer;
    width: 8.5%;
  }
  td:first-child,th:first-child {
    width: 5px;
  }
  td:nth-child(2),th:nth-child(2) {
    width: 10%;
  }
  td:nth-child(3),th:nth-child(3) {
    width: 10px;
    text-align: center;
  }
  td:nth-child(4),th:nth-child(4) {
    width: 10%;
    padding-right: 20px;
  }
/*
  td:first-child::before {
    content: attr(data-content);
    padding-left: 10px;
  }
*/
  th:nth-child(2) {
    text-align: left;
    padding-left: 20px;
  }
  .country-name {
    flex-grow
  }
  tr:nth-child(2n+1) {
    background-color: #eee;
  }
  thead {
    position: sticky;
    z-index: 1;
    top: 0;
    background-color: #fff
  }
  .good, .bad, .na {
    font-size: 16px;
    background-repeat: no-repeat;
    background-position: center;
    background-clip: border-box;
  }
  .good {
    color: green;
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAMCAMAAABhq6zVAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABEVBMVEUAAABKx0o/wz82wTY2wDb///84wTgAgABHxkcxvzEvvi8wvzAguiAxvzEluyUxvzErvSsuvi5OyE5Mx0xizmIRtREPtQ8rvSt01HQStRIDsQMBsAEPtQ////////+X35cTthMEsQQDsQMRtRFAxEAWtxYZuBn3/PcVthUEsQQDsQMQtRBSyVIStRIDsQMFsgUWtxb///8WtxYEsQQDsQMQtRBQyVAPtQ8BsAEEsQQRtREEsQQCsQIPtQ9GxkYtvi0MtAwCsAIBsAECsQIQtRBGxUYwvzANtA0CsQICsQIQtRBHxkcxvzEOtA4FsQUQtRBJxkkuvi4guiAuvi4AsAAAsAAAsAAAsAAAsAAAsAD////XNc91AAAAVHRSTlMAAAAAAAAAAAAAAAAAAAAAAAAEBwJljBMCYe78ogAAAV3s73gFWUABWerybAR38N1HAFXo83AEnvrfiOP0cwUPjvr+9XYFDIr59nkGCobvfQcMQAv6JZO0AAAAAWJLR0QF+G/pxwAAAAlwSFlzAAAOxAAADsQBlSsOGwAAAAd0SU1FB+ILDwYJMqVzpxUAAAB7SURBVAjXY2CAAkYhYSYYm1lEVEwcymaRkJSSlmFglZVjZWCTV1AMUVJmUFFVY+dQ19AM0dLWYdDV0zcwNDIONTE142QwtwiztLIOtbG142JgsHdwDHeKcHZx5Qaaw+Pm7hHp6eXNCzaVz8fXzz+AH2qHQGBQsCADBgAAgLoQVIbOYasAAAAldEVYdGRhdGU6Y3JlYXRlADIwMTgtMDktMDVUMTQ6MjQ6MjktMDc6MDD3IjJVAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDE4LTA5LTA1VDE0OjI0OjI5LTA3OjAwhn+K6QAAAABJRU5ErkJggg==);
    background-size: 13px;
  }
  .bad {
    color: red;
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAMAAAC67D+PAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABF1BMVEXPAADeTEzgWFjIAADNAADLAADKAADNAADiY2PKAADPAADdTEzdTEzPAADKAADiZGTNAADKAADLAADMAADJAADhYWHdS0vOAADUGRnSDAzUFBTUFRXSDAzUGRnSDAzRBQXUFhbUFxfRBQXSDAzUFhbRBQXRBQXUGBjUGBjRBQXRBQXUFRXUFxfRBQXRBQXRBQXRBQXUFxfUGRnRBQXRBQXUGBjUGBjRBQXRBQXUGRnUFhbRBQXRBQXRBQXRBQXUFxfUFRXRBQXRBQXUGBjUGBjRBQXRBQXUFRXSDAzRBQXUFxfUFxfRBQXSDAzSDAzUFRXUFBTSDAzQAQHQAQHQAADQAADQAADQAADQAADQAADQAQHQAQH////CqmDcAAAAUnRSTlMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA5rjpHtze2zDI61a1F1M8yN9XNOznU19nPMzfa2DMz2No4Ms/Z19U6OcvUNzPP1Uet1Dkzzba3RTuu4CS2RAAAAAFiS0dEXOrYAJcAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAAHdElNRQfiCw8GCRaZcEPEAAAAdklEQVQI12OQkJRiYGRilpaRZZALkldgYVVUClZmUFENUVPX0AzV0mZg09EN09MPNzBkZ+DgNDKOiDAx5eJm4OE1M4+IsLDk42cQsLIOtbGNtLMXZHBwDHFydnENdXNn8Ijy9BIS9vaJ9mWQ8PMXERUTDwiUBQB4nxKWDdKgdgAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAxOC0wOS0wNVQxNDoyNDoyOS0wNzowMPciMlUAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMTgtMDktMDVUMTQ6MjQ6MjktMDc6MDCGf4rpAAAAAElFTkSuQmCC);
    background-size: 10px;
  }
  .footer {
    margin: 20px;
    line-height: 1.5em;
  }
  .footer ul {
    padding-top: 0px;
    margin-top: 0px;
  }
  .treaty-count {
    font-weight: normal;
    padding: 5px;
  }
  .flag {
    opacity: 60%;
    padding-right: 0.6em;
  }
`;

const page = ({css, js, content}) => `
<!DOCTYPE html>
<html>
 <head>
  <title>Human Survival</title>
  <meta charset="utf8"/>
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
  const htmlPage = page({css, js, content: html});
  fs.writeFileSync("index.html", htmlPage);
};

const treatyList = [
  "rome", "aggression", "npt", "ctbt", "nwfz", "tpnw", "bwc", "biodiversity"
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
    description += " " + ({"ratified":"ratified",
                           "acceded":"acceded to",
                           "succeeded":"inherited membership to",
                           "joined":"joined"}[joining_mechanism] ?? "joined");
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
    const populationItem =  { value: population[country_code], row_header: true };
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
  `<h1>Human Survival</h1>`

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
  //  console.log(population);
  delete aggregated.EU;
  const { rows, header } = tabulate(inputs(), aggregated, population);
  render(htmlHeading() + htmlTable({ rows, header }) + htmlFooter());
};

main();
