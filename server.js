const crypto = require('crypto');
const cryptoJS = require('crypto-js');
const express = require('express');
const bodyParser = require('body-parser');

const port = 3000;

const app = express();
app.use(bodyParser.json());

var privateKey;
var publicKey;
var sessionKey;

app.post('/', async (req, res) => {
    keys = await crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem',
            cipher: 'aes-256-cbc',
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
            cipher: 'aes-256-cbc',
            passphrase: 'secret',
        },
    });
    privateKey = keys.privateKey
    publicKey = keys.publicKey

    return res.json({
        message: crypto.randomBytes(64).toString('hex'), 
        publicKey: publicKey,
    }).status(200);
});

app.post('/premaster', (req, res) => {
    const premaster = crypto.privateDecrypt({ key: privateKey, passphrase: 'secret' }, Buffer.from(req.body.premaster.data));

    console.log(premaster.toString('hex'));
    sessionKey = Buffer.concat([crypto.randomBytes(16), premaster], 32);

    res.json({'sessionKey': sessionKey}).status(200);
});

const encryptWithKey = (key, message) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encryptedMessage = Buffer.concat([cipher.update(message), cipher.final()]);
    return { iv, encryptedMessage };
}

app.post('/send', (req, res) => {
    const { iv, message, digest } = req.body;
    const hash = crypto.createHash('sha256');
    hash.update(Buffer.from(message.data));
    const newDigest = hash.digest('hex');
    console.log(digest);
    console.log(newDigest === digest);
    // const hash = crypto.createHash('sha256');
    console.log('Encrypted message:', Buffer.from(message.data).toString('hex'));

    const decipher = crypto.createDecipheriv('aes-256-cbc', sessionKey, Buffer.from(iv.data));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(message.data)), decipher.final()]);

    console.log('Decrypted message:', decrypted.toString());

    const responseMessage = 'Message recieved';
    const encryptedResponseMessage = encryptWithKey(sessionKey, 'Message recieved');

    console.log('Response message:', responseMessage);
    console.log('Encrypted response message:', encryptedResponseMessage.encryptedMessage.toString('hex'));
    res.json(encryptedResponseMessage).status(200);
});


app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});