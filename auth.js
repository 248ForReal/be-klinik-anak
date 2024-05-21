const express = require('express');
const app = express();
const User = require('./model/user'); 
const bcrypt = require('bcrypt');
const respon = require('./respon');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/register', async (req, res) => {
    const { name, role, user, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10); 
        const newUser = new User({ name, role, user, password: hashedPassword }); 
        await newUser.save();
        respon(201, null, 'Pengguna berhasil didaftarkan', res);
    } catch (err) {
        console.error(err);
        respon(500, null, 'Terjadi kesalahan saat mendaftarkan pengguna', res);
    }
});

app.post('/login', async (req, res) => {
    const { user, password } = req.body;
    try {
        const foundUser = await User.findOne({ user });
        if (foundUser) {
            const match = await bcrypt.compare(password, foundUser.password); 
            if (match) {
                req.session.user = foundUser; 
                res.cookie('user', foundUser._id.toString(), { maxAge: 14 * 24 * 60 * 60 * 1000, httpOnly: true }); 
                respon(200, null, 'Login berhasil', res);
            } else {
                respon(401, null, 'Login gagal: pengguna atau kata sandi salah', res);
            }
        } else {
            respon(401, null, 'Login gagal: pengguna atau kata sandi salah', res);
        }
    } catch (err) {
        console.error(err);
        respon(500, null, 'Terjadi kesalahan saat login', res);
    }
});

app.get('/profile', (req, res) => {
    if (req.session.user) {
        const { name, role, user } = req.session.user;
        const userData = { name, role, user };
        respon(200, userData, 'Profil pengguna berhasil ditemukan', res);
    } else {
  
        respon(403, null, 'Anda harus masuk untuk mengakses profil', res);
    }
});


app.get('/logout', (req, res) => {
    req.session.destroy(); 
    res.clearCookie('user'); 
    respon(200, null, 'Logout berhasil', res);
});

const checkAdminRole = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next(); 
    } else {
        respon(403, null, 'Akses ditolak: Anda tidak memiliki izin admin', res);
    }
};


const checkSuperAdminRole = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'SuperAdmin') {
        next(); 
    } else {
        respon(403, null, 'Akses ditolak: Anda tidak memiliki izin SuperAdmin', res);
    }
};


app.get('/admin', checkAdminRole, (req, res) => {
    respon(200, null, 'Anda memiliki izin admin', res);
});

app.get('/superadmin', checkSuperAdminRole, (req, res) => {
    respon(200, null, 'Anda memiliki izin SuperAdmin', res);
});

module.exports = { checkAdminRole, checkSuperAdminRole };
module.exports = app;
