'use strict'
// 

var utils = require('./utils.js');
var lbc_api = require('bitcoin-core');
var sha256 = require('sha256');
var fs = require('fs');

if (process.argv.length < 4) {
  console.log("usage: nodejs " + process.argv[1] + " N PK0 PK1...");
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


const amount = 1;
const fee = 0.01;
const change_address = "YYMjBpnujHoHkd5xC9w8LhB3WQ7LhjDjnp";

// some randomly generated keys and their wifs
//const pubkeys = ["0273cb3dd42509b4f872f5d7e44ffa9bdd3c2000c01329bacac7e3ad41bc1f0b17","03bf301b47845126b908bffe71d09668e29211daf4e5bbb77a43e0f1622f579984"];
//const prvkeys = ["TAJWsuEQAHfPYSTk9dyqgMZBzJLLdspP8TkyHAGFNyEkPgiEqNyC", "T9wB7cCpgd6yFbL62AYUe8Z5MYezT7cGvZwuCwMmMXcjDbckE5pj"];

// TODO json input...
const payload = utils.stringToHex("Testing 1 2 3 ...");

var requiredSignatures = parseInt(process.argv[2]);

var pubkeys = [process.argv[3], process.argv[4]];
for (var i = 5; i < process.argv.length; ++i) {
  pubkeys.push(process.argv[i]);
}

console.log(requiredSignatures + "/" + pubkeys.length, pubkeys);

(async () => {

  const utxos = await utils.get_funds(client, amount + fee, fee);

  if (!utxos.length)
    return console.log("cant find spendable UTXO")

  const utxo = utxos[0];

  // FP (im)precision can cause odd errors
  const change = (utxo.amount - amount - 3 * fee).toFixed(6);

  // Get change address
  const changeaddress = await client.getAccountAddress("");
  console.log("change address: " + changeaddress);

  // all signatories enter into a contract
  const auth = await client.createMultiSig(requiredSignatures, pubkeys);  
  // any one signatory can nullifies it
  const deny = await client.createMultiSig(1, pubkeys);
  
  const funding_in = [{"txid": utxo.txid, "vout": utxo.vout}];
  var funding_out = {};
  funding_out[auth["address"]] = (amount + 2 * fee).toFixed(6);
  funding_out[change_address] = change;
  //console.log(funding_out);

  const rawfundtx = await client.createRawTransaction(funding_in, funding_out); 
  
  //function createFund(err, rawfundtx) {
  //console.log("rawtx:",rawfundtx);

  const signedfundtx = await client.signRawTransaction(rawfundtx);
 
  const fundtxhash = await utils.send_tx_checked(client, signedfundtx); 
  console.log("P2SH fund tx:", fundtxhash);

  const decodedfundtx  = await client.decodeRawTransaction(signedfundtx.hex);
  fs.writeFileSync("fund_" + fundtxhash + ".json", JSON.stringify(decodedfundtx, undefined, 2));
  
  const fundtxid = decodedfundtx.txid;
  console.log("P2SH auth addr:", auth.address);
  console.log("P2SH deny addr:", deny.address);
  //console.log(JSON.stringify(decodedfundtx, undefined, 2));
  // work out the output we're spending in the P2SH (i.e. not the change)
  for (var vout_index = 0; vout_index <  decodedfundtx.vout.length; ++vout_index) {
    // TODO multiple addresses?
    if (auth["address"] == decodedfundtx.vout[vout_index].scriptPubKey.addresses[0])
      break;
  }

  const auth_in = [{"txid": fundtxid, 
                    "vout": vout_index, 
                    "scriptPubKey": decodedfundtx.vout[0].scriptPubKey.hex, // ??
                    "redeemScript": auth.redeemScript }];
  // data payload...
  var auth_out = { "data": payload };
  auth_out[deny.address] = amount + fee;

  const raw_auth = await client.createRawTransaction(auth_in, auth_out);

  fs.writeFileSync("./auth_in_" + auth.address + ".json", JSON.stringify(auth_in, undefined, 2));
  //console.log(raw_p2sh);
  fs.writeFileSync("./" + auth.address + ".hex", raw_auth);
})();


