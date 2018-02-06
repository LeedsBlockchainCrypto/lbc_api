
//op_return_data=$(sha256sum $1 | cut -f 1 -d" ")

// Find some money to spend
// lbccoin-cli listunspent | jq -r '.[0]'

var lbc_api = require('bitcoin');

var client = new lbc_api.Client({
  host: 'localhost',
  port: 9936,
  user: process.env.LBC_USER,
  pass: process.env.LBC_PASS,
  timeout: 30000
});


client.listUnspent(function(err, txs) {
  if (err) console.log(err);
  // find a valie utxo
  for (i = 0; i < txs.length; ++i)
  {
    if (txs[i].spendable)
    {
      console.log(txs[i]);
      break;
    } 
  }

  fee = 0.01
  change = txs[i].amount - fee;

  changeaddress='YkRvYkqkbrEC8SBKWbqvtcySPCtZP4EVur';

  // rawtx=$(lbccoin-cli -named createrawtransaction inputs='''[ { "txid": "'$utxo_txid'", "vout": '$utxo_vout' } ]''' outputs='''{ "data": "'$op_return_data'", "'$changeaddress'": 4.9 }''')
  txinputs = [{ "txid": txs[i].txid, "vout": txs[i].vout }]
  txoutput = { "data": "0123456789abcdeffedcba9876543210"}
  txoutput[changeaddress] = change;

  client.createRawTransaction(txinputs, txoutput, function(err, rawtx) {
    if (err) return console.log(err);
    console.log(rawtx);

    client.cmd('signrawtransaction', rawtx, function(err, signedrawtx) {
      if (err) return console.log(err);
      console.log(signedrawtx);
      if (!signedrawtx.complete)
        console.log("TX not ready");
      else {
        client.cmd('sendrawtransaction', signedrawtx.hex, function(err, result) {
          console.log(result);
        });
      }
    });
  });
});

