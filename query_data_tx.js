
var utils = require('./utils.js');
var lbc_api = require('bitcoin');
var sha256 = require('sha256')
var fs = require('fs');

if (process.argv.length != 3) {
  console.log("usage: query_data_tx.js <txid>");
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


client.getTransaction(txid, function(err, tx) {
  if (err) return console.log(err);
  //console.log(hexToString(tx.hex));
  
  preamble = utils.stringToHex("SHA256:");
  loc = tx.hex.indexOf(preamble);
  if (loc == -1) {
    return console.log("tx does not contain data payload")
  }
  filestart = loc + 14; // chars in hex representation of "SHA256:"
  fileend = tx.hex.indexOf(utils.stringToHex("="), filestart);
  filename  = utils.hexToString(tx.hex.substr(filestart, fileend - filestart));
  hash = tx.hex.substr(fileend + 2, 64)

  console.log(filename + " SHA256:" + hash);
  console.log("Registered on " + new Date(tx.time * 1000));
  console.log("Mined on " + new Date(tx.blocktime * 1000));
  console.log("Confirmations:" + tx.confirmations);

});