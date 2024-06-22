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
const { checkAdminRole, checkSuperAdminRole } = require('../middleware/chekin');


router.put('/pasien/:kode_unik', editPasien,checkAdminRole, checkSuperAdminRole );
router.delete('/pasien/:kode_unik', hapusPasien,checkAdminRole, checkSuperAdminRole );
router.post('/pasien/update', tukarAntrianPasien,checkAdminRole, checkSuperAdminRole );
router.get('/pasien', getAllAntrian,checkAdminRole, checkSuperAdminRole );
router.get('/pasien/jumlah', getPatientCounts,checkAdminRole, checkSuperAdminRole );
router.get('/pasien/selesai', getFinishedPatientsToday,checkAdminRole, checkSuperAdminRole );
router.post('/pasien/export', exportPasien,checkSuperAdminRole );
router.post('/pasien/selesai', getPaseienSelesai,checkSuperAdminRole );
router.get('/pasien/search', searchPatients,checkAdminRole, checkSuperAdminRole );
router.post('/pasien/tukaran', tukarAntrianPasien2,checkAdminRole, checkSuperAdminRole );



module.exports = router;
