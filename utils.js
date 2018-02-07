
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
