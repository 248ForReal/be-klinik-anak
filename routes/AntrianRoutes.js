const express = require('express');
const router = express.Router();
const { regisAntrian,mulai_antrian,getAllAntrian,  antrianBerapa,} = require('../controller/antrianController');
const {isLoggedIn} = require('../middleware/chekin');


router.post('/antrian', regisAntrian);
router.get('/antrian', getAllAntrian);
router.get('/antrian/find/:no_wa', antrianBerapa);
router.post('/antrian/:nomor_antrian', mulai_antrian ,isLoggedIn);



module.exports = router;
