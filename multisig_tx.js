
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

  //console.log(txs[i]);
  amount = 0.1;
  fee = 0.01

  client.cmd("createmultisig", requiredSignatures, pubkeys, function(err, multisig) {
    if (err) return console.log(err);
    console.log(multisig);

    funding_in = [{"txid" : txs[i].txid,"vout": txs[i].vout}];
    funding_out = {};
    funding_out[multisig["address"]] = amount;
    //console.log(funding_out);
    client.cmd("createrawtransaction", funding_in, funding_out, function(err, rawfundtx) {
      if (err) return console.log(err);
      //console.log("rawtx:",rawfundtx);
      client.cmd("signrawtransaction", rawfundtx, function(err, signedfundtx) {
        if (err) return console.log(err);
        //console.log("signedtx:",signedfundtx) 
        if (!signedfundtx.complete)
          return console.log("funding tx not ready");
        client.cmd("decoderawtransaction", signedfundtx.hex, function(err, decodedfundtx) {
          if (err) return console.log(err);
          fundtxid = decodedfundtx.txid;
          //console.log(decodedfundtx.vout[0].scriptPubKey.hex)

          p2sh_in = [{"txid":fundtxid, 
                       "vout":1,
                       "scriptPubKey": decodedfundtx.vout[0].scriptPubKey.hex, // ??
                       "redeemScript": multisig.redeemScript }];
          p2sh_out = { "YkRvYkqkbrEC8SBKWbqvtcySPCtZP4EVur": 0.01 }
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


// Funding tx created manually (for now)
//var txid = "1d34fe15a84b2584d4ae41ae43ead853ced0a5caeb60203c3ed4835dfec1f7a7"

return;

// 02000000028ff594650bf1aa957b3ff054b16a1d9d7a80580599d016f206a019d38889c2c2010000006a47304402201fb0f4d72022a8bcf7d931f05cfa97b7333c4f32d4a8265b2f7f4a7c74892d870220244ae4542b8eeea03e8cacb164fdfd6de55c1e61d44851e356ecd304928085b001210203514119ec30aec7f087f223f9c8e9374597773aa9f0a2ffc238e89b935c5bbbfeffffffbf2c84f20ffde81160c5b25ca6143144f303d87c77e11f78ce23be9ecc9819c5010000006a4730440220109d59a6328ac3fd01305372ddc7577f261449afef88e9f50f291ec2417b054b02202955395c12366d5aacfe24651ad70ba7552a559e9760002638809b9b8581df8d01210358b492e2b79f251db9711da6836c1dc81f2493e6e9dc3579784e140d793f3fd7feffffff02e3be6601000000001976a914226fdf5fbc7a2e04c212e77a502126dbe59445a988ac00e1f5050000000017
// a914a48148283179295aa23e3060fed74615863ec38987da190000

//./bitcoind createrawtransaction '
// [
//   {"txid":"1d34fe15a84b2584d4ae41ae43ead853ced0a5caeb60203c3ed4835dfec1f7a7",
//     "vout":0,
//     "scriptPubKey":"a914f815b036d9bbbce5e9f2a00abd1bf3dc91e9551087",
//     "redeemScript":"52410491bba2510912a5bd37da1fb5b1673010e43d2c6d812c514e91bfa9f2eb129e1c183329db55bd868e209aac2fbc02cb33d98fe74bf23f0c235d6126b1d8334f864104865c40293a680cb9c020e7b1e106d8c1916d3cef99aa431a56d253e69256dac09ef122b1a986818a7cb624532f062c1d1f8722084861c5c3291ccffef4ec687441048d2455d2403e08708fc1f556002f1b6cd83f992d085097f9974ab08a28838f07896fbab08f39495e15fa6fad6edbfb1e754e35fa1c7844c41f322a1863d4621353ae"
//   }
// ]
// {3"1GtpSrGhRGY5kkrNz4RykoqRQoJuG2L6DS":0.01}'
rawp2sh = [ { "txid":"1d34fe15a84b2584d4ae41ae43ead853ced0a5caeb60203c3ed4835dfec1f7a7",
              "vout": 0,
              "scriptPubKey": "a914a48148283179295aa23e3060fed74615863ec38987",
              "redeemScript": redeemScript } ];

//              "scriptPubKey":"a914 f815b036d9bbbce5e9f2a00abd1bf3dc91e95510 87",
receive = { "Yd3LUny81ZLrRuouZCHC9mVePbYAQBfUaJ": 0.01 }

client.cmd('createrawtransaction', rawp2sh, receive, function(err, rawtx) {
  if (err) return console.log(err);
  console.log(rawtx);
  client.cmd('decoderawtransaction', rawtx, function(err, decoded) {
    if (err) return console.log(err);
    console.log(JSON.stringify(decoded, undefined, 2));
    client.cmd('signrawtransaction', rawtx, rawp2sh, [prvkeys[0]], function(err, signedrawtx) {
      if (err) return console.log(err);
      console.log(signedrawtx);
      if (!signedrawtx.complete)
        return console.log("funding tx not ready");
      client.cmd("decoderawtransaction", signedrawtx.hex, function(err, x) {
        if (err) return console.log(err);
        console.log(x);
      }); 
    });
  });
});

// From https://gist.github.com/gavinandresen/3966071

// # Raw transaction API example work-through
// # Send coins to a 2-of-3 multisig, then spend them.
// #
// # For this example, I'm using these three keypairs (public/private)
// # 0491bba2510912a5bd37da1fb5b1673010e43d2c6d812c514e91bfa9f2eb129e1c183329db55bd868e209aac2fbc02cb33d98fe74bf23f0c235d6126b1d8334f86 / 5JaTXbAUmfPYZFRwrYaALK48fN6sFJp4rHqq2QSXs8ucfpE4yQU
// # 04865c40293a680cb9c020e7b1e106d8c1916d3cef99aa431a56d253e69256dac09ef122b1a986818a7cb624532f062c1d1f8722084861c5c3291ccffef4ec6874 / 5Jb7fCeh1Wtm4yBBg3q3XbT6B525i17kVhy3vMC9AqfR6FH2qGk
// # 048d2455d2403e08708fc1f556002f1b6cd83f992d085097f9974ab08a28838f07896fbab08f39495e15fa6fad6edbfb1e754e35fa1c7844c41f322a1863d46213 / 5JFjmGo5Fww9p8gvx48qBYDJNAzR9pmH5S389axMtDyPT8ddqmw

// # First: combine the three keys into a multisig address:
// ./bitcoind createmultisig 2 '["0491bba2510912a5bd37da1fb5b1673010e43d2c6d812c514e91bfa9f2eb129e1c183329db55bd868e209aac2fbc02cb33d98fe74bf23f0c235d6126b1d8334f86","04865c40293a680cb9c020e7b1e106d8c1916d3cef99aa431a56d253e69256dac09ef122b1a986818a7cb624532f062c1d1f8722084861c5c3291ccffef4ec6874","048d2455d2403e08708fc1f556002f1b6cd83f992d085097f9974ab08a28838f07896fbab08f39495e15fa6fad6edbfb1e754e35fa1c7844c41f322a1863d46213"]'

// {
//     "address" : "3QJmV3qfvL9SuYo34YihAf3sRCW3qSinyC",
//     "redeemScript" : "52410491bba2510912a5bd37da1fb5b1673010e43d2c6d812c514e91bfa9f2eb129e1c183329db55bd868e209aac2fbc02cb33d98fe74bf23f0c235d6126b1d8334f864104865c40293a680cb9c020e7b1e106d8c1916d3cef99aa431a56d253e69256dac09ef122b1a986818a7cb624532f062c1d1f8722084861c5c3291ccffef4ec687441048d2455d2403e08708fc1f556002f1b6cd83f992d085097f9974ab08a28838f07896fbab08f39495e15fa6fad6edbfb1e754e35fa1c7844c41f322a1863d4621353ae"
// }

// # Next, create a transaction to send funds into that multisig. Transaction d6f72... is
// # an unspent transaction in my wallet (which I got from the 'listunspent' RPC call):
// ./bitcoind createrawtransaction '[{"txid" : "d6f72aab8ff86ff6289842a0424319bf2ddba85dc7c52757912297f948286389","vout":0}]' '{"3QJmV3qfvL9SuYo34YihAf3sRCW3qSinyC":0.01}'

// 010000000189632848f99722915727c5c75da8db2dbf194342a0429828f66ff88fab2af7d60000000000ffffffff0140420f000000000017a914f815b036d9bbbce5e9f2a00abd1bf3dc91e955108700000000

// # ... and sign it:
// ./bitcoind signrawtransaction 010000000189632848f99722915727c5c75da8db2dbf194342a0429828f66ff88fab2af7d60000000000ffffffff0140420f000000000017a914f815b036d9bbbce5e9f2a00abd1bf3dc91e955108700000000

// {
//     "hex" : "010000000189632848f99722915727c5c75da8db2dbf194342a0429828f66ff88fab2af7d6000000008b483045022100abbc8a73fe2054480bda3f3281da2d0c51e2841391abd4c09f4f908a2034c18d02205bc9e4d68eafb918f3e9662338647a4419c0de1a650ab8983f1d216e2a31d8e30141046f55d7adeff6011c7eac294fe540c57830be80e9355c83869c9260a4b8bf4767a66bacbd70b804dc63d5beeb14180292ad7f3b083372b1d02d7a37dd97ff5c9effffffff0140420f000000000017a914f815b036d9bbbce5e9f2a00abd1bf3dc91e955108700000000",
//     "complete" : true
// }

// # Now, create a transaction that will spend that multisig transaction. First, I need the txid
// # of the transaction I just created, so:
// ./bitcoind decoderawtransaction 010000000189632848f99722915727c5c75da8db2dbf194342a0429828f66ff88fab2af7d6000000008b483045022100abbc8a73fe2054480bda3f3281da2d0c51e2841391abd4c09f4f908a2034c18d02205bc9e4d68eafb918f3e9662338647a4419c0de1a650ab8983f1d216e2a31d8e30141046f55d7adeff6011c7eac294fe540c57830be80e9355c83869c9260a4b8bf4767a66bacbd70b804dc63d5beeb14180292ad7f3b083372b1d02d7a37dd97ff5c9effffffff0140420f000000000017a914f815b036d9bbbce5e9f2a00abd1bf3dc91e955108700000000

// {
//     "txid" : "3c9018e8d5615c306d72397f8f5eef44308c98fb576a88e030c25456b4f3a7ac",
//     ... etc, rest omitted to make this shorter
// }

// # Create the spend-from-multisig transaction. Since the fund-the-multisig transaction
// # hasn't been sent yet, I need to give txid, scriptPubKey and redeemScript:
// ./bitcoind createrawtransaction '[{"txid":"3c9018e8d5615c306d72397f8f5eef44308c98fb576a88e030c25456b4f3a7ac","vout":0,"scriptPubKey":"a914f815b036d9bbbce5e9f2a00abd1bf3dc91e9551087","redeemScript":"52410491bba2510912a5bd37da1fb5b1673010e43d2c6d812c514e91bfa9f2eb129e1c183329db55bd868e209aac2fbc02cb33d98fe74bf23f0c235d6126b1d8334f864104865c40293a680cb9c020e7b1e106d8c1916d3cef99aa431a56d253e69256dac09ef122b1a986818a7cb624532f062c1d1f8722084861c5c3291ccffef4ec687441048d2455d2403e08708fc1f556002f1b6cd83f992d085097f9974ab08a28838f07896fbab08f39495e15fa6fad6edbfb1e754e35fa1c7844c41f322a1863d4621353ae"}]' '{"1GtpSrGhRGY5kkrNz4RykoqRQoJuG2L6DS":0.01}'

// 0100000001aca7f3b45654c230e0886a57fb988c3044ef5e8f7f39726d305c61d5e818903c0000000000ffffffff0140420f00000000001976a914ae56b4db13554d321c402db3961187aed1bbed5b88ac00000000

// # ... Now I can partially sign it using one private key:
// ./bitcoind signrawtransaction 
// '0100000001aca7f3b45654c230e0886a57fb988c3044ef5e8f7f39726d305c61d5e818903c0000000000ffffffff0140420f00000000001976a914ae56b4db13554d321c402db3961187aed1bbed5b88ac00000000' 
// '[{"txid":"3c9018e8d5615c306d72397f8f5eef44308c98fb576a88e030c25456b4f3a7ac","vout":0,"scriptPubKey":"a914f815b036d9bbbce5e9f2a00abd1bf3dc91e9551087","redeemScript":"52410491bba2510912a5bd37da1fb5b1673010e43d2c6d812c514e91bfa9f2eb129e1c183329db55bd868e209aac2fbc02cb33d98fe74bf23f0c235d6126b1d8334f864104865c40293a680cb9c020e7b1e106d8c1916d3cef99aa431a56d253e69256dac09ef122b1a986818a7cb624532f062c1d1f8722084861c5c3291ccffef4ec687441048d2455d2403e08708fc1f556002f1b6cd83f992d085097f9974ab08a28838f07896fbab08f39495e15fa6fad6edbfb1e754e35fa1c7844c41f322a1863d4621353ae"}]' '["5JaTXbAUmfPYZFRwrYaALK48fN6sFJp4rHqq2QSXs8ucfpE4yQU"]'

// {
//     "hex" : "0100000001aca7f3b45654c230e0886a57fb988c3044ef5e8f7f39726d305c61d5e818903c00000000fd15010048304502200187af928e9d155c4b1ac9c1c9118153239aba76774f775d7c1f9c3e106ff33c0221008822b0f658edec22274d0b6ae9de10ebf2da06b1bbdaaba4e50eb078f39e3d78014cc952410491bba2510912a5bd37da1fb5b1673010e43d2c6d812c514e91bfa9f2eb129e1c183329db55bd868e209aac2fbc02cb33d98fe74bf23f0c235d6126b1d8334f864104865c40293a680cb9c020e7b1e106d8c1916d3cef99aa431a56d253e69256dac09ef122b1a986818a7cb624532f062c1d1f8722084861c5c3291ccffef4ec687441048d2455d2403e08708fc1f556002f1b6cd83f992d085097f9974ab08a28838f07896fbab08f39495e15fa6fad6edbfb1e754e35fa1c7844c41f322a1863d4621353aeffffffff0140420f00000000001976a914ae56b4db13554d321c402db3961187aed1bbed5b88ac00000000",
//     "complete" : false
// }

// # ... and then take the "hex" from that and complete the 2-of-3 signatures using one of
// # the other private keys (note the "hex" result getting longer):
// ./bitcoind signrawtransaction '0100000001aca7f3b45654c230e0886a57fb988c3044ef5e8f7f39726d305c61d5e818903c00000000fd15010048304502200187af928e9d155c4b1ac9c1c9118153239aba76774f775d7c1f9c3e106ff33c0221008822b0f658edec22274d0b6ae9de10ebf2da06b1bbdaaba4e50eb078f39e3d78014cc952410491bba2510912a5bd37da1fb5b1673010e43d2c6d812c514e91bfa9f2eb129e1c183329db55bd868e209aac2fbc02cb33d98fe74bf23f0c235d6126b1d8334f864104865c40293a680cb9c020e7b1e106d8c1916d3cef99aa431a56d253e69256dac09ef122b1a986818a7cb624532f062c1d1f8722084861c5c3291ccffef4ec687441048d2455d2403e08708fc1f556002f1b6cd83f992d085097f9974ab08a28838f07896fbab08f39495e15fa6fad6edbfb1e754e35fa1c7844c41f322a1863d4621353aeffffffff0140420f00000000001976a914ae56b4db13554d321c402db3961187aed1bbed5b88ac00000000' '[{"txid":"3c9018e8d5615c306d72397f8f5eef44308c98fb576a88e030c25456b4f3a7ac","vout":0,"scriptPubKey":"a914f815b036d9bbbce5e9f2a00abd1bf3dc91e9551087","redeemScript":"52410491bba2510912a5bd37da1fb5b1673010e43d2c6d812c514e91bfa9f2eb129e1c183329db55bd868e209aac2fbc02cb33d98fe74bf23f0c235d6126b1d8334f864104865c40293a680cb9c020e7b1e106d8c1916d3cef99aa431a56d253e69256dac09ef122b1a986818a7cb624532f062c1d1f8722084861c5c3291ccffef4ec687441048d2455d2403e08708fc1f556002f1b6cd83f992d085097f9974ab08a28838f07896fbab08f39495e15fa6fad6edbfb1e754e35fa1c7844c41f322a1863d4621353ae"}]' '["5JFjmGo5Fww9p8gvx48qBYDJNAzR9pmH5S389axMtDyPT8ddqmw"]'

// {
//     "hex" : "0100000001aca7f3b45654c230e0886a57fb988c3044ef5e8f7f39726d305c61d5e818903c00000000fd5d010048304502200187af928e9d155c4b1ac9c1c9118153239aba76774f775d7c1f9c3e106ff33c0221008822b0f658edec22274d0b6ae9de10ebf2da06b1bbdaaba4e50eb078f39e3d78014730440220795f0f4f5941a77ae032ecb9e33753788d7eb5cb0c78d805575d6b00a1d9bfed02203e1f4ad9332d1416ae01e27038e945bc9db59c732728a383a6f1ed2fb99da7a4014cc952410491bba2510912a5bd37da1fb5b1673010e43d2c6d812c514e91bfa9f2eb129e1c183329db55bd868e209aac2fbc02cb33d98fe74bf23f0c235d6126b1d8334f864104865c40293a680cb9c020e7b1e106d8c1916d3cef99aa431a56d253e69256dac09ef122b1a986818a7cb624532f062c1d1f8722084861c5c3291ccffef4ec687441048d2455d2403e08708fc1f556002f1b6cd83f992d085097f9974ab08a28838f07896fbab08f39495e15fa6fad6edbfb1e754e35fa1c7844c41f322a1863d4621353aeffffffff0140420f00000000001976a914ae56b4db13554d321c402db3961187aed1bbed5b88ac00000000",
//     "complete" : true
// }

// # And I can send the funding and spending transactions:
// ./bitcoind sendrawtransaction 010000000189632848f99722915727c5c75da8db2dbf194342a0429828f66ff88fab2af7d6000000008b483045022100abbc8a73fe2054480bda3f3281da2d0c51e2841391abd4c09f4f908a2034c18d02205bc9e4d68eafb918f3e9662338647a4419c0de1a650ab8983f1d216e2a31d8e30141046f55d7adeff6011c7eac294fe540c57830be80e9355c83869c9260a4b8bf4767a66bacbd70b804dc63d5beeb14180292ad7f3b083372b1d02d7a37dd97ff5c9effffffff0140420f000000000017a914f815b036d9bbbce5e9f2a00abd1bf3dc91e955108700000000

// 3c9018e8d5615c306d72397f8f5eef44308c98fb576a88e030c25456b4f3a7ac

// ./bitcoind sendrawtransaction 0100000001aca7f3b45654c230e0886a57fb988c3044ef5e8f7f39726d305c61d5e818903c00000000fd5d010048304502200187af928e9d155c4b1ac9c1c9118153239aba76774f775d7c1f9c3e106ff33c0221008822b0f658edec22274d0b6ae9de10ebf2da06b1bbdaaba4e50eb078f39e3d78014730440220795f0f4f5941a77ae032ecb9e33753788d7eb5cb0c78d805575d6b00a1d9bfed02203e1f4ad9332d1416ae01e27038e945bc9db59c732728a383a6f1ed2fb99da7a4014cc952410491bba2510912a5bd37da1fb5b1673010e43d2c6d812c514e91bfa9f2eb129e1c183329db55bd868e209aac2fbc02cb33d98fe74bf23f0c235d6126b1d8334f864104865c40293a680cb9c020e7b1e106d8c1916d3cef99aa431a56d253e69256dac09ef122b1a986818a7cb624532f062c1d1f8722084861c5c3291ccffef4ec687441048d2455d2403e08708fc1f556002f1b6cd83f992d085097f9974ab08a28838f07896fbab08f39495e15fa6fad6edbfb1e754e35fa1c7844c41f322a1863d4621353aeffffffff0140420f00000000001976a914ae56b4db13554d321c402db3961187aed1bbed5b88ac00000000

// 837dea37ddc8b1e3ce646f1a656e79bbd8cc7f558ac56a169626d649ebe2a3ba

// # You can see these transactions at:
// # http://blockchain.info/address/3QJmV3qfvL9SuYo34YihAf3sRCW3qSinyC