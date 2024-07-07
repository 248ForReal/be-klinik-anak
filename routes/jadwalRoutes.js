const express = require('express');
const router = express.Router();
const { checkAdminRole, checkSuperAdminRole, isLoggedIn } = require('../middleware/chekin');
const {
  createJadwal,
  getAllJadwal,
  deleteJadwal,
  closeJadwal
} = require('../controller/jadwalController');

router.post('/jadwal', isLoggedIn, createJadwal);
router.get('/jadwal',  getAllJadwal);
router.delete('/jadwal/:id', isLoggedIn,  deleteJadwal);
router.put('/jadwal/close/:id', isLoggedIn,  closeJadwal);

module.exports = router;
