const uuid = require('uuid');
const express = require('express');
const onFinished = require('on-finished');
const bodyParser = require('body-parser');
const path = require('path');
const port = 3000;
const fs = require('fs');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const SESSION_KEY = 'Authorization';
const URL = 'https://dev-d9q43cd8.us.auth0.com/';
const AUDIENCE_URL = 'https://dev-d9q43cd8.us.auth0.com/api/v2/';
const CLIENT_ID = 'SBAG5My1TL0hePd9MvWEdVkGJkM84For';
const CLIENT_SECRET = 'SHcdsMA2WEkNmfEIwWEdw8NTy4IMHXxy2wD-8MlH6-eNHa0XD3LR1KuEbYPicX96';

app.get('/', async (req, res) => {
    const access_token = req.header('Authorization');
    if (!access_token) {
        return res.sendFile(path.join(__dirname + '/index.html'));
    }

    decoded = jwt.decode(access_token);
    
    if (decoded) {
        const currentTime = Date.now() / 1000;
        if (decoded.exp > currentTime) {
            const response = await axios.get(`${AUDIENCE_URL}users/${decoded.sub}`, {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            })
            return res.json({
                username: response.data.nickname,
                logout: 'http://localhost:3000/logout',
                expires: decoded.exp
            })
        }
    }
    res.sendFile(path.join(__dirname + '/index.html'));
})

app.get('/logout', (req, res) => {
    sessions.destroy(req, res);
    res.redirect('/');
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const response = await axios.post(`${URL}oauth/token`, {
            grant_type: 'http://auth0.com/oauth/grant-type/password-realm',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            audience: AUDIENCE_URL,
            scope: 'offline_access',
            realm: 'Username-Password-Authentication',
            username: username,
            password: password
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        const data = response.data;
        res.status(201).send({ 
            access_token: data.access_token, 
            refresh_token: data.refresh_token 
        });
    } catch (err) {
        res.status(403).send(err.response.data.error_description);
    }
});

app.post('/api/refresh', async (req, res) => {
    console.log(req.body);

    try {
        const response = await axios.post(`${URL}oauth/token/`, {
            grant_type: 'refresh_token',
            audience: AUDIENCE_URL,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            refresh_token: req.body.refresh_token,
            scope: 'offline_access',
            realm: 'Username-Password-Authentication',
        })
        return res.json({ access_token: response.data.access_token});
    } catch (err) {
        return res.status(401).send(err.response.data.error_description);
    }
});

app.get('/create-user', (req, res) => {
    return res.sendFile(path.join(__dirname + '/create-user.html'));
});

app.post('/api/create-user', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data } = await axios.post(`${URL}oauth/token`, {
            grant_type: 'client_credentials',
            audience: AUDIENCE_URL,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        const response = await axios.post(`${AUDIENCE_URL}users`, {
            email: email,
            password: password,
            connection: 'Username-Password-Authentication'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${data.access_token}`
            }
        });

        if (response.data) {
            res.status(201).json({ message: 'User created' });
        } else {
            res.status(401);
        }
    } catch (error) {
        res.status(401).json({ error: error.response.data });
    }
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
