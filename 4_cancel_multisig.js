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
  //console.log(p2sh_txid);
  //const txin_raw = fs.readFileSync(p2sh_txid, "utf8");
  //console.log(txin_raw);
  var record = JSON.parse(fs.readFileSync(record_file, "utf8"));

  const txin = await client.decodeRawTransaction(record.auth.raw);

  //console.log("TX: " + JSON.stringify(txin, undefined, 2));
  //console.log(JSON.stringify(await client.decodeRawTransaction(auth.hex), undefined, 2));

  // TODO save this in 2_...
  // const redeem_script = (await client.createMultiSig(1, pubkeys)).redeemScript;
  // var txinputs = [{ "txid": txin.txid, 
  //                   "vout": 1,  
  //                   "scriptPubKey": txin.vout[1].scriptPubKey.hex,
  //                   "redeemScript": redeem_script
  //                 }];

  var txoutput = {}
  txoutput[change_address] = amount;
  var cxtx = await client.createRawTransaction(record.deny.inputs, txoutput);
  //console.log(cxtx);

  // signTx
  // says its not ready?
  //const txhash = await utils.send_tx_checked(client, raw_p2sh); 
  const signedcxtx = await client.signRawTransaction(cxtx, record.deny.inputs, [wif]);

  record.deny["raw"] = signedcxtx;
  console.log(signedcxtx);
  // // check and send
  // //const txhash = await utils.send_tx_checked(client, signedcxtx);
  const txhash = await client.sendRawTransaction(signedcxtx.hex);
  record.deny["tx"] = txhash;
  
  console.log(txhash);
  fs.writeFileSync("authdeny_record.json", JSON.stringify(record, undefined, 2));
})();
