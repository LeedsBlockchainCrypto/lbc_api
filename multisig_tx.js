'use strict'
// 

var utils = require('./utils.js')
var lbc_api = require('bitcoin');
//var sha256 = require('sha256');
var fs = require('fs');

if (process.argv.length != 2 && process.argv.length != 3) {
  console.log("usage: multisig_tx.js <payload>");
  return;
}

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

var payload = "";
if (process.argv.length ==3) {
  var payload = utils.stringToHex(process.argv[2]);
  console.log("Payload: " + process.argv[2] + ":" + payload)
}

var amount = 1;
var fee = 0.001
var change_address = "YnYXkCVT7fDfz4A12WNtfyKo3dzGQLdG83";
var return_address = "YSWDgr4qH7q1BxVBHvdWDv5h2JPYqN8ePb";

// some randomly generated keys and their wifs
var pubkeys = ["0273cb3dd42509b4f872f5d7e44ffa9bdd3c2000c01329bacac7e3ad41bc1f0b17","03bf301b47845126b908bffe71d09668e29211daf4e5bbb77a43e0f1622f579984"];
var prvkeys = ["TAJWsuEQAHfPYSTk9dyqgMZBzJLLdspP8TkyHAGFNyEkPgiEqNyC", "T9wB7cCpgd6yFbL62AYUe8Z5MYezT7cGvZwuCwMmMXcjDbckE5pj"];
var requiredSignatures = 2;

client.cmd('listunspent', function findFunds(err, txs) {
  if (err) return console.log(err);
  // find a valid utxo
  for (var i = 0; i < txs.length; ++i)
  {
    if (txs[i].spendable && txs[i].amount > (amount + 2 * fee))
    {
      console.log("got UTXO for " + txs[i].amount);
      break;
    } 
  }
  if (i == txs.length)
    return console.log("cant find spendable TX")

  // change
  var change = (txs[i].amount - amount - 2 * fee).toFixed(6);

  client.cmd("createmultisig", requiredSignatures, pubkeys, function makeFund(err, multisig) {
    if (err) return console.log(err);
    //console.log(multisig);

    var funding_in = [{"txid" : txs[i].txid,"vout": txs[i].vout}];
    var funding_out = {};
    funding_out[multisig["address"]] = amount + fee;
    funding_out[change_address] = change;
    //console.log(funding_out);

    client.cmd("createrawtransaction", funding_in, funding_out, function createFund(err, rawfundtx) {
      if (err) return console.log(err);
      //console.log("rawtx:",rawfundtx);

      client.cmd("signrawtransaction", rawfundtx, function signFund(err, signedfundtx) {
        if (err) return console.log(err);
        //console.log("signedtx:",signedfundtx) 
        if (!signedfundtx.complete)
          return console.log("funding tx not ready");
        fs.writeFileSync("./funding.hex", signedfundtx.hex);

        client.cmd("decoderawtransaction", signedfundtx.hex, function makeP2sh(err, decodedfundtx) {
          if (err) return console.log(err);
          var fundtxid = decodedfundtx.txid;
          console.log("P2SH addr:", multisig.address);
          //console.log(JSON.stringify(decodedfundtx, undefined, 2));
          // work out the output we're spending in the P2SH (i.e. not the change)
          for (var vout_index = 0; vout_index <  decodedfundtx.vout.length; ++vout_index) {
            // TODO multiple addresses?
            if (multisig["address"] == decodedfundtx.vout[vout_index].scriptPubKey.addresses[0])
              break;
          }

          var p2sh_in = [{"txid": fundtxid, 
                      "vout": vout_index, 
                      "scriptPubKey": decodedfundtx.vout[0].scriptPubKey.hex, // ??
                      "redeemScript": multisig.redeemScript }];
          var p2sh_out = {}
          // data payload...
          if (payload.length) {
            p2sh_out = { "data": payload };
          }

          p2sh_out[return_address] = amount;

          client.cmd('createrawtransaction', p2sh_in, p2sh_out, function createP2sh(err, raw_p2sh) {
            if (err) return console.log(err);
            console.log(raw_p2sh);
            // sign the multisig
            fs.writeFileSync("./p2sh0.hex", raw_p2sh);

            client.cmd('signrawtransaction', raw_p2sh, p2sh_in, [prvkeys[0]], function signP2sh1(err, signed_raw_p2sh) {
              if (err) return console.log(err);
              console.log(signed_raw_p2sh.complete ? "fully signed" : "more sigs required");
              // sign again              
              fs.writeFileSync("./p2sh1.hex", signed_raw_p2sh.hex);

              client.cmd('signrawtransaction', signed_raw_p2sh.hex, p2sh_in, [prvkeys[1]], function signP2sh2(err, signed_raw_p2sh) {
                if (err) return console.log(err);
                console.log(signed_raw_p2sh.complete ? "fully signed" : "more sigs required");
                fs.writeFileSync("./p2sh2.hex", signed_raw_p2sh.hex);
                client.cmd('decoderawtransaction', signed_raw_p2sh.hex, function(err, result) {
                  if (err) return console.log(err);
                  console.log(JSON.stringify(result, undefined, 2));
                });                                

                client.cmd('sendrawtransaction', signedfundtx.hex, function sendFund(err, result) {
                  if (err) return console.log(err);
                  console.log("P2SH fund tx:", result);

                  client.cmd('sendrawtransaction', signed_raw_p2sh.hex, function sendP2sh(err, result) {
                    if (err) return console.log(err);
                    console.log("P2SH spend tx: " + result);
                    console.log("Return addr: " + return_address);
                    console.log("Return amount (net): " + amount);
                  });                                
                });
              });
            });
          });
        });    
      });  
    });
  });
});


