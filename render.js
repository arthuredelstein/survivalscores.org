import fs from "fs";
import { inputs, readYAML, codeToCountry, invertMap, treatyCodeToName } from "./utils.js";
import _ from 'lodash';

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
  }
  td:first-child {
    text-align: left;
    padding-left: 20px;
  }
  td:nth-child(2) {
    text-align: right;
  }
  th {
    text-align: center;
    margin: 0px;
    border: 0px;
    padding: 5px;
  }
  th:first-child {
    text-align: left;
    padding-left: 20px;
  }
  tr:nth-child(2n+1) {
    background-color: #eee;
  }
  tr:first-child {
    position: sticky;
    top: 0;
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
}
.bad {
  color: red;
  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAMAAAC67D+PAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABF1BMVEXPAADeTEzgWFjIAADNAADLAADKAADNAADiY2PKAADPAADdTEzdTEzPAADKAADiZGTNAADKAADLAADMAADJAADhYWHdS0vOAADUGRnSDAzUFBTUFRXSDAzUGRnSDAzRBQXUFhbUFxfRBQXSDAzUFhbRBQXRBQXUGBjUGBjRBQXRBQXUFRXUFxfRBQXRBQXRBQXRBQXUFxfUGRnRBQXRBQXUGBjUGBjRBQXRBQXUGRnUFhbRBQXRBQXRBQXRBQXUFxfUFRXRBQXRBQXUGBjUGBjRBQXRBQXUFRXSDAzRBQXUFxfUFxfRBQXSDAzSDAzUFRXUFBTSDAzQAQHQAQHQAADQAADQAADQAADQAADQAADQAQHQAQH////CqmDcAAAAUnRSTlMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA5rjpHtze2zDI61a1F1M8yN9XNOznU19nPMzfa2DMz2No4Ms/Z19U6OcvUNzPP1Uet1Dkzzba3RTuu4CS2RAAAAAFiS0dEXOrYAJcAAAAJcEhZcwAADsQAAA7EAZUrDhsAAAAHdElNRQfiCw8GCRaZcEPEAAAAdklEQVQI12OQkJRiYGRilpaRZZALkldgYVVUClZmUFENUVPX0AzV0mZg09EN09MPNzBkZ+DgNDKOiDAx5eJm4OE1M4+IsLDk42cQsLIOtbGNtLMXZHBwDHFydnENdXNn8Ijy9BIS9vaJ9mWQ8PMXERUTDwiUBQB4nxKWDdKgdgAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAxOC0wOS0wNVQxNDoyNDoyOS0wNzowMPciMlUAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMTgtMDktMDVUMTQ6MjQ6MjktMDc6MDCGf4rpAAAAAElFTkSuQmCC);
}
`;

const page = (css, content) => `
<!DOCTYPE html>
<html>
 <head>
  <title>Human Survival</title>
  <meta charset="utf8"/>
  <style>${css}</style>
 </head>
 <body>
  ${content}
 </body>
</html>
`;

const render = (html) => {
  //  console.log(aggregated);
  const htmlPage = page(css, html);
  fs.writeFileSync("index.html", htmlPage);
};

const tabulate = (inputs, aggregatedData, population) => {
  const { other_un_treaties, disarmament_treaties, nwfz_treaties } = inputs;
  const treatyList = [...other_un_treaties.map(t => t.code),
    ...disarmament_treaties.map(t => t.code)];
  const nwfzList = nwfz_treaties.map(t => t.code);
  const header = ["Country", "Population", ...treatyList, "nwfz"];
  let rows = [];
  for (const [country_code, treatyData] of Object.entries(aggregatedData)) {
//    console.log(country_code, treatyData);
    const row = [];
//    row.push({ value: country_code} );
    row.push({ value: codeToCountry(country_code), row_header: true });
//    console.log(population[country_code]);
    row.push({value: population[country_code], row_header: true});
    for (const treaty of treatyList) {
      const joined = treatyData[treaty] && treatyData[treaty].joined;
      const value = joined ? "yes" : "no";
      const description = (joined ?? "");
      row.push({description, value});
    }
    let nwfzMember = false;
    let nwfzJoined;
    for (const nwfz of nwfzList) {
      const joined = treatyData[nwfz] && treatyData[nwfz].joined;
      if (joined) {
        nwfzMember = true;
        nwfzJoined = joined;
      }
    }
    row.push({ value: nwfzMember ? "yes" : "no",
               description: (nwfzJoined ?? "")});
    rows.push(row);
  }
//  console.log(rows[0][0]);
  rows = _.sortBy(rows, row => row[1].value).reverse();
  return {rows, header};
};

const htmlTable = ({header, rows}) => {
  const fragments = [];
  fragments.push("<table>");
  fragments.push("<tr>");
  for (const headerItem of header) {
    fragments.push(`<th>${headerItem}</th>`);
  }
  fragments.push("</tr>");
  for (const row of rows) {
    fragments.push("<tr>");
    for (const cell of row) {
      if (cell.row_header) {
        fragments.push(`<td title="${cell.description}" class="row_header">${cell.value}</td>`);
      } else {
        fragments.push(`<td title="${cell.description}" class="${cell.value === "yes" ? "good" : "bad"}">&nbsp;</td>`);
      }
    }
    fragments.push("</tr>");
  }
  fragments.push("</table>");
  return fragments.join("");
};


const main = () => {
  const aggregated = JSON.parse(fs.readFileSync("aggregated.json").toString());
  const population = JSON.parse(fs.readFileSync("population.json").toString());
//  console.log(population);
  const {rows, header} = tabulate(inputs(), aggregated, population);
  const cleanHeader = header.map(x => treatyCodeToName(x) ?? x);
//  console.log(header, rows);
  render(htmlTable({rows, header: cleanHeader}));
}

main();
