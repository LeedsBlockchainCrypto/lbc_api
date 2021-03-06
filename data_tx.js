'use strict'

var utils = require('./utils.js')
var lbc_api = require('bitcoin-core');
var sha256 = require('sha256');
var fs = require('fs');

if (process.argv.length != 3) {
  console.log("usage: data_tx.js <file>");
  return;
}

if (!("LBC_USER" in process.env) || !("LBC_PASS" in process.env)) {
  console.log("Set your lbccoind JSON RPC credentials in LBC_USER and LBC_PASS");
  return;
}

var file = process.argv[2];
// TODO 
// check lbccoind running
var prefix = utils.stringToHex("SHA256:" + utils.basename(file) + "=");

var data = fs.readFileSync(file);
var hash = sha256(data);

var utxo;
var change;

console.log("File: " + file) 
console.log("SHA-256: " + hash)

var client = new lbc_api({
  //host: 'localhost',
  port: 9936,
  username: process.env.LBC_USER,
  password: process.env.LBC_PASS,
  timeout: 30000
});

// global variable to hold UTXO so that callback can access it (there's probably a better way but I'm no js expert)
//utxo = {};
var fee = 0.01;

async function get_opreturn_tx(utxo, payload, changeaddress, change) {
  var txinputs = [{ "txid": utxo.txid, "vout": utxo.vout }]
  //console.log(txinputs);
  var txoutput = { "data": payload }
  txoutput[changeaddress] = change;
  return /*await*/ client.createRawTransaction(txinputs, txoutput);
}


(async () => {

  // utxo = utxos[i]; 
  const utxos = await utils.get_funds(client, 0, fee);

  if (!utxos.length)
    return console.log("cant find spendable UTXO")

  const utxo = utxos[0];

  // FP (im)precision can cause odd errors
  change = (utxo.amount - fee).toFixed(6);

  // Get change address
  const changeaddress = await client.getAccountAddress("");
  console.log("change address: " + changeaddress);

  // Create TX
  const rawtx = await get_opreturn_tx(utxo, prefix + hash, changeaddress, change);

  // signTx
  const signedrawtx = await client.signRawTransaction(rawtx);

  // check and send
  const txhash = await utils.send_tx_checked(client, signedrawtx);

  console.log("Recorded in TX:", txhash);

})();