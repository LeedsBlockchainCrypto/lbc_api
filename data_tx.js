
//op_return_data=$(sha256sum $1 | cut -f 1 -d" ")

// Find some money to spend
// lbccoin-cli listunspent | jq -r '.[0]'

var utils = require('./utils.js')
var lbc_api = require('bitcoin');
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
prefix = utils.stringToHex("SHA256:" + utils.basename(file) + "=");

var data = fs.readFileSync(file);
var hash = sha256(data);

console.log("File: " + file) 
console.log("SHA-256: " + hash)

var client = new lbc_api.Client({
  host: 'localhost',
  port: 9936,
  user: process.env.LBC_USER,
  pass: process.env.LBC_PASS,
  timeout: 30000
});

// global variable to hold UTXO so that callback can access it (there's probably a better way but I'm no js expert)
//utxo = {};
fee = 0.01;


function confirmTx(err, result) {
  if (err) return console.log(err);
  console.log("Recorded in TX:", result);
}

function checkAndSendTx(err, signedrawtx) {
  if (err) return console.log(err);
  console.log("signed raw tx");
  if (!signedrawtx.complete)
    console.log("TX not ready");
  else {
    client.cmd('sendrawtransaction', signedrawtx.hex, confirmTx);
  }
}

function signTx(err, rawtx) {
  if (err) return console.log(err);
  console.log("got raw tx");

  client.cmd('signrawtransaction', rawtx, checkAndSendTx);
}

function createTx(err, changeaddress) {
  //console.log(utxo);
  console.log("change address: " + changeaddress)
  txinputs = [{ "txid": utxo.txid, "vout": utxo.vout }]
  txoutput = { "data": prefix + hash }
  txoutput[changeaddress] = change;

  client.createRawTransaction(txinputs, txoutput, signTx);
}

function findFunds(err, utxos) {
  if (err) return console.log(err);
  // find a valid utxo
  for (i = 0; i < utxos.length; ++i)
  {
    if (utxos[i].spendable && utxos[i].amount >= fee)
    {
      console.log("got UTXO");
      break;
    } 
  }
  if (i == utxos.length)
    return console.log("cant find spendable UTXO")

  utxo = utxos[i];

  // FP (im)precision can cause odd errors
  change = (utxos[i].amount - fee).toFixed(6);

  client.cmd('getaccountaddress', "", createTx);
}


client.listUnspent(findFunds);
