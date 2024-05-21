const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const auth = require('./auth'); // Mengimpor rute auth

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware untuk parsing cookies
app.use(cookieParser());

const PORT = process.env.PORT || 3000;
const dbURI = process.env.MONGODB_URI;
const sessionSecretKey = process.env.SESS_SECRET_KEY;

// Opsi konfigurasi untuk koneksi MongoDB
const mongoOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true
};

mongoose.connect(dbURI, mongoOptions);

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'Koneksi MongoDB error:'));
db.once('open', () => {
    console.log('Terhubung ke MongoDB');
});

// Middleware untuk sesi yang terhubung ke MongoDB
app.use(session({
    secret: sessionSecretKey,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: dbURI,
        collectionName: 'sessions',
        ttl: 14 * 24 * 60 * 60 // = 14 hari. Anda bisa mengubahnya sesuai kebutuhan
    }),
    cookie: { secure: false } // Set ke true jika menggunakan HTTPS
}));

// Menggunakan rute auth
app.use('/', auth);

app.get('/', (req, res) => {
    res.send('Selamat datang di aplikasi Express dengan MongoDB!');
});

app.listen(PORT, () => {
    console.log(`Server berjalan di port ${PORT}`);
});
