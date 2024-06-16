const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const patientSchema = new Schema(
  {
    nama: {
      type: String,
      required: true
    },
    umur: {
      type: Number,
      required: true
    },
    alamat: {
      type: String,
      required: true
    },
    jenis_kelamin: {
      type: String,
      required: true
    },
    no_wa: {
      type: String,
      required: true
    },
    jadwal: {
      type: Schema.Types.ObjectId,
      ref: 'Jadwal',
      required: true
    },
    nomor_antrian: {
      type: Number,
      required: true
    },
    kode_unik: {
      type: String,
      required: true,
      unique: true
    },
    status: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true,
    collection: 'antrian'
  }
);

module.exports = model('Patient', patientSchema);
