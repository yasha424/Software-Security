const crypto = require('crypto');

const clientInit = () => {
    return crypto.randomBytes(64).toString('hex');
};

const serverResponse = () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    return {
        message: crypto.randomBytes(64).toString('hex'), 
        publicKey: publicKey, 
        privateKey: privateKey
    };
}

const sendPremaster = (key) => {
    const premasterSecret = crypto.randomBytes(64);
    return crypto.publicEncrypt(key, premasterSecret);
}

const generateSessionKey = (premaster, key) => {
    const premasterSecret = crypto.privateDecrypt(key, premaster);
    return crypto.randomBytes(32);
}

const encryptWithKey = (key, message) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encryptedMessage = Buffer.concat([cipher.update(message), cipher.final()]);
    return { iv, encryptedMessage };
}

const decryptWithKey = (key, iv, encryptedMessage) => {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(encryptedMessage), decipher.final()]);
    return decrypted.toString();
}

// Ініціювання клієнтом рукостискання
const clientMessage = clientInit();
console.log('Повідомлення клієнта:', clientMessage);

// Відповідь сервера
const response = serverResponse();
console.log('Відповідь сервера:', response.message);

// Клієнт надсилає секрет premaster
const encryptedPremaster = sendPremaster(response.publicKey);
console.log('Зашифрований premaster:', encryptedPremaster.toString('hex'));

// Клієнт і сервер генерують ключі сеансу
const sessionKey = generateSessionKey(encryptedPremaster, response.privateKey);
console.log('Ключ сеансу:', sessionKey.toString('hex'));

// Клієнт та сервер надсилають повідомлення "готовий"
const clientReady = encryptWithKey(sessionKey, 'Готовий');
const serverReady = encryptWithKey(sessionKey, 'Готовий');
console.log('Повідомлення клієнта про готовність:', clientReady.encryptedMessage.toString('hex'));
console.log('Повідомлення сервера про готовність:', serverReady.encryptedMessage.toString('hex'));


const msg = 'Hello world!';
const { iv, encryptedMessage } = encryptWithKey(sessionKey, msg);
console.log('Зашифроване повідомлення:', encryptedMessage.toString('hex'));

const decryptedMsg = decryptWithKey(sessionKey, iv, encryptedMessage);
console.log('Розшифроване повідомлення', decryptedMsg);

// Завершення рукостискання