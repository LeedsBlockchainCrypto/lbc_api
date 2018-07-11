'use strict'
// exec fully-signed multisig

var utils = require('./utils.js')
var lbc_api = require('bitcoin-core');
var fs = require('fs');

if (process.argv.length != 3) {
  console.log("usage: 3_check_multisig.js <record>");
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
console.log(raw_p2sh);


(async () => {
  //TODO
})();
