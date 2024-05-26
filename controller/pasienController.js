const User = require('../model/user');
const Jadwal = require('../model/jadwal');
const Patient = require('../model/pasien');
const sendResponse = require('../respon');

const editPasien = async (req, res, next) => {
    const { kode_unik } = req.params;
    const { nama, umur, alamat, jenis_kelamin, no_wa, status } = req.body;

    try {
        const updatedPasien = await Patient.findOneAndUpdate({ kode_unik }, {
            nama,
            umur,
            alamat,
            jenis_kelamin,
            no_wa,
            status
        }, { new: true });

        if (!updatedPasien) {
            return sendResponse(404, null, 'Data pasien tidak ditemukan', res);
        }

        sendResponse(200, updatedPasien, 'Data pasien berhasil diperbarui', res);
    } catch (error) {
        next(error);
    }
};

const hapusPasien = async (req, res, next) => {
    const { kode_unik } = req.params;

    try {
        const pasienYangAkanDihapus = await Patient.findOne({ kode_unik });

        if (!pasienYangAkanDihapus) {
            return sendResponse(404, null, 'Data pasien tidak ditemukan', res);
        }

        const nomorAntrianDihapus = pasienYangAkanDihapus.nomor_antrian;

        // Temukan pasien dengan nomor antrian lebih besar dari pasien yang akan dihapus
        const pasienLain = await Patient.findOne({ nomor_antrian: nomorAntrianDihapus + 1 });

        if (pasienLain) {
            // Update nomor antrian pasien lain
            pasienLain.nomor_antrian = nomorAntrianDihapus;
            await pasienLain.save();
        }

        // Hapus pasien yang dipilih
        const deletedPasien = await Patient.findOneAndDelete({ kode_unik });

        // Hapus cookie dan session
        res.clearCookie('patientId');
        delete req.session.patient;

        sendResponse(200, deletedPasien, 'Data pasien berhasil dihapus', res);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    editPasien,
    hapusPasien
};
