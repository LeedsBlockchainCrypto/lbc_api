
// lbccoin-cli createmultisig 2 ["TBGJUsit7e8BS4fcJC16LQUBi9TKqYLjcvksdWzSWYffENQc6WTk","T99mRbDNN9eB1Y4Z3jenjBMCLta5rkSegz2GaCjMFBy9nfsHFfAn"]

var utils = require('./utils.js')
var lbc_api = require('bitcoin');
var sha256 = require('sha256');
var fs = require('fs');

// if (process.argv.length != 2) {
//   console.log("usage: multisig_tx.js <file>");
//   return;
// }

if (!("LBC_USER" in process.env) || !("LBC_PASS" in process.env)) {
  console.log("Set your lbccoind JSON RPC credentials in LBC_USER and LBC_PASS");
  return;
}

var client = new lbc_api.Client({
  host: 'localhost',
  port: 9936,
  user: process.env.LBC_USER,
  pass: process.env.LBC_PASS,
  timeout: 30000
});

var change_address = "Yfo9ecAifmFCtobv1pXV1LrrySdAxP95Kp";
// TODO return address

var pubkeys = ["YhKYwEejHwWCXNvtKzZtVddLBMZegS4fTi","YdzMEPzKpyxvWNznTPJbs5d85DpBaZcniu"];

var prvkeys = ["TBGJUsit7e8BS4fcJC16LQUBi9TKqYLjcvksdWzSWYffENQc6WTk", "T99mRbDNN9eB1Y4Z3jenjBMCLta5rkSegz2GaCjMFBy9nfsHFfAn"];
var requiredSignatures = 2;

client.cmd('listunspent', function(err, txs) {
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

  console.log(txs[i]);
  fee = 0.1
  amount = 1.0;
  // change
  change = txs[i].amount - amount - fee;

  client.cmd("createmultisig", requiredSignatures, pubkeys, function(err, multisig) {
    if (err) return console.log(err);
    console.log(multisig);

    funding_in = [{"txid" : txs[i].txid,"vout": txs[i].vout}];
    funding_out = {};
    funding_out[multisig["address"]] = amount;
    funding_out[change_address] = change;
    //console.log(funding_out);
    client.cmd("createrawtransaction", funding_in, funding_out, function(err, rawfundtx) {
      if (err) return console.log(err);
      //console.log("rawtx:",rawfundtx);
      client.cmd("signrawtransaction", rawfundtx, function(err, signedfundtx) {
        if (err) return console.log(err);
        //console.log("signedtx:",signedfundtx) 
        fs.writeFileSync("./funding.hex", signedfundtx.hex);
        if (!signedfundtx.complete)
          return console.log("funding tx not ready");
        client.cmd("decoderawtransaction", signedfundtx.hex, function(err, decodedfundtx) {
          if (err) return console.log(err);
          fundtxid = decodedfundtx.txid;
          console.log(fundtxid);
          //console.log(JSON.stringify(decodedfundtx, undefined, 2));

          p2sh_in = [{"txid": fundtxid, 
                       "vout": 0, // TODO?
                       "scriptPubKey": decodedfundtx.vout[0].scriptPubKey.hex, // ??
                       "redeemScript": multisig.redeemScript }];
          // TODO...
          p2sh_out = { "YkRvYkqkbrEC8SBKWbqvtcySPCtZP4EVur": amount - fee };
          client.cmd('createrawtransaction', p2sh_in, p2sh_out, function(err, raw_p2sh) {
            if (err) return console.log(err);
            console.log(raw_p2sh);
            // sign the multisig
            client.cmd('signrawtransaction', raw_p2sh, p2sh_in, [prvkeys[0]], function(err, signed_raw_p2sh) {
              if (err) return console.log(err);
              console.log(signed_raw_p2sh.complete);
              // sign again              
              client.cmd('signrawtransaction', signed_raw_p2sh.hex, p2sh_in, [prvkeys[1]], function(err, signed_raw_p2sh) {
                if (err) return console.log(err);
                console.log(signed_raw_p2sh.complete);
                fs.writeFileSync("./p2sh.hex", signed_raw_p2sh.hex);
                client.cmd('decoderawtransaction', signed_raw_p2sh.hex, function(err, result) {
                  if (err) return console.log(err);
                  console.log(JSON.stringify(result, undefined, 2));
                });                                
                // client.cmd('sendrawtransaction', signed_raw_p2sh.hex, function(err, result) {
                //   if (err) return console.log(err);
                //   console.log(result);
                // });                                
              });
            });
          });
        });    
      });  
    });
  });
});


