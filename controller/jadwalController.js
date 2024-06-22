const Jadwal = require('../model/jadwal');
const sendResponse = require('../respon');
const moment = require('moment-timezone');

const createJadwal = async (req, res) => {
  try {
    const { tanggal, jam_buka } = req.body;

    // Periksa apakah masih ada jadwal dengan status 'open'
    const openJadwal = await Jadwal.findOne({ status: 'open' });

    if (openJadwal) {
      return sendResponse(400, null, 'Masih ada jadwal yang berstatus open', res);
    }

    const lastJadwal = await Jadwal.findOne().sort({ nomor_id: -1 }).exec();
    let nomor_id = 1;
    if (lastJadwal) {
      nomor_id = lastJadwal.nomor_id + 1;
    }

    // Kombinasikan tanggal dan jam_buka menjadi satu string datetime dan set ke zona waktu WIB
    const datetimeBuka = `${tanggal} ${jam_buka}`;
    const jamBukaWIB = moment.tz(datetimeBuka, 'YYYY-MM-DD HH:mm', 'Asia/Jakarta').toDate();

    // Konversi tanggal ke WIB dan set ke awal hari (start of day) dalam format Date
    const tanggalWIB = moment.tz(tanggal, 'YYYY-MM-DD', 'Asia/Jakarta').startOf('day').toDate();

    const jadwalBaru = new Jadwal({
      nomor_id,
      tanggal: tanggalWIB,
      jam_buka: jamBukaWIB
    });

    const jadwalTerbuat = await jadwalBaru.save();
    const responseJadwal = {
      ...jadwalTerbuat._doc,
      tanggal: moment(jadwalTerbuat.tanggal).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm'),
      jam_buka: moment(jadwalTerbuat.jam_buka).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm'),
      createdAt: moment(jadwalTerbuat.createdAt).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'),
    };

    sendResponse(201, responseJadwal, 'Jadwal berhasil ditambahkan', res);
  } catch (error) {
    console.error('Error occurred while creating jadwal:', error);
    sendResponse(500, error, 'Terjadi kesalahan saat menambahkan jadwal', res);
  }
};

const getAllJadwal = async (req, res) => {
  try {
    const result = await Jadwal.find();

    if (!result || result.length === 0) {
      sendResponse(200, [], 'Get all jadwal - No data found', res);
      return;
    }

    const resultWIB = result.map(jadwal => ({
      _id: jadwal._id,
      nomor_id: jadwal.nomor_id,
      tanggal: moment(jadwal.tanggal).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm'),
      jam_buka: moment(jadwal.jam_buka).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm'),
      status: jadwal.status,
      antrian: jadwal.antrian.map(antrian => ({
        nomor_antrian: antrian.nomor_antrian,
        waktu_mulai: moment(antrian.waktu_mulai).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm'),
        waktu_selesai: moment(antrian.waktu_selesai).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm'),
        _id: antrian._id
      }))
    }));

    sendResponse(200, resultWIB, 'Get all jadwal', res);
  } catch (err) {
    console.error('Error occurred while fetching all jadwal:', err);
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
    console.error('Error occurred while deleting jadwal:', error);
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

    jadwal.jam_tutup = moment.tz('Asia/Jakarta').toDate();
    jadwal.status = 'closed';
    const updatedJadwal = await jadwal.save();

    // Konversi waktu ke WIB sebelum mengirimkan respons
    const responseJadwal = {
      ...updatedJadwal._doc,
      tanggal: moment(updatedJadwal.tanggal).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm'),
      jam_buka: moment(updatedJadwal.jam_buka).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm'),
      jam_tutup: moment(updatedJadwal.jam_tutup).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm'),
      createdAt: moment(updatedJadwal.createdAt).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'),
    };

    sendResponse(200, responseJadwal, 'Jadwal berhasil ditutup', res);
  } catch (error) {
    console.error('Error occurred while closing jadwal:', error);
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
      ? moment.tz(lastAntrian.waktu_selesai, 'Asia/Jakarta').toDate()
      : moment.tz(jadwal.jam_buka, 'Asia/Jakarta').toDate();
    const waktuSelesai = new Date(waktuMulai.getTime() + durasiAntrian);

    const antrianBaru = {
      nomor_antrian: jadwal.antrian.length + 1,
      waktu_mulai: waktuMulai,
      waktu_selesai: waktuSelesai
    };

    jadwal.antrian.push(antrianBaru);
    const updatedJadwal = await jadwal.save();

    // Konversi waktu ke WIB sebelum mengirimkan respons
    const updatedJadwalWIB = {
      ...updatedJadwal._doc,
      tanggal: moment(updatedJadwal.tanggal).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm'),
      jam_buka: moment(updatedJadwal.jam_buka).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm'),
      jam_tutup: updatedJadwal.jam_tutup ? moment(updatedJadwal.jam_tutup).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm') : null,
      createdAt: moment(updatedJadwal.createdAt).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'),
      antrian: updatedJadwal.antrian.map(antrian => ({
        ...antrian,
        waktu_mulai: moment(antrian.waktu_mulai).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm'),
        waktu_selesai: moment(antrian.waktu_selesai).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm'),
      }))
    };

    sendResponse(201, updatedJadwalWIB, 'Antrian berhasil ditambahkan', res);
  } catch (error) {
    console.error('Error occurred while adding antrian:', error);
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
