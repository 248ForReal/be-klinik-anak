const mongoose = require('mongoose');
const { Schema } = mongoose;
const moment = require('moment-timezone');

const antrianSchema = new Schema({
  nomor_antrian: { type: Number, required: true },
  waktu_mulai: { type: Date, required: true },
  waktu_selesai: { type: Date, required: true }
});

const jadwalSchema = new Schema({
  nomor_id: { type: Number, required: true },
  tanggal: { type: Date, required: true },
  jam_buka: { type: Date, required: true },
  jam_tutup: { type: Date },
  antrian: [antrianSchema],
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  createdAt: { type: Date, default: Date.now }
}, {
  collection: 'jadwal'
});

// Middleware to set the timezone
jadwalSchema.pre('save', function (next) {
  const jakartaTime = moment.tz(Date.now(), 'Asia/Jakarta');
  this.tanggal = moment(this.tanggal).tz('Asia/Jakarta').toDate();
  this.jam_buka = moment(this.jam_buka).tz('Asia/Jakarta').toDate();
  if (this.jam_tutup) {
    this.jam_tutup = moment(this.jam_tutup).tz('Asia/Jakarta').toDate();
  }
  this.createdAt = jakartaTime.toDate();
  next();
});

const Jadwal = mongoose.model('Jadwal', jadwalSchema);

module.exports = Jadwal;
