'use strict'

var utils = require('./utils.js');
var lbc_api = require('bitcoin-core');
var sha256 = require('sha256');
var fs = require('fs');

if (process.argv.length < 4) {
  console.log("usage: nodejs " + process.argv[1] + " record PK0 PK1...");
  return;
}

if (!("LBC_USER" in process.env) || !("LBC_PASS" in process.env)) {
  console.log("Set your lbccoind JSON RPC credentials in LBC_USER and LBC_PASS");
  return;
}

var client = new lbc_api({
  port: 9936,
  username: process.env.LBC_USER,
  password: process.env.LBC_PASS,
  timeout: 30000
});


var record_file = process.argv[2];

var pubkeys = [process.argv[3], process.argv[4]];
for (var i = 5; i < process.argv.length; ++i) {
  pubkeys.push(process.argv[i]);
}
// TODO remove hard-coded N/N auth, 1/N deny
const req_sigs = pubkeys.length

console.log(req_sigs + "/" + pubkeys.length, pubkeys);

(async () => {

  // TODO configurable - json input...
  var record = { "pubkeys": pubkeys,
                 "payload": utils.stringToHex("Testing 1 2 3 ..."),
                 "auths": req_sigs, 
                 "denys": 1,
                 "deposit": 1,
                 "fee": 0.01,
                 "change_address": "YYMjBpnujHoHkd5xC9w8LhB3WQ7LhjDjnp",                  
                 "fund": {},
                 "auth": {},
                 "deny": {} }

  const utxos = await utils.get_funds(client, record.deposit + record.fee, record.fee);

  if (!utxos.length)
    return console.log("cant find spendable UTXO")

  const utxo = utxos[0];

  // FP (im)precision can cause odd errors
  const change = (utxo.amount - record.deposit - 3 * record.fee).toFixed(6);

  // all signatories enter into a contract
  record.auth = await client.createMultiSig(req_sigs, pubkeys);  
  console.log("P2SH auth addr:", record.auth.address);

  // any one signatory can nullifies it
  record.deny = await client.createMultiSig(1, pubkeys);
  console.log("P2SH deny addr:", record.deny.address);

  // Create TX to fund the auth address
  const funding_in = [{"txid": utxo.txid, "vout": utxo.vout}];
  var funding_out = {};
  funding_out[record.auth["address"]] = (record.deposit + 2 * record.fee).toFixed(6);
  funding_out[record.change_address] = change;
  const rawfundtx = await client.createRawTransaction(funding_in, funding_out); 

  // Sign it
  const signedfundtx = await client.signRawTransaction(rawfundtx);
 
  // Send it
  const fundtxhash = await utils.send_tx_checked(client, signedfundtx); 
  console.log("P2SH fund tx:", fundtxhash);
  record.fund["tx"] = fundtxhash;

  // Create inputs for the next stage
  const decodedfundtx  = await client.decodeRawTransaction(signedfundtx.hex);
  const fundtxid = decodedfundtx.txid;

  //console.log(JSON.stringify(decodedfundtx, undefined, 2));
  // work out the output we're spending in the P2SH (i.e. not the change)
  for (var vout_index = 0; vout_index <  decodedfundtx.vout.length; ++vout_index) {
    // TODO multiple addresses?
    if (record.auth["address"] == decodedfundtx.vout[vout_index].scriptPubKey.addresses[0])
      break;
  }

  record.auth["inputs"] = [{"txid": fundtxid, 
                            "vout": vout_index, 
                            "scriptPubKey": decodedfundtx.vout[0].scriptPubKey.hex, // ??
                            "redeemScript": record.auth.redeemScript }];

  // data payload...
  var auth_out = { "data": record.payload };
  auth_out[record.deny.address] = record.deposit + record.fee;

  record.auth["raw"] = await client.createRawTransaction(record.auth["inputs"], auth_out);

  console.log("Writing contract record to " + record_file);
  fs.writeFileSync(record_file, JSON.stringify(record, undefined, 2));

})();


