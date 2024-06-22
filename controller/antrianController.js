const moment = require('moment-timezone');
const Jadwal = require('../model/jadwal');
const Patient = require('../model/pasien');
const sendResponse = require('../respon');

// Function to generate a unique code based on the name
const generateUniqueKodeUnik = async (nama) => {
    const namaSplit = nama.trim().split(' ');
    let kodeUnik = namaSplit.map(n => n[0]).join('').toUpperCase();

    while (kodeUnik.length < 3) {
        kodeUnik += 'X';
    }
    kodeUnik = kodeUnik.substring(0, 3);

    let suffix = 1;
    let originalKodeUnik = kodeUnik;

    while (await Patient.findOne({ kode_unik: kodeUnik })) {
        kodeUnik = originalKodeUnik + suffix;
        suffix++;
    }

    return kodeUnik;
};

const regisAntrian = async (req, res, next) => {
    try {
        const { nama, umur, alamat, jenis_kelamin, no_wa, status } = req.body;

        // Check if there's an available schedule with status 'open'
        const jadwal = await Jadwal.findOne({ status: 'open' }).sort({ createdAt: -1 });

        if (!jadwal) {
            return sendResponse(400, null, 'Tidak ada jadwal yang tersedia atau jadwal sudah ditutup', res);
        }

        // Check if the phone number already exists for the same schedule
        const existingPatientByNoWa = await Patient.findOne({ no_wa, jadwal: jadwal._id });
        if (existingPatientByNoWa) {
            return sendResponse(400, null, 'Nomor WhatsApp sudah digunakan untuk jadwal ini.', res);
        }

        // Determine the next available queue number
        const takenNumbers = (await Patient.find({ jadwal: jadwal._id })).map(p => p.nomor_antrian);
        let availableAntrian = jadwal.antrian.find(antrian => !takenNumbers.includes(antrian.nomor_antrian));
        let nomor_antrian, waktu_mulai, waktu_selesai;

        if (availableAntrian) {
            nomor_antrian = availableAntrian.nomor_antrian;
            waktu_mulai = availableAntrian.waktu_mulai;
            waktu_selesai = availableAntrian.waktu_selesai;
        } else {
            // Calculate the start and end time for the new appointment
            const durasiAntrian = 20 * 60 * 1000;
            const lastAntrian = jadwal.antrian[jadwal.antrian.length - 1];
            waktu_mulai = lastAntrian ? new Date(lastAntrian.waktu_selesai.getTime()) : new Date(jadwal.jam_buka);
            waktu_selesai = new Date(waktu_mulai.getTime() + durasiAntrian);

            // Validate that the new appointment time is within working hours
            const jamTutup = jadwal.jam_tutup ? new Date(jadwal.jam_tutup) : null;
            if (jamTutup && waktu_selesai > jamTutup) {
                return sendResponse(400, null, 'Waktu antrian melebihi jam tutup', res);
            }

            // Determine the next queue number
            nomor_antrian = jadwal.antrian.length + 1;

            // Add new appointment to the schedule
            jadwal.antrian.push({
                waktu_mulai,
                waktu_selesai,
                nomor_antrian
            });
        }

        // Generate a unique code for the patient
        const kodeUnik = await generateUniqueKodeUnik(nama);

        const newPatient = new Patient({
            jadwal: jadwal._id,
            nomor_antrian,
            nama,
            umur,
            alamat,
            jenis_kelamin,
            no_wa,
            kode_unik: kodeUnik,
            status
        });

        await jadwal.save();
        const savedPatient = await newPatient.save();

        req.session.patient = savedPatient;
        res.cookie('patientId', savedPatient._id, { maxAge: 900000, httpOnly: true });

        const response = {
            nama: savedPatient.nama,
            umur: savedPatient.umur,
            alamat: savedPatient.alamat,
            jenis_kelamin: savedPatient.jenis_kelamin,
            no_wa: savedPatient.no_wa,
            nomor_antrian: savedPatient.nomor_antrian,
            kode_unik: savedPatient.kode_unik,
            status: savedPatient.status,
            waktu_mulai: moment(waktu_mulai).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'),
            waktu_selesai: moment(waktu_selesai).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'),
            tanggal: moment(jadwal.tanggal).tz('Asia/Jakarta').format('YYYY-MM-DD'),
            _id: savedPatient._id,
            createdAt: savedPatient.createdAt,
            updatedAt: savedPatient.updatedAt,
            __v: savedPatient.__v
        };

        sendResponse(201, response, 'Pasien berhasil dibuat', res);
    } catch (error) {
        next(error);
    }
};

// Update patient appointment times
const updateWaktuPasien = async (currentAntrian) => {
    try {
        const patientsMenunggu = await Patient.find({ status: 'menunggu' }).sort({ nomor_antrian: 1 });

        let waktuMulaiUpdate = new Date(currentAntrian.waktu_selesai);

        for (const patient of patientsMenunggu) {
            const jadwal = await Jadwal.findOne({ 'antrian.nomor_antrian': patient.nomor_antrian });
            if (jadwal) {
                const antrian = jadwal.antrian.find(item => item.nomor_antrian === patient.nomor_antrian);
                if (antrian) {
                    const waktuSelesaiUpdate = new Date(waktuMulaiUpdate.getTime() + 20 * 60 * 1000);
                    antrian.waktu_mulai = waktuMulaiUpdate;
                    antrian.waktu_selesai = waktuSelesaiUpdate;

                    await jadwal.save();
                    waktuMulaiUpdate = waktuSelesaiUpdate;
                }
            }
        }
        console.log("Waktu pasien berhasil diperbarui");
    } catch (err) {
        console.error("Gagal memperbarui waktu pasien:", err);
    }
};

let timer;
let stopwatchTimer;
let sisaWaktu = 0;
let lastElapsedTime = 0;

const mulai_antrian = async (req, res, next) => {
    try {
        const { nomor_antrian } = req.params;
        const jadwal = await Jadwal.findOne({ status: 'open' }).sort({ createdAt: -1 });

        if (!jadwal) {
            return sendResponse(404, null, "Tidak ada jadwal dengan status open", res);
        }

        const antrian = jadwal.antrian.find(item => item.nomor_antrian === parseInt(nomor_antrian));

        if (!antrian) {
            return sendResponse(404, null, "Data antrian tidak ditemukan", res);
        }

        const patient = await Patient.findOne({ nomor_antrian, jadwal: jadwal._id });

        if (!patient) {
            return sendResponse(404, null, "Data pasien tidak ditemukan", res);
        }

        if (patient.status === "selesai") {
            return sendResponse(400, null, "Nomor antrian ini sudah selesai", res);
        }

        if (patient.status === "menunggu") {
            patient.status = "mulai";
            await patient.save();

            const waktuMulai = new Date(antrian.waktu_mulai);
            const waktuSelesai = new Date(antrian.waktu_selesai);
            const durasiWaktu = Math.ceil((waktuSelesai.getTime() - waktuMulai.getTime()) / 1000);

            console.log(`Durasi waktu: ${durasiWaktu} detik`);

            sisaWaktu = durasiWaktu;

            timer = setInterval(async () => {
                if (sisaWaktu <= 0) {
                    clearInterval(timer);
                    console.log("Timer selesai");

                    try {
                        await patient.save();
                        console.log("Memulai stopwatch");

                        let elapsedTime = 0;

                        stopwatchTimer = setInterval(() => {
                            console.log(`Waktu tambahan: ${elapsedTime} detik`);
                            lastElapsedTime = elapsedTime;
                            elapsedTime++;
                            if (elapsedTime >= 1200) {
                                clearInterval(stopwatchTimer);
                                console.log("Stopwatch selesai");
                            }
                        }, 1000);
                    } catch (err) {
                        console.error("Gagal menyimpan perubahan status:", err);
                    }
                } else {
                    console.log(`Sisa waktu: ${sisaWaktu} detik`);
                    sisaWaktu--;
                }
            }, 1000);

            sendResponse(200, patient, "Status pasien berhasil diubah menjadi 'mulai'", res);
        } else if (patient.status === "mulai") {
            clearInterval(timer);
            clearInterval(stopwatchTimer);
            patient.status = "selesai";

            let waktuSelesaiBaru;
            if (sisaWaktu === 0) {
                waktuSelesaiBaru = new Date(antrian.waktu_selesai.getTime() + lastElapsedTime * 1000);
            } else {
                waktuSelesaiBaru = new Date(antrian.waktu_selesai.getTime() - sisaWaktu * 1000);
            }

            antrian.waktu_selesai = waktuSelesaiBaru;
            await jadwal.save();

            await patient.save();

            sendResponse(200, patient, "Status pasien berhasil diubah menjadi 'selesai'", res);
            updateWaktuPasien(antrian);
        }
    } catch (err) {
        next(err);
    }
};

// Function to get all queue data
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
                    status: 'unknown'
                });
            } else {
                antrianWithPatientDetails.push({
                    nomor_antrian: antrian.nomor_antrian,
                    kode_unik: pasien.kode_unik || '',
                    waktu_mulai: moment(antrian.waktu_mulai).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'),
                    waktu_selesai: moment(antrian.waktu_selesai).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'),
                    status: pasien.status || 'unknown'
                });
            }
        }

        sendResponse(200, antrianWithPatientDetails, 'Data antrian berdasarkan jadwal open berhasil diambil', res);
    } catch (error) {
        next(error);
    }
};


const antrianBerapa = async (req, res, next) => {
    const { no_wa } = req.params;

    try {
        // Temukan jadwal terbaru dengan status 'open'
        const jadwalTerbaru = await Jadwal.findOne({ status: 'open' }).sort({ createdAt: -1 });

        if (!jadwalTerbaru) {
            return sendResponse(404, null, 'Tidak ada jadwal dengan status open', res);
        }

        // Cari pasien berdasarkan nomor WhatsApp dan jadwal terbaru
        const dataPasien = await Patient.findOne({ no_wa, jadwal: jadwalTerbaru._id });

        if (dataPasien) {
            const antrianBerapaLagi = dataPasien.nomor_antrian;

            const response = {
                no_wa,
                kode_unik: dataPasien.kode_unik
            };

            sendResponse(200, response, `Nomor WA ${no_wa} memiliki nomor antrian ke-${antrianBerapaLagi}`, res);
        } else {
            sendResponse(404, null, `Nomor WA ${no_wa} tidak ditemukan untuk jadwal terbaru`, res);
        }
    } catch (err) {
        next(err);
    }
};

module.exports = {
    mulai_antrian,
    regisAntrian,
    getAllAntrian,
    antrianBerapa
};
