# lbc_api: lbccoind node.js wrapper

Interacting with your local lbccoin node to, e.g.:
- Interrogate the LBCcoin blockchain
- automate transactions
- Create and execute multisig and/or data transactions

### Prerequisites

You have lbccoind or lbccoin-qt running and you've enabled JSON-RPC (on localhost at least). Set the env vars
```
$ export LBC_USER=<user>
$ export LBC_PASS=<pass>
```
with the username/password you specified in `lbccoin.conf`.

### Dependencies:
```
$ npm install bitcoin sha256
```
See [node-bitcoin](https://github.com/freewil/node-bitcoin)

### Testing 
First try with:
```
$ curl -u $LBC_USER:$LBC_PASS --data-binary '{"jsonrpc": "1.0", "id":"curltest", "method": "getbalance", "params": [] }' -H 'content-type: text/plain;' http://127.0.0.1:9936/
```
which should return something like 
```
{"result":826.29407591,"error":null,"id":"curltest"}
```
if you've set up JSON-RPC and got the credentials right. If you get an error, likely JSON-RPC is not enabled in `lbccoin.conf`, if you get nothing back likely user/pass is wrong.

Then run
```
$ nodejs test.js
```
# Data Transactions
These are 'OP_RETURN' transactions that store up to 80 bytes of data in the blockchain. In the example the data payload is the name of a document and its hash (SHA256). In other words you can publically register posession of a document (e.g. a patent, business plan, etc) *without revealing the content*: 
<pre>
$ nodejs data_tx.js Patent.pdf
File: Patent.doc
SHA-256: <b>e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</b>
got UTXO
change address: YTbgsne6KHyhHg2cdYrCtwrd18hEUhwpKa
got raw tx
signed raw tx
Recorded in TX: 84fdac81cd7e7797df831bb55a1b0a9b8d6f0174ea13444e61e7682bb8ddae3f
</pre>
The only charge for this is the transaction fee (currently hard-coded to 0.01LBC), any change is returned to you. 

If you make a note of the transaction id and keep an exact copy of the document, at some future point you can hash the document
<pre>
$ sha256sum Patent.pdf
<b>e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</b>  Patent.doc
</pre>
then query the blockchain:
<pre>
$ nodejs query_data_tx.js 84fdac81cd7e7797df831bb55a1b0a9b8d6f0174ea13444e61e7682bb8ddae3f
Patent.pdf SHA256:<b>e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</b>
Registered on Wed Feb 07 2018 14:02:28 GMT+0000 (GMT)
Mined on Wed Feb 07 2018 14:08:07 GMT+0000 (GMT)
Confirmations:1
</pre>
and thus prove you had the document all the time. 

There are commercial sites that provide this service, e.g. [Proof of Existence](https://poex.io/) which uses bitcoin.

