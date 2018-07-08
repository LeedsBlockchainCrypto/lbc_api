'use strict'

var utils = require('./utils.js');
var lbc_api = require('bitcoin-core');
var sha256 = require('sha256')
var fs = require('fs');

var preamble = utils.stringToHex("SHA256:");


if (process.argv.length != 3) {
  console.log("usage: query_data_tx.js <txid>");
  return;
}

if (!("LBC_USER" in process.env) || !("LBC_PASS" in process.env)) {
  console.log("Set your lbccoind JSON RPC credentials in LBC_USER and LBC_PASS");
  return;
}

var txid = process.argv[2];

var client = new lbc_api({
  //host: 'localhost',
  port: 9936,
  username: process.env.LBC_USER,
  password: process.env.LBC_PASS,
  timeout: 30000
});

(async () => {
  const tx = await client.getRawTransaction(txid, true);

  for (var i = 0; i < tx.vout.length; ++i) {
    const script = tx.vout[i].scriptPubKey.asm;
    if (script.substr(0,9) == "OP_RETURN") {
      console.log(script);
      const loc = script.indexOf(preamble);
      if (loc == -1) {
        console.log("tx contains unrecognised data payload:", script);
        console.log("utf-8:", utils.hexToString(script.substr(10)));
      } else {
        const filestart = loc + 14; // chars in hex representation of "SHA256:"
        const fileend = script.indexOf(utils.stringToHex("="), filestart);
        const filename  = utils.hexToString(script.substr(filestart, fileend - filestart));
        const hash = script.substr(fileend + 2, 64)
        //console.log(script.substr(10,14));
        console.log(filename + " SHA256:" + hash);
      }
      console.log("Registered on " + new Date(tx.time * 1000));
      console.log("Mined on " + new Date(tx.blocktime * 1000));
      console.log("Confirmations:" + tx.confirmations);
      break;
    }
  }
  if (i == tx.vout.length) {
    console.log("tx does not have a data payload")
  }
})();