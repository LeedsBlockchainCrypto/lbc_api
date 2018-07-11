'use strict'
// exec fully-signed multisig

var utils = require('./utils.js')
var lbc_api = require('bitcoin-core');
var fs = require('fs');

if (process.argv.length != 3) {
  console.log("usage: 3_check_multisig.js <record>");
  return;
}

var client = new lbc_api({
  //host: 'localhost',
  port: 9936,
  username: process.env.LBC_USER,
  password: process.env.LBC_PASS,
  timeout: 30000
});


async function check(txid, input_tx) {
  const tx = await client.getRawTransaction(txid, true);

  if (input_tx != null && tx.vin[0].txid != input_tx) {
    console.log("previous tx is not an input")
    return [false, "", -1, 0];
  }

  //console.log(JSON.stringify(tx, undefined, 2));
  
  // TODO get addresses from a valid vout (not OP_RETURN)
  //console.log(JSON.stringify(tx.vout[0], undefined, 2));

  return [ true, null, tx.time, tx.confirmations ];
}

const record_file = process.argv[2];

(async () => {

  var record = JSON.parse(fs.readFileSync(record_file, "utf8"));

  // TODO check addresses and pubkeys match
  var created = false;
  var authorised = false;
  var cancelled = false;

  // 2-way check that out addr refers to next tx, and in tx refers to previous 
  var address = null;
  
  if ("tx" in record.fund) {
    console.log("Found creation TX, checking...");
    const result = await check(record.fund.tx);
    console.log("tx time:", new Date(result[2] * 1000));
    console.log("tx conf:", result[3]);
    address = result[1];
    created = result[0];
  } else {
    console.log("Creation TX not found");
  }

  if ("tx" in record.auth /*&& address == record.auth.address*/) {
    console.log("Found auth TX, checking...");
    // check input matches fund tx id...
    const result = await check(record.auth.tx, record.fund.tx, address);
    console.log("tx time:", new Date(result[2] * 1000));
    console.log("tx conf:", result[3]);

    address = result[1];
    authorised = result[0];
  } else {
    console.log("Auth TX not found");
  }

  if ("tx" in record.deny) {
    console.log("Found deny TX, checking...");
    // check input matches auth tx id...
    const result = await check(record.deny.tx, record.auth.tx);
    console.log("tx time:", new Date(result[2] * 1000));
    console.log("tx conf:", result[3]);

    cancelled = result[0];
  } else {
    console.log("Deny TX not found");
  }

  console.log("Alive: ", created && authorised && !cancelled);

})();
