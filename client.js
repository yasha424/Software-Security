const crypto = require('crypto');
const { start } = require('repl');

var headers = new Headers();
headers.append("Content-Type", "application/json");

// var publicKey;

const clientHello = async () => {

    var raw = JSON.stringify({
        "message": "hello world"
    });

    var requestOptions = {
        method: 'POST',
        headers: headers,
        body: raw,
    };

    const response = await fetch("http://localhost:3000/", requestOptions)
    const json = await response.json();
    
    return json.publicKey;
}

const sendPremaster = async (publicKey) => {
    const premaster = crypto.randomBytes(16);
    console.log(premaster.toString('hex'));
    const encryptedPremaster = crypto.publicEncrypt(publicKey, premaster);

    var raw = JSON.stringify({
        "premaster": encryptedPremaster
    });

    var requestOptions = {
        method: 'POST',
        headers: headers,
        body: raw,
    };

    const response = await fetch("http://localhost:3000/premaster", requestOptions)
    const json = await response.json();
    // console.log(json);
    return json.sessionKey;
};

const encryptWithKey = (key, message) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key.data), iv);
    const encryptedMessage = Buffer.concat([cipher.update(message), cipher.final()]);
    return { iv, encryptedMessage };
}

const sendEncryptedMessage = async (iv, encryptedMessage, sessionKey) => {
    const hash = crypto.createHash('sha256');
    hash.update(encryptedMessage);
    const digest = hash.digest('hex');
    console.log('digest:', digest);
    var raw = JSON.stringify({
        "iv": iv,
        "message": encryptedMessage,
        "digest": digest
    });

    var requestOptions = {
        method: 'POST',
        headers: headers,
        body: raw,
    };

    const response = await fetch("http://localhost:3000/send", requestOptions);
    const json = await response.json();
    console.log('Encrypted server response:', Buffer.from(json.encryptedMessage.data).toString('hex'));

    // const { serverIv, message } = json;

    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(sessionKey.data), Buffer.from(json.iv.data));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(json.encryptedMessage.data)), decipher.final()]);
    console.log('Decrypted server response:', decrypted.toString());
};

const main = async () => {
    const publicKey = await clientHello();
    console.log(publicKey);

    const sessionKey = await sendPremaster(publicKey);
    const message = "Hello world!"

    const { iv, encryptedMessage } = encryptWithKey(sessionKey, message.repeat(1));
    console.log('Message:', message);
    console.log('Encrypted message:', encryptedMessage.toString('hex'));
    await sendEncryptedMessage(iv, encryptedMessage, sessionKey);
}

main();

