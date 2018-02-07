
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


client.listUnspent(function(err, txs) {
  if (err) return console.log(err);
  // find a valid utxo
  for (i = 0; i < txs.length; ++i)
  {
    if (txs[i].spendable)
    {
      console.log("got UTXO");
      break;
    } 
  }
  if (i == txs.length)
    return console.log("cant find spendable TX")

  fee = 0.01
  change = txs[i].amount - fee;

  client.cmd('getaccountaddress', "", function(err, changeaddress) {
    //changeaddress='YkRvYkqkbrEC8SBKWbqvtcySPCtZP4EVur';
    console.log("change address: " + changeaddress)
    // rawtx=$(lbccoin-cli -named createrawtransaction inputs='''[ { "txid": "'$utxo_txid'", "vout": '$utxo_vout' } ]''' outputs='''{ "data": "'$op_return_data'", "'$changeaddress'": 4.9 }''')
    txinputs = [{ "txid": txs[i].txid, "vout": txs[i].vout }]
    txoutput = { "data": prefix + hash }
    txoutput[changeaddress] = change;

    client.createRawTransaction(txinputs, txoutput, function(err, rawtx) {
      if (err) return console.log(err);
      console.log("got raw tx");

      client.cmd('signrawtransaction', rawtx, function(err, signedrawtx) {
        if (err) return console.log(err);
        console.log("signed raw tx");
        if (!signedrawtx.complete)
          console.log("TX not ready");
        else {
          client.cmd('sendrawtransaction', signedrawtx.hex, function(err, result) {
            console.log("Recorded in TX:", result);
          });
        }
      });
    });
  });
});
