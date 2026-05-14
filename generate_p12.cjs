const forge = require('node-forge');
const fs = require('fs');

console.log('Generando llaves RSA...');
const keys = forge.pki.rsa.generateKeyPair(2048);

console.log('Creando certificado...');
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

const attrs = [{
  name: 'commonName',
  value: 'Klynn Test Certificate'
}, {
  name: 'countryName',
  value: 'DO'
}, {
  shortName: 'ST',
  value: 'Distrito Nacional'
}, {
  name: 'localityName',
  value: 'Santo Domingo'
}, {
  name: 'organizationName',
  value: 'Klynn SaaS'
}, {
  shortName: 'OU',
  value: 'Testing DGII'
}];
cert.setSubject(attrs);
cert.setIssuer(attrs); // Autofirmado

cert.sign(keys.privateKey, forge.md.sha256.create());

console.log('Empaquetando en formato .p12...');
const password = 'klynn';
const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
  keys.privateKey, 
  [cert], 
  password,
  { generateLocalKeyId: true, friendlyName: 'Klynn Test Cert' }
);

const p12Der = forge.asn1.toDer(p12Asn1).getBytes();

fs.writeFileSync('klynn_test.p12', p12Der, 'binary');
console.log('¡Éxito! Archivo klynn_test.p12 creado con contraseña: ' + password);
