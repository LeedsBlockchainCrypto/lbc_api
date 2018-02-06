
var lbc_api = require('bitcoin');

var client = new lbc_api.Client({
  host: 'localhost',
  port: 9936,
  user: 'user',
  pass: 'password',
  timeout: 30000
});


client.getBalance('*', 6, function(err, balance) {
  if (err) console.log(err);
  console.log('Balance: ' + balance);
});

client.getNetworkHashRate(function(err, hashps) {
 if (err) console.log(err);
 console.log('Network Hash Rate: ' + hashps);
});

client.listUnspent(function(err, unspent) {
  if (err) console.log(err);
  console.log('UTXOs: ' + JSON.stringify(unspent[0], undefined, 2));
});
