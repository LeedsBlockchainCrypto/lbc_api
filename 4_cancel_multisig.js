'use strict'
// exec fully-signed multisig

var utils = require('./utils.js')
var lbc_api = require('bitcoin-core');
var fs = require('fs');

//const auth = require("./auth.json")

if (process.argv.length != 4) {
  console.log("usage: 4_cancel_multisig.js <record> <wif>");
  return;
}

var client = new lbc_api({
  //host: 'localhost',
  port: 9936,
  username: process.env.LBC_USER,
  password: process.env.LBC_PASS,
  timeout: 30000
});

const amount = 1;
const change_address = "YYMjBpnujHoHkd5xC9w8LhB3WQ7LhjDjnp";
const wif = process.argv[3];

const record_file = process.argv[2];

(async () => {

  var record = JSON.parse(fs.readFileSync(record_file, "utf8"));

  const txin = await client.decodeRawTransaction(record.auth.raw);

  var txoutput = {}
  txoutput[change_address] = amount;
  var cxtx = await client.createRawTransaction(record.deny.inputs, txoutput);
  //console.log(cxtx);

  const signedcxtx = await client.signRawTransaction(cxtx, record.deny.inputs, [wif]);
  record.deny["raw"] = signedcxtx;
  
  // check and send
  //const txhash = await utils.send_tx_checked(client, signedcxtx);
  const txhash = await client.sendRawTransaction(signedcxtx.hex);
  record.deny["tx"] = txhash;
  
  console.log(txhash);
  fs.writeFileSync(record_file, JSON.stringify(record, undefined, 2));
})();
