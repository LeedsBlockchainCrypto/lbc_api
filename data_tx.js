'use strict'
//op_return_data=$(sha256sum $1 | cut -f 1 -d" ")

// Find some money to spend
// lbccoin-cli listunspent | jq -r '.[0]'

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

// Gets a utxo that cover the TX and the fee...
// TODO This should be able to aggregate multiple utxos
// function get_funds(payment, fee) {

//   // Get all UTXOs
//   const utxos = await client.listUnspent();

//   // Find a suitable utxo to use
//   for (var i = 0; i < utxos.length; ++i)
//   {
//     if (utxos[i].spendable && utxos[i].amount >= payment + fee)
//     {
//       console.log("got UTXO");
//       return utxos[i];
//     } 
//   }
//   return undefined;
// }


(async () => {
  //const balance = await client.getBalance('*', 0);
  //console.log(balance);

  // Get all UTXOs
  const utxos = await client.listUnspent();

  // Find a suitable utxo to use
  for (var i = 0; i < utxos.length; ++i)
  {
    if (utxos[i].spendable && utxos[i].amount >= fee)
    {
      console.log("got UTXO");
      break;
    } 
  }

  if (i == utxos.length)
    return console.log("cant find spendable UTXO")

  utxo = utxos[i]; //get_funds(0, fee);

  // FP (im)precision can cause odd errors
  change = (utxo.amount - fee).toFixed(6);

  // Get change address
  const changeaddress = await client.getAccountAddress("");

  // Create TX
  console.log("change address: " + changeaddress)
  var txinputs = [{ "txid": utxo.txid, "vout": utxo.vout }]
  var txoutput = { "data": prefix + hash }
  txoutput[changeaddress] = change;
  const rawtx = await client.createRawTransaction(txinputs, txoutput);

  // signTx
  const signedrawtx = await client.signRawTransaction(rawtx);
  //console.log(signedrawtx);

  //, checkAndSendTx);
  if (!signedrawtx.complete) {
    return console.log("TX not ready");
  }

  const txhash = await client.sendRawTransaction(signedrawtx.hex);

  console.log("Recorded in TX:", txhash);

})();