
// Ensure youve defined these:
// export LBC_USER=<user>
// export LBC_PASS=<pass>

var lbc_api = require('bitcoin');

var client = new lbc_api.Client({
  host: 'localhost',
  port: 9936,
  user: process.env.LBC_USER,
  pass: process.env.LBC_PASS,
  timeout: 30000
});


// all addrs (*) with >=6 confs 
client.getBalance('*', 6, function(err, balance) {
  if (err) console.log(err);
  console.log('Balance: ' + balance);
});


client.listUnspent(function(err, unspent) {
  if (err) console.log(err);
  console.log('UTXOs: ' + JSON.stringify(unspent[0], undefined, 2));
});
