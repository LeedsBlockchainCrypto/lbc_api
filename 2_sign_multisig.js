'use strict'
// sign multisig

var utils = require('./utils.js')
var lbc_api = require('bitcoin-core');
var fs = require('fs');

if (process.argv.length != 4) {
  console.log("usage: 2_sign_multisig.js <rawtx> <privatekey>");
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


var raw_p2sh = fs.readFileSync(process.argv[2], "utf8");
console.log(raw_p2sh);
//console.log(type(raw_p2sh));
const p2sh_in = undefined;
const prvkey = [process.argv[3]];


//console.log(prvkey);
(async () => {

  const decoded_raw_p2sh = await client.decodeRawTransaction(raw_p2sh);
  console.log(JSON.stringify(decoded_raw_p2sh, undefined, 2));

  const x = 'expected object with {"txid","vout","scriptPubKey"}??';
  // https://gist.github.com/gavinandresen/3966071
  const signed_raw_p2sh = await client.signRawTransaction(raw_p2sh, x, prvkey); 

  console.log(signed_raw_p2sh);
  console.log(signed_raw_p2sh.complete ? "fully signed" : "more sigs required");
  // sign again 
  fs.writeFileSync("./signed.hex", signed_raw_p2sh.hex);
  
})();

