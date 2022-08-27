import fs from "fs";
import { inputs, readYAML, codeToCountry, invertMap, treatyCodeToName } from "./utils.js";

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


const css = `
  table {
    position: relative;
    border-collapse: collapse;
  }
  td {
    text-align: center;
    margin: 0px;
    border: 0px;
    padding: 5px;
  }
  td:first-child {
    text-align: left;
  }
  th {
    text-align: center;
    margin: 0px;
    border: 0px;
    padding: 5px;
  }
  th:first-child {
    text-align: left;
  }
  tr:nth-child(2n+1) {
    background-color: #eee;
  }
  tr:first-child {
    position: sticky;
    top: 0;
  }
`;

const render = (html) => {
  //  console.log(aggregated);
  const htmlPage = page(css, html);
  fs.writeFileSync("index.html", htmlPage);
};

const tabulate = (inputs, aggregatedData) => {
  const { other_un_treaties, disarmament_treaties, nwfz_treaties } = inputs;
  const treatyList = [...other_un_treaties.map(t => t.code),
    ...disarmament_treaties.map(t => t.code)];
  const nwfzList = nwfz_treaties.map(t => t.code);
  const header = ["country", ...treatyList, "nwfz"];
  let rows = [];
  for (const [country_code, treatyData] of Object.entries(aggregatedData)) {
    console.log(country_code, treatyData);
    const row = [];
//    row.push({ value: country_code} );
    row.push({ value: codeToCountry(country_code) });
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
      fragments.push(`<td title="${cell.description}">${cell.value}</td>`);
    }
    fragments.push("</tr>");
  }
  fragments.push("</table>");
  return fragments.join("");
};


const main = () => {
  const aggregated = JSON.parse(fs.readFileSync("aggregated.json").toString());
  const {rows, header} = tabulate(inputs(), aggregated);
  const cleanHeader = header.map(x => treatyCodeToName(x) ?? x);
//  console.log(header, rows);
  render(htmlTable({rows, header: cleanHeader}));
}

main();
