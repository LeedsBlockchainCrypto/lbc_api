'use strict'

// Gets a utxo that cover the TX and the fee...
// TODO This should be able to aggregate multiple utxos
async function get_funds(api, payment, fee) {

  // Get all UTXOs
  const utxos = await api.listUnspent();

  // Find a suitable utxo to use
  for (var i = 0; i < utxos.length; ++i)
  {
    if (utxos[i].spendable && utxos[i].amount >= payment + fee)
    {
      console.log("got UTXO");
      return [utxos[i]];
    } 
  }
  return [];
}

async function send_tx_checked(api, signedrawtx) {
  // check ready
  if (!signedrawtx.complete) {
    console.log("TX not ready");
    return "";
  }
  return /*await*/ api.sendRawTransaction(signedrawtx.hex);
}

module.exports = {

stringToHex: function(str) {
  var hex = '';
  for (var i = 0; i < str.length; ++i) {
    hex += ''+str.charCodeAt(i).toString(16);
  }
  return hex;
},

hexToString: function(hex) {
  var str = '';
  for (var i = 0; i < hex.length; i += 2)
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  return str;
},

basename: function(str) {
  var base = new String(str).substring(str.lastIndexOf('/') + 1); 
  return base;
}

};

// export the async function
module.exports.get_funds = get_funds;
module.exports.send_tx_checked = send_tx_checked;




