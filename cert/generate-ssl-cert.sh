#!/bin/bash
set -x

# variables
SERVER=pi
CORPORATION=Cyan
GROUP=Home
CITY=Miami
STATE=Florida
COUNTRY=US

CERT_AUTH_PASS=`openssl rand -base64 32`
echo $CERT_AUTH_PASS > $SERVER.pwd
CERT_AUTH_PASS=`cat $SERVER.pwd`

# create the certificate authority
openssl \
  req \
  -subj "/CN=$SERVER.ca/OU=$GROUP/O=$CORPORATION/L=$CITY/ST=$STATE/C=$COUNTRY" \
  -new \
  -x509 \
  -passout pass:$CERT_AUTH_PASS \
  -keyout ca-cert.key \
  -out ca-cert.crt \
  -days 36500

# create client private key (used to decrypt the cert we get from the CA)
openssl genrsa -out $SERVER.key

# create the CSR(Certitificate Signing Request)
openssl \
  req \
  -new \
  -nodes \
  -subj "/CN=$SERVER/OU=$GROUP/O=$CORPORATION/L=$CITY/ST=$STATE/C=$COUNTRY" \
  -sha256 \
  -extensions v3_req \
  -reqexts SAN \
  -key $SERVER.key \
  -out $SERVER.csr \
  -config <(cat /etc/ssl/openssl.cnf <(printf "[SAN]\nsubjectAltName=DNS:$SERVER")) \
  -days 36500

# sign the certificate with the certificate authority
openssl \
  x509 \
  -req \
  -days 36500 \
  -in $SERVER.csr \
  -CA ca-cert.crt \
  -CAkey ca-cert.key \
  -CAcreateserial \
  -out $SERVER.crt \
  -extfile <(cat /etc/ssl/openssl.cnf <(printf "[SAN]\nsubjectAltName=DNS:$SERVER")) \
  -extensions SAN \
  -passin pass:$CERT_AUTH_PASS
