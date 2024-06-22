const express = require('express');
const router = express.Router();
const {
    editPasien, 
    hapusPasien,
    tukarAntrianPasien, 
    getAllAntrian,
    getPatientCounts,
    exportPasien,
    getFinishedPatientsToday,
    tukarAntrianPasien2,
    getPaseienSelesai,
    searchPatients
} = require('../controller/pasienController');
const { checkAdminRole, checkSuperAdminRole, isLoggedIn } = require('../middleware/chekin');

router.put('/pasien/:kode_unik', isLoggedIn,  editPasien);
router.delete('/pasien/:kode_unik', isLoggedIn, hapusPasien);
router.post('/pasien/update', isLoggedIn, tukarAntrianPasien);
router.get('/pasien', isLoggedIn,  getAllAntrian);
router.get('/pasien/jumlah', isLoggedIn,  getPatientCounts);
router.get('/pasien/selesai', isLoggedIn, getFinishedPatientsToday);
router.post('/pasien/export', isLoggedIn, exportPasien);
router.post('/pasien/selesai', isLoggedIn, getPaseienSelesai);
router.get('/pasien/search', isLoggedIn,searchPatients);
router.post('/pasien/tukaran', isLoggedIn,  tukarAntrianPasien2);

module.exports = router;
