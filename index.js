const http = require("http");
const url = require('url');
const querystr = require('querystring');
const Nightmare = require('nightmare');
const timeout = 2000;
const port = 3000;

http.createServer(async (req, res) => {

  const params = querystr.parse(url.parse(req.url).query);
  await fedrus({params, res});

}).listen(port);

async function fedrus({params, res} = {}) {

  if (!res) {
    return;
  }

  if (!params || typeof params !== 'object' || !Object.keys(params).length) {
    res.writeHead(200, {"Content-Type": "text/html"});
    res.write(JSON.stringify([]));
    res.end();
    return;
  }

  let n;
  try {

    const nightmare = Nightmare({show: false});
    n = nightmare.goto('http://bankrot.fedresurs.ru/DebtorsSearch.aspx?attempt=3');
    const cookies = await n.cookies.get();
    n.cookies.set(cookies[0]);
    await n.goto('http://bankrot.fedresurs.ru/DebtorsSearch.aspx?attempt=3');
    await n.click('#ctl00_cphBody_rblDebtorType_1');
    await n.wait(timeout);

    if (params.lastName) {
      await n.insert('#ctl00_cphBody_tbPrsLastName', params.lastName);
    }

    if (params.firstName) {
      await n.type('#ctl00_cphBody_tbPrsFirstName', params.firstName);
    }

    if (params.middleName) {
      await n.type('#ctl00_cphBody_tbPrsMiddleName', params.middleName);
    }

    if (params.region) {
      await n.click('#ctl00_cphBody_ucPrsRegionList_ddlBoundList');
      await n.select('#ctl00_cphBody_ucPrsRegionList_ddlBoundList', params.region);
    }
    await n.click('#ctl00_cphBody_btnSearch');

    await n.wait(timeout);
    const result = await n.evaluate(parseResult);

    const data = [];
    convertResult({result, data});

    res.writeHead(200, {"Content-Type": "text/html"});
    res.write(JSON.stringify(data));
    res.end();

  } catch (err) {

    console.error(err);

    res.writeHead(500, {"Content-Type": "text/html"});
    res.write(JSON.stringify(err));
    res.end();

  } finally {

    if (n) {
      await n.end();
    }

  }

}

function convertResult({result, data}) {

  if (!result.length) {
    return;
  }

  for (let row of result) {

    data.push({
      category: row[0],
      debtor: row[1],
      inn: row[2],
      ogrnip: row[3],
      snils: row[4],
      region: row[5],
      address: row[6]
    });

  }

}

function parseResult() {

  // get table and prepare result
  const result = [];
  const table = document.querySelector('#ctl00_cphBody_gvDebtors');
  const rows = table.querySelectorAll('tr');

  for (let i = 0; i < rows.length; i++) {

    if (i === 0) continue;

    // get cells
    let cells = rows[i].querySelectorAll('td');

    // get contents
    let row = [];
    for (j = 0; j < cells.length; j++) {
      let str = cells[j].innerHTML;
      str = str.replace(/\t/g, '');
      str = str.replace(/\n/g, '');
      row.push(str);
    }

    // add to result
    result.push(row);

  }

  return result;

}