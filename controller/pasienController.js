const User = require('../model/user');
const Jadwal = require('../model/jadwal');
const Patient = require('../model/pasien');
const sendResponse = require('../respon');
const moment = require('moment-timezone');
const ExcelJS = require('exceljs');
const path = require('path');


const getAllAntrian = async (req, res, next) => {
    try {
        const allAntrian = await Patient.find().sort({ nomor_antrian: 1 });

        sendResponse(200, allAntrian, 'Data semua antrian', res);
    } catch (error) {
        next(error);
    }
};


const getPatientCounts = async (req, res, next) => {
    try {
        const today = moment().tz('Asia/Jakarta').startOf('day');
        const startOfWeek = moment().tz('Asia/Jakarta').startOf('isoWeek');
        const startOfMonth = moment().tz('Asia/Jakarta').startOf('month');

        const countToday = await Patient.countDocuments({
            createdAt: { $gte: today.toDate() }
        });

        const countWeek = await Patient.countDocuments({
            createdAt: { $gte: startOfWeek.toDate() }
        });

        const countMonth = await Patient.countDocuments({
            createdAt: { $gte: startOfMonth.toDate() }
        });

        const response = {
            countToday,
            countWeek,
            countMonth
        };

        sendResponse(200, response, 'Jumlah pasien hari ini, minggu ini, bulan ini', res);
    } catch (error) {
        next(error);
    }
};

const getFinishedPatientsToday = async (req, res, next) => {
    try {
        const today = moment().tz('Asia/Jakarta').startOf('day');
        const tomorrow = moment(today).add(1, 'days');

        const finishedPatientsToday = await Patient.find({
            status: 'selesai',
            updatedAt: {
                $gte: today.toDate(),
                $lt: tomorrow.toDate()
            }
        });

        sendResponse(200, finishedPatientsToday, 'Pasien yang sudah selesai hari ini', res);
    } catch (error) {
        next(error);
    }
};

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

const tukarAntrianPasien = async (req, res, next) => {
    const { kode_unik1, kode_unik2 } = req.body;

    try {
        const pasien1 = await Patient.findOne({ kode_unik: kode_unik1 });
        const pasien2 = await Patient.findOne({ kode_unik: kode_unik2 });

        if (!pasien1 || !pasien2) {
            return sendResponse(404, null, 'Salah satu atau kedua pasien tidak ditemukan', res);
        }

        const tempNomorAntrian = pasien1.nomor_antrian;
        pasien1.nomor_antrian = pasien2.nomor_antrian;
        pasien2.nomor_antrian = tempNomorAntrian;

        await pasien1.save();
        await pasien2.save();

        sendResponse(200, { pasien1, pasien2 }, 'Nomor antrian pasien berhasil ditukar', res);
    } catch (error) {
        next(error);
    }
};




const exportPasien = async (req, res, next) => {
    try {
        const startOfWeek = moment().tz('Asia/Jakarta').startOf('isoWeek');
        const endOfWeek = moment(startOfWeek).endOf('isoWeek');

        // Temukan pasien yang selesai dalam seminggu terakhir
        const finishedPatients = await Patient.find({
            status: 'selesai',
            updatedAt: {
                $gte: startOfWeek.toDate(),
                $lt: endOfWeek.toDate()
            }
        });

        if (finishedPatients.length === 0) {
            return sendResponse(404, null, 'Tidak ada pasien yang selesai dalam seminggu terakhir', res);
        }

        // Buat workbook baru
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Pasien Selesai Seminggu');

        // Definisikan kolom
        worksheet.columns = [
            { header: 'Nama', key: 'nama', width: 30 },
            { header: 'Umur', key: 'umur', width: 10 },
            { header: 'Alamat', key: 'alamat', width: 30 },
            { header: 'Jenis Kelamin', key: 'jenis_kelamin', width: 15 },
            { header: 'No WA', key: 'no_wa', width: 20 },
            { header: 'Nomor Antrian', key: 'nomor_antrian', width: 15 },
            { header: 'Kode Unik', key: 'kode_unik', width: 15 },
            { header: 'Status', key: 'status', width: 15 },
            { header: 'Tanggal Selesai', key: 'updatedAt', width: 20 }
        ];

        // Tambahkan baris data
        finishedPatients.forEach(patient => {
            worksheet.addRow({
                nama: patient.nama,
                umur: patient.umur,
                alamat: patient.alamat,
                jenis_kelamin: patient.jenis_kelamin,
                no_wa: patient.no_wa,
                nomor_antrian: patient.nomor_antrian,
                kode_unik: patient.kode_unik,
                status: patient.status,
                updatedAt: moment(patient.updatedAt).format('YYYY-MM-DD HH:mm:ss')
            });
        });

        // Buat file Excel
        const exportPath = path.join(__dirname, '..', 'exports', `Pasien_Selesai_Seminggu_${moment().format('YYYYMMDDHHmmss')}.xlsx`);
        await workbook.xlsx.writeFile(exportPath);

        // Hapus data pasien yang telah diekspor
        await Patient.deleteMany({
            status: 'selesai',
            updatedAt: {
                $gte: startOfWeek.toDate(),
                $lt: endOfWeek.toDate()
            }
        });

        // Kirim respon dengan link download file Excel
        sendResponse(200, { file: exportPath }, 'Data pasien berhasil diekspor ke Excel', res);
    } catch (error) {
        next(error);
    }
};


const searchPatients = async (req, res, next) => {
    const { query } = req.query;

    try {
        const patients = await Patient.find({
            $or: [
                { nama: { $regex: query, $options: 'i' } },
                { no_wa: { $regex: query, $options: 'i' } },
                { kode_unik: { $regex: query, $options: 'i' } }
            ]
        });

        sendResponse(200, patients, 'Hasil pencarian pasien', res);
    } catch (error) {
        next(error);
    }
};


module.exports = {
    editPasien,
    hapusPasien,
    tukarAntrianPasien,
    getAllAntrian,
    getPatientCounts,
    getFinishedPatientsToday,
    exportPasien,
    searchPatients
};
