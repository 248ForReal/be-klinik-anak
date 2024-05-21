const mongoose = require('mongoose');
const { Schema } = mongoose;

const antrianSchema = new Schema({
  nomor_antrian: { type: Number, required: true },
  waktu_mulai: { type: Date, required: true },
  waktu_selesai: { type: Date, required: true }
});

const jadwalSchema = new Schema({
  nomor_id: { type: Number, required: true },
  tanggal: { type: Date, required: true },
  jam_buka: { type: Date, required: true },
  jam_tutup: { type: Date }, // Tidak required, diisi saat jadwal ditutup
  antrian: [antrianSchema],
  createdAt: { type: Date, default: Date.now }
}, {
  collection: 'jadwal'
});

const Jadwal = mongoose.model('Jadwal', jadwalSchema);

module.exports = Jadwal;
