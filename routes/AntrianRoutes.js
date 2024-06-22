const express = require('express');
const router = express.Router();
const { regisAntrian,mulai_antrian,getAllAntrian,  antrianBerapa,} = require('../controller/antrianController');
const { checkAdminRole, checkSuperAdminRole, isLoggedIn } = require('../middleware/chekin');

router.post('/antrian', regisAntrian);
router.get('/antrian', getAllAntrian);
router.get('/antrian/find/:no_wa', antrianBerapa);
router.post('/antrian/:nomor_antrian',isLoggedIn , mulai_antrian );



module.exports = router;
