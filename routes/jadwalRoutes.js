const express = require('express');
const router = express.Router();
const { checkAdminRole, checkSuperAdminRole } = require('../middleware/chekin');
const {
  createJadwal,
  getAllJadwal,
  deleteJadwal,
  closeJadwal,
  addAntrian
} = require('../controller/jadwalController');


router.post('/jadwal', createJadwal,checkAdminRole, checkSuperAdminRole);
router.get('/jadwal', getAllJadwal,checkAdminRole, checkSuperAdminRole);
router.delete('/jadwal/:id', deleteJadwal,checkAdminRole, checkSuperAdminRole);
router.put('/jadwal/close/:id', closeJadwal,checkAdminRole, checkSuperAdminRole);
router.post('/jadwal/antrian/:id', addAntrian,checkAdminRole, checkSuperAdminRole);

module.exports = router;
