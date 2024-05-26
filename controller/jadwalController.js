const Jadwal = require('../model/jadwal');
const sendResponse = require('../respon');
const moment = require('moment');

const createJadwal = async (req, res) => {
  try {
    const { tanggal, jam_buka } = req.body;
    const lastJadwal = await Jadwal.findOne().sort({ nomor_id: -1 }).exec();
    let nomor_id = 1;
    if (lastJadwal) {
      nomor_id = lastJadwal.nomor_id + 1;
    }

    const jadwalBaru = new Jadwal({
      nomor_id,
      tanggal,
      jam_buka
    });

    const jadwalTerbuat = await jadwalBaru.save();
    sendResponse(201, jadwalTerbuat, 'Jadwal berhasil ditambahkan', res);
  } catch (error) {
    sendResponse(500, error, 'Terjadi kesalahan saat menambahkan jadwal', res);
  }
};

const getAllJadwal = async (req, res) => {
  try {
    const result = await Jadwal.find();
    sendResponse(200, result, 'Get all jadwal', res);
  } catch (err) {
    sendResponse(404, null, 'Data not found', res);
  }
};

const deleteJadwal = async (req, res) => {
  try {
    const { id } = req.params;
    const jadwalTerhapus = await Jadwal.findOneAndDelete({ nomor_id: id });

    if (!jadwalTerhapus) {
      sendResponse(404, null, 'Jadwal tidak ditemukan', res);
      return;
    }

    sendResponse(200, jadwalTerhapus, 'Jadwal berhasil dihapus', res);
  } catch (error) {
    sendResponse(500, error, 'Terjadi kesalahan saat menghapus jadwal', res);
  }
};

const closeJadwal = async (req, res) => {
  try {
    const { id } = req.params;
    const jadwal = await Jadwal.findOne({ nomor_id: id });

    if (!jadwal) {
      sendResponse(404, null, 'Jadwal tidak ditemukan', res);
      return;
    }

    jadwal.jam_tutup = new Date();
    jadwal.status = 'closed';
    const updatedJadwal = await jadwal.save();

    sendResponse(200, updatedJadwal, 'Jadwal berhasil ditutup', res);
  } catch (error) {
    sendResponse(500, error, 'Terjadi kesalahan saat menutup jadwal', res);
  }
};

const addAntrian = async (req, res) => {
  try {
    const { id } = req.params;
    const jadwal = await Jadwal.findOne({ nomor_id: id });

    if (!jadwal) {
      sendResponse(404, null, 'Jadwal tidak ditemukan', res);
      return;
    }

    if (jadwal.status === 'closed') {
      sendResponse(403, null, 'Jadwal sudah ditutup', res);
      return;
    }

    const durasiAntrian = 20 * 60 * 1000; // 20 menit dalam milidetik
    const lastAntrian = jadwal.antrian[jadwal.antrian.length - 1];
    const waktuMulai = lastAntrian
      ? new Date(lastAntrian.waktu_selesai.getTime())
      : new Date(jadwal.jam_buka);
    const waktuSelesai = new Date(waktuMulai.getTime() + durasiAntrian);

    const antrianBaru = {
      nomor_antrian: jadwal.antrian.length + 1,
      waktu_mulai: waktuMulai,
      waktu_selesai: waktuSelesai
    };

    jadwal.antrian.push(antrianBaru);
    const updatedJadwal = await jadwal.save();

    sendResponse(201, updatedJadwal, 'Antrian berhasil ditambahkan', res);
  } catch (error) {
    sendResponse(500, error, 'Terjadi kesalahan saat menambahkan antrian', res);
  }
};

module.exports = {
  createJadwal,
  getAllJadwal,
  deleteJadwal,
  closeJadwal,
  addAntrian
};
