'use strict'
// sign multisig

var utils = require('./utils.js')
var lbc_api = require('bitcoin-core');
var fs = require('fs');

if (process.argv.length != 5) {
  console.log("usage: 2_sign_multisig.js <rawtx> <fund_tx> <privatekey>");
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

const raw_p2sh_file = process.argv[2];
const raw_p2sh = fs.readFileSync(raw_p2sh_file, "utf8");
//console.log(raw_p2sh);
//console.log(type(raw_p2sh));
const p2sh_in = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const prvkey = [process.argv[4]];


//console.log(prvkey);
(async () => {

  const decoded_raw_p2sh = await client.decodeRawTransaction(raw_p2sh);
  //console.log(JSON.stringify(decoded_raw_p2sh, undefined, 2));
  
  const signed_raw_p2sh = await client.signRawTransaction(raw_p2sh, p2sh_in, prvkey); 

  // write 
  fs.writeFileSync(raw_p2sh_file, signed_raw_p2sh.hex);
  
  // if fully signed, execute
  if (signed_raw_p2sh.complete) {
    const txhash = await client.sendRawTransaction(signed_raw_p2sh.hex);
    fs.writeFileSync("./auth_" + txhash + ".json", JSON.stringify(signed_raw_p2sh));
    console.log("Signed and executed: ", txhash);
  }
})();

