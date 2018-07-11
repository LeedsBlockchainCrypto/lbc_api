#!/bin/bash

export LBC_USER=az 
export LBC_PASS=password 

lbccoin-cli getreceivedbyaddress "WmBUXNJxwSf7F3zFDtKzxCBjyrhCynqnsG" 0
lbccoin-cli getreceivedbyaddress "WPLihg26D6Rpj1cPzntuigcxXDK6MbNuFS" 0

RECORD=authdeny_record.json

PUB1=0273cb3dd42509b4f872f5d7e44ffa9bdd3c2000c01329bacac7e3ad41bc1f0b17
PUB2=03bf301b47845126b908bffe71d09668e29211daf4e5bbb77a43e0f1622f579984
WIF1=TAJWsuEQAHfPYSTk9dyqgMZBzJLLdspP8TkyHAGFNyEkPgiEqNyC
WIF2=T9wB7cCpgd6yFbL62AYUe8Z5MYezT7cGvZwuCwMmMXcjDbckE5pj

#node 1_fund_multisig.js $RECORD $PUB1 $PUB2  
#node 2_sign_multisig.js $RECORD $WIF1
#node 2_sign_multisig.js $RECORD $WIF2 

# ...

node 4_cancel_multisig.js $RECORD $WIF2