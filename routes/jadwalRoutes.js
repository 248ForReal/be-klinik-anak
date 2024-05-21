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

router.use('/jadwal', checkAdminRole);
router.post('/jadwal', createJadwal, checkAdminRole);
router.get('/jadwal', getAllJadwal);
router.delete('/jadwal/:id', deleteJadwal);
router.put('/jadwal/close/:id', closeJadwal);
router.post('/jadwal/antrian/:id', addAntrian);

module.exports = router;
