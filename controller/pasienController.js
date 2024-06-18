const User = require('../model/user');
const Jadwal = require('../model/jadwal');
const Patient = require('../model/pasien');
const sendResponse = require('../respon');
const moment = require('moment-timezone');
const ExcelJS = require('exceljs');
const path = require('path');


const getAllAntrian = async (req, res, next) => {
    try {
        // Cari jadwal yang masih memiliki status 'open'
        const jadwal = await Jadwal.findOne({ status: 'open' }).lean();

        if (!jadwal) {
            return sendResponse(404, null, 'Tidak ada jadwal dengan status open', res);
        }

        // Ambil daftar antrian dari jadwal yang statusnya 'open'
        const antrianWithPatientDetails = [];

        for (const antrian of jadwal.antrian) {
            const pasien = await Patient.findOne({
                nomor_antrian: antrian.nomor_antrian,
                jadwal: jadwal._id
            }).lean();

            if (!pasien) {
                antrianWithPatientDetails.push({
                    nomor_antrian: antrian.nomor_antrian,
                    kode_unik: '',
                    waktu_mulai: moment(antrian.waktu_mulai).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'),
                    waktu_selesai: moment(antrian.waktu_selesai).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'),
                    status: 'unknown',
                    createdAt: moment(antrian.createdAt).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
                });
            } else {
                antrianWithPatientDetails.push({
                    nama: pasien.nama,
                    umur: pasien.umur,
                    alamat: pasien.alamat,
                    jenis_kelamin: pasien.jenis_kelamin,
                    no_wa: pasien.no_wa,
                    jadwal: pasien.jadwal,
                    nomor_antrian: pasien.nomor_antrian,
                    kode_unik: pasien.kode_unik,
                    status: pasien.status,
                    createdAt: moment(pasien.createdAt).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'),
                    updatedAt: moment(pasien.updatedAt).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss')
                });
            }
        }

        sendResponse(200, antrianWithPatientDetails, 'Data semua antrian dengan jadwal open', res);
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
        const { startDate, endDate } = req.body;

        // Parse dates and set time zone
        const start = moment.tz(startDate, 'Asia/Jakarta').startOf('day');
        const end = moment.tz(endDate, 'Asia/Jakarta').endOf('day');

        // Find closed schedules within the given date range
        const closedSchedules = await Jadwal.find({
            status: 'closed',
            tanggal: {
                $gte: start.toDate(),
                $lt: end.toDate()
            }
        });

        if (closedSchedules.length === 0) {
            return sendResponse(404, null, 'Tidak ada jadwal yang ditutup dalam periode yang dipilih', res);
        }

        const scheduleIds = closedSchedules.map(schedule => schedule._id);

        // Find patients with the closed schedules and status 'selesai'
        const finishedPatients = await Patient.find({
            status: 'selesai',
            jadwal: { $in: scheduleIds }
        }).populate('jadwal');

        if (finishedPatients.length === 0) {
            return sendResponse(404, null, 'Tidak ada pasien yang selesai dalam periode yang dipilih', res);
        }

        // Prepare response data
        const responseData = finishedPatients.map(patient => ({
            nama: patient.nama,
            umur: patient.umur,
            alamat: patient.alamat,
            jenis_kelamin: patient.jenis_kelamin,
            no_wa: patient.no_wa,
            nomor_antrian: patient.nomor_antrian,
            kode_unik: patient.kode_unik,
            status: patient.status,
            tanggal_jadwal: moment(patient.jadwal.tanggal).tz('Asia/Jakarta').format('YYYY-MM-DD')
        }));

        sendResponse(200, responseData, 'Data pasien berhasil diambil', res);

        // Delete the schedules and associated patients
        await Patient.deleteMany({ jadwal: { $in: scheduleIds } });
        await Jadwal.deleteMany({ _id: { $in: scheduleIds } });

    } catch (error) {
        next(error);
    }
};

const getPaseienSelesai = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.body;

        // Parse dates and set time zone
        const start = moment.tz(startDate, 'Asia/Jakarta').startOf('day');
        const end = moment.tz(endDate, 'Asia/Jakarta').endOf('day');

        // Find closed schedules within the given date range
        const closedSchedules = await Jadwal.find({
            status: 'closed',
            tanggal: {
                $gte: start.toDate(),
                $lt: end.toDate()
            }
        });

        if (closedSchedules.length === 0) {
            return sendResponse(404, null, 'Tidak ada jadwal yang ditutup dalam periode yang dipilih', res);
        }

        const scheduleIds = closedSchedules.map(schedule => schedule._id);

        // Find patients with the closed schedules and status 'selesai'
        const finishedPatients = await Patient.find({
            status: 'selesai',
            jadwal: { $in: scheduleIds }
        }).populate('jadwal');

        if (finishedPatients.length === 0) {
            return sendResponse(404, null, 'Tidak ada pasien yang selesai dalam periode yang dipilih', res);
        }

        // Prepare response data
        const responseData = finishedPatients.map(patient => ({
            nama: patient.nama,
            umur: patient.umur,
            alamat: patient.alamat,
            jenis_kelamin: patient.jenis_kelamin,
            no_wa: patient.no_wa,
            nomor_antrian: patient.nomor_antrian,
            kode_unik: patient.kode_unik,
            status: patient.status,
            tanggal_jadwal: moment(patient.jadwal.tanggal).tz('Asia/Jakarta').format('YYYY-MM-DD')
        }));

        sendResponse(200, responseData, 'Data pasien berhasil diambil', res);
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
    getPaseienSelesai,
    searchPatients
};
