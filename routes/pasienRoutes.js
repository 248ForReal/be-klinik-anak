const express = require('express');
const router = express.Router();
const { editPasien, 
    hapusPasien,
    tukarAntrianPasien, 
    getAllAntrian,
    getPatientCounts,
    exportPasien,
    getFinishedPatientsToday,
    tukarAntrianPasien2,
    getPaseienSelesai,
    searchPatients } = require('../controller/pasienController');


router.put('/pasien/:kode_unik', editPasien);
router.delete('/pasien/:kode_unik', hapusPasien);
router.post('/pasien/update', tukarAntrianPasien);
router.get('/pasien', getAllAntrian);
router.get('/pasien/jumlah', getPatientCounts);
router.get('/pasien/selesai', getFinishedPatientsToday);
router.post('/pasien/export', exportPasien);
router.post('/pasien/selesai', getPaseienSelesai);
router.get('/pasien/search', searchPatients);
router.post('/pasien/tukaran', tukarAntrianPasien2);



module.exports = router;
