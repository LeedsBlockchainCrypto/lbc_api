
var utils = require('./utils.js');
var lbc_api = require('bitcoin');
var sha256 = require('sha256')
var fs = require('fs');

preamble = utils.stringToHex("SHA256:");


if (process.argv.length != 3) {
  console.log("usage: query_data_tx.js <txid>");
  return;
}

if (!("LBC_USER" in process.env) || !("LBC_PASS" in process.env)) {
  console.log("Set your lbccoind JSON RPC credentials in LBC_USER and LBC_PASS");
  return;
}

var txid = process.argv[2];

var client = new lbc_api.Client({
  host: 'localhost',
  port: 9936,
  user: process.env.LBC_USER,
  pass: process.env.LBC_PASS,
  timeout: 30000
});


client.cmd("getrawtransaction", txid, true, function(err, tx) {
  if (err) return console.log(err);

  for (var i = 0; i < tx.vout.length; ++i) {
    script = tx.vout[i].scriptPubKey.asm;
    if (script.substr(0,9) == "OP_RETURN") {
      console.log(script);
      loc = script.indexOf(preamble);
      if (loc == -1) {
        console.log("tx contains unrecognised data payload:", script);
        console.log("utf-8:", utils.hexToString(script.substr(10)));
      } else {
        filestart = loc + 14; // chars in hex representation of "SHA256:"
        fileend = script.indexOf(utils.stringToHex("="), filestart);
        filename  = utils.hexToString(script.substr(filestart, fileend - filestart));
        hash = script.substr(fileend + 2, 64)
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
});