const respon = require('../respon');


const isLoggedIn = (req, res, next) => {
    if (req.session.user) {
      next();
    } else {
      respon(401, null, 'Anda harus masuk untuk mengakses ini', res);
    }
  };

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

module.exports = { checkAdminRole, checkSuperAdminRole };
