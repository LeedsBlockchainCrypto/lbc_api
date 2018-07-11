'use strict'
// sign multisig

var utils = require('./utils.js')
var lbc_api = require('bitcoin-core');
var fs = require('fs');

if (process.argv.length != 4) {
  console.log("usage: 2_sign_multisig.js <record> <privatekey>");
  return;
}

if (!("LBC_USER" in process.env) || !("LBC_PASS" in process.env)) {
  console.log("Set your lbccoind JSON RPC credentials in LBC_USER and LBC_PASS");
  return;
}

var client = new lbc_api({
  //host: 'localhost',
  port: 9936,
  username: process.env.LBC_USER,
  password: process.env.LBC_PASS,
  timeout: 30000
});

const record_file = process.argv[2];
const prvkey = [process.argv[3]];

(async () => {

  var record = JSON.parse(fs.readFileSync(record_file, "utf8"));

  const signed_raw_p2sh = await client.signRawTransaction(record.auth.raw, record.auth.inputs, prvkey); 
  // write 
  record.auth.raw = signed_raw_p2sh.hex;
  
  // if fully signed, execute
  if (signed_raw_p2sh.complete) {
    const txhash = await client.sendRawTransaction(signed_raw_p2sh.hex);

    const decoded_raw_p2sh = await client.decodeRawTransaction(record.auth.raw);

    record.auth["tx"] = txhash;
    console.log("Signed and executed: ", txhash);

    record.deny["inputs"] = [{"txid": txhash, 
                              "vout": 1, // TODO this index must refer to a spendable output (not op_return)
                              "scriptPubKey": decoded_raw_p2sh.vout[1].scriptPubKey.hex, // ??
                              "redeemScript": record.deny.redeemScript }];
  }

  fs.writeFileSync(record_file, JSON.stringify(record, undefined, 2));

})();

