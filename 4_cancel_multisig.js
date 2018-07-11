'use strict'
// exec fully-signed multisig

var utils = require('./utils.js')
var lbc_api = require('bitcoin-core');
var fs = require('fs');

//const auth = require("./auth.json")

if (process.argv.length != 4) {
  console.log("usage: 4_cancel_multisig.js <txid> <wif>");
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
const wif = process.argv[3] 
const pubkeys = ["0273cb3dd42509b4f872f5d7e44ffa9bdd3c2000c01329bacac7e3ad41bc1f0b17","03bf301b47845126b908bffe71d09668e29211daf4e5bbb77a43e0f1622f579984"];

const p2sh_txid = process.argv[2];

(async () => {
  //console.log(p2sh_txid);
  const txin_raw = await client.getRawTransaction(p2sh_txid);

  const txin = await client.decodeRawTransaction(txin_raw);
  // says its not ready?
  //const txhash = await utils.send_tx_checked(client, raw_p2sh); 

  console.log("TX: " + JSON.stringify(txin, undefined, 2));

  //console.log(JSON.stringify(await client.decodeRawTransaction(auth.hex), undefined, 2));

  // TODO save this in 2_...
  const redeem_script = (await client.createMultiSig(1, pubkeys)).redeemScript;
  var txinputs = [{ "txid": txin.txid, 
                    "vout": 1,  
                    "scriptPubKey": txin.vout[1].scriptPubKey.hex,
                    "redeemScript": redeem_script
                  }];

  var txoutput = {}
  txoutput[change_address] = amount;
  var cxtx = await client.createRawTransaction(txinputs, txoutput);
  console.log(cxtx);

  // signTx
  const signedcxtx = await client.signRawTransaction(cxtx, txinputs, [wif]);

  console.log(signedcxtx);
  // // check and send
  // //const txhash = await utils.send_tx_checked(client, signedcxtx);
  const txhash = await client.sendRawTransaction(signedcxtx.hex);
  
  console.log(txhash);
})();
