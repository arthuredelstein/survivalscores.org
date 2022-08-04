import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

const disarmament_treaties = [
  {
    code: "tpnw",
    tableSelector: "#sort_table_special"
  },
  {
    code: "ctbt",
    tableSelector: "#sort_table"
  },
  {
    code: "npt",
    tableSelector: "#sort_table_special"
  },
  {
    code: "bwc",
    tableSelector: "#sort_table_special"
  },
  {
    code: "rarotonga",
    nwfz: true,
    tableSelector: "#sort_table"
  },
  {
    code: "pelindaba",
    nwfz: true,
    tableSelector: "#sort_table"
  },
  {
    code: "canwfz",
    nwfz: true,
    tableSelector: "#sort_table"
  },
  {
    code: "bangkok",
    nwfz: true,
    tableSelector: "#sort_table"
  },
  {
    code: "tlatelolco",
    nwfz: true,
    tableSelector: "#sort_table"
  },
];

const other_un_treaties = [
  {
    code: "rome",
    url: "https://treaties.un.org/pages/ViewDetails.aspx?src=TREATY&mtdsg_no=XVIII-10&chapter=18&clang=_en",
    columnCount: 3
  },
  {
    code: "aggression",
    url: "https://treaties.un.org/pages/ViewDetails.aspx?src=TREATY&mtdsg_no=XVIII-10-b&chapter=18&clang=_en",
    columnCount: 2
  }
];

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

const getDisarmamentDateFromDataOrder = (td) => td.getAttribute("data-order").split("-")[0];

const getDisarmamentDataFromRow = (row) => {
  const [td0, td1, td2, td3] = row.querySelectorAll("td");
  const country = td0.getAttribute("data-order");
  const signed = formatDate(getDisarmamentDateFromDataOrder(td1));
  const td2_date = formatDate(getDisarmamentDateFromDataOrder(td2));
  const link = td2.querySelector("a");
  let ratified, acceded;
  if (link) {
    const href = td2.querySelector("a").getAttribute("href");
    if (href.includes("RAT")) {
      ratified = td2_date;
    } else if (href.includes("ACC")) {
      acceded = td2_date;
    }
  }
  return { country, signed, ratified, acceded };
};

const getUNDataFromRow = (row, columnCount) => {
  const [td0, td1, td2] = row.querySelectorAll("td");
  const country = td0.textContent;
  if (columnCount === 3) {
    const joined = formatDate(td2.textContent.split(/\s+/).slice(0,3).join(" "));
    return {
      country,
      signed: formatDate(td1.textContent),
      joined
    };
  } else if (columnCount === 2) {
    return {
      country,
      joined: formatDate(td1.textContent)    };
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

const disarmament = async () => {
  const results = {};
  for (let treaty of disarmament_treaties) {
    const { code, tableSelector, nwfz } = treaty;
    const statuses = await disarmamentTreatyInfo(code, tableSelector);
    results[code] = statuses;
  }
  return results;
};

const other = async () => {
  const results = {};
  for (let treaty of other_un_treaties) {
    const { code, url, columnCount } = treaty;
    const statuses = await unTreatyInfo(url, columnCount);
    results[code] = statuses;
  }
  return results;
};

const getAllData = async () => {
  const otherData = await other();
  const disarmamentData = await disarmament();
  return Object.assign({}, otherData, disarmamentData);
};

const main = async () => {
  const data = await getAllData();
  console.log(data);
  console.log(Object.keys(data));
};

main();
