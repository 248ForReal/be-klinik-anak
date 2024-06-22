const express = require('express');
const User = require('./model/user'); 
const bcrypt = require('bcrypt');
const respon = require('./respon');
const app = express();

const loggedInUsers = new Set();

app.post('/register', async (req, res) => {
    const { name, role, username, password } = req.body;
    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return respon(409, null, 'Username sudah digunakan', res);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, role, username, password: hashedPassword });
        await newUser.save();
        respon(201, null, 'Pengguna berhasil didaftarkan', res);
    } catch (err) {
        console.error(err);
        respon(500, null, 'Terjadi kesalahan saat mendaftarkan pengguna', res);
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        if (loggedInUsers.has(username)) {
            return respon(403, null, 'Pengguna sudah masuk', res);
        }

        const foundUser = await User.findOne({ username }).lean();
        if (foundUser) {
            const match = await bcrypt.compare(password, foundUser.password);
            if (match) {
                req.session.user = foundUser;
                res.cookie('user', foundUser._id.toString(), { maxAge: 14 * 24 * 60 * 60 * 1000, httpOnly: true });
                loggedInUsers.add(username);

                const userResponse = {
                    name: foundUser.name,
                    role: foundUser.role,
                    username: foundUser.username
                };

                return respon(200, userResponse, 'Login berhasil', res);
            } else {
                return respon(401, null, 'Login gagal: username atau kata sandi salah', res);
            }
        } else {
            return respon(401, null, 'Login gagal: username atau kata sandi salah', res);
        }
    } catch (err) {
        console.error(err);
        return respon(500, null, 'Terjadi kesalahan saat login', res);
    }
});

app.get('/profile', (req, res) => {
    if (req.session.user) {
        const { name, role, username } = req.session.user;
        const userData = { name, role, username };
        return respon(200, userData, 'Profil pengguna berhasil ditemukan', res);
    } else {
        return respon(403, null, 'Anda harus masuk untuk mengakses profil', res);
    }
});

app.get('/logout', (req, res) => {
    if (req.session.user) {
        loggedInUsers.delete(req.session.user.username);
        req.session.destroy((err) => {
            if (err) {
                console.error(err);
                return respon(500, null, 'Terjadi kesalahan saat logout', res);
            }

            res.clearCookie('user');
            return respon(200, null, 'Logout berhasil', res);
        });
    } else {
        return respon(400, null, 'Tidak ada pengguna yang masuk', res);
    }
});

module.exports = app;


module.exports = app;
