# lbc_api - node.js api to lbccoind

Interacting with your local lbccoin node to, e.g.:
- Interrogate the LBCcoin blockchain
- automate transactions
- Create and execute multisig and/or data transactions

Ensure you have lbccoind or lbccoin-qt running

### Dependencies:
```
npm install bitcoin
```
See [node-bitcoin](https://github.com/freewil/node-bitcoin)

### Testing 
First try with:
```
curl -u user:password --data-binary '{"jsonrpc": "1.0", "id":"curltest", "method": "getbalance", "params": [] }' -H 'content-type: text/plain;' http://127.0.0.1:9936/
```
which should return something like 

{"result":826.29407591,"error":null,"id":"curltest"}

if you've set up JSON-RPC and got the credentials right. If you get an error, likely JSON-RPC is not enabled in lbccoind.conf, if you get nothing back likely user/pass is wrong.

Then 

```
nodejs test.js
```


