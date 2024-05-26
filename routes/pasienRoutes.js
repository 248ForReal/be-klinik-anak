const express = require('express');
const router = express.Router();
const { editPasien, hapusPasien } = require('../controller/pasienController');

// Route untuk mengedit data pasien
router.put('/pasien/:kode_unik', editPasien);

// Route untuk menghapus data pasien
router.delete('/pasien/:kode_unik', hapusPasien);

module.exports = router;
