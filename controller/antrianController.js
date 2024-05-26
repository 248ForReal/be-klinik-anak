const moment = require('moment-timezone');
const User = require('../model/user');
const Jadwal = require('../model/jadwal');
const Patient = require('../model/pasien');
const sendResponse = require('../respon');

const regisAntrian = async (req, res, next) => {
    try {
        const { nama, umur, alamat, jenis_kelamin, no_wa, status } = req.body;

        // Cek apakah ada jadwal yang tersedia dan statusnya 'open'
        const jadwal = await Jadwal.findOne({ status: 'open' }).sort({ createdAt: -1 });

        if (!jadwal) {
            return sendResponse(400, null, 'Tidak ada jadwal yang tersedia atau jadwal sudah ditutup', res);
        }

        let nomorAntrian;

        // Cek nomor antrian yang belum dimiliki oleh pasien lain
        let nomorAntrianBelumDimiliki = null;
        for (let i = 1; i <= jadwal.antrian.length + 1; i++) {
            const existingPatient = await Patient.findOne({ nomor_antrian: i });
            if (!existingPatient) {
                nomorAntrianBelumDimiliki = i;
                break;
            }
        }

        // Jika ada nomor antrian yang belum dimiliki, gunakan nomor antrian tersebut
        if (nomorAntrianBelumDimiliki) {
            nomorAntrian = nomorAntrianBelumDimiliki;
        } else {
            // Jika tidak ada nomor antrian yang tersedia, tambahkan satu nomor antrian baru
            nomorAntrian = jadwal.antrian.length + 1;
        }

        // Lanjutkan dengan proses pendaftaran antrian
        const kodeUnik = await generateUniqueKodeUnik(nama);

        const newPatient = new Patient({
            nomor_antrian: nomorAntrian,
            nama,
            umur,
            alamat,
            jenis_kelamin,
            no_wa,
            kode_unik: kodeUnik,
            status
        });

        // Tambahkan antrian baru ke jadwal jika nomor antrian baru
        if (!nomorAntrianBelumDimiliki) {
            const durasiAntrian = 20 * 60 * 1000;
            const lastAntrian = jadwal.antrian[jadwal.antrian.length - 1];
            const waktuMulai = lastAntrian
                ? moment(lastAntrian.waktu_selesai).tz('Asia/Jakarta').toDate()
                : moment(jadwal.jam_buka).tz('Asia/Jakarta').toDate();
            const waktuSelesai = new Date(waktuMulai.getTime() + durasiAntrian);

            jadwal.antrian.push({
                waktu_mulai: waktuMulai,
                waktu_selesai: waktuSelesai,
                nomor_antrian: nomorAntrian
            });

            await jadwal.save();
        }

        const savedPatient = await newPatient.save();

        req.session.patient = savedPatient;
        res.cookie('patientId', savedPatient._id, { maxAge: 900000, httpOnly: true });

        sendResponse(201, savedPatient, 'Pasien berhasil dibuat', res);
    } catch (error) {
        next(error);
    }
};





// Generate Kode Unik
const generateUniqueKodeUnik = async (nama) => {
    const namaSplit = nama.trim().split(' ');
    let kodeUnik = namaSplit.map(n => n[0]).join('').toUpperCase();

    while (kodeUnik.length < 3) {
        kodeUnik += 'X';
    }
    kodeUnik = kodeUnik.substring(0, 3);

    const existingPatient = await Patient.findOne({ kode_unik: kodeUnik });
    if (existingPatient) {
        return generateUniqueKodeUnik(nama + 'X');
    }

    return kodeUnik;
};

let timer;
let stopwatchTimer;
let sisaWaktu = 0;
let lastElapsedTime = 0;

// Update Waktu Pasien
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


const mulai_antrian = async (req, res, next) => {
    try {
        const { nomor_antrian } = req.params;

        const jadwal = await Jadwal.findOne({ 'antrian.nomor_antrian': nomor_antrian });

        if (!jadwal) {
            return sendResponse(404, null, "Data antrian tidak ditemukan", res);
        }

        const antrian = jadwal.antrian.find(item => item.nomor_antrian === parseInt(nomor_antrian));

        if (!antrian) {
            return sendResponse(404, null, "Data antrian tidak ditemukan", res);
        }

        const patient = await Patient.findOne({ nomor_antrian });

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

            timer = setInterval(() => {
                if (sisaWaktu <= 0) {
                    clearInterval(timer);
                    console.log("Timer selesai");

                    patient.save().then(() => {
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
                    }).catch(err => {
                        console.error("Gagal menyimpan perubahan status:", err);
                    });
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


const otomatisMulaiAntrianPertama = async () => {
    try {
        const patient = await Patient.findOne({ nomor_antrian: 1, status: 'menunggu' });
        if (patient) {
            const jadwal = await Jadwal.findOne({ 'antrian.nomor_antrian': 1 });

            if (jadwal) {
                const antrian = jadwal.antrian.find(item => item.nomor_antrian === 1);

                const waktuMulai = moment().tz('Asia/Jakarta').toDate();
                const waktuSelesai = new Date(waktuMulai.getTime() + 20 * 60 * 1000);

                antrian.waktu_mulai = waktuMulai;
                antrian.waktu_selesai = waktuSelesai;
                await jadwal.save();

                patient.status = 'mulai';
                await patient.save();

                console.log('Antrian nomor 1 otomatis dimulai');
            }
        }
    } catch (error) {
        console.error('Gagal memulai antrian nomor 1 otomatis:', error);
    }
};

const getAllAntrian = async (req, res, next) => {
    try {
        const jadwal = await Jadwal.findOne().sort({ createdAt: -1 }).lean();

        if (!jadwal) {
            return sendResponse(404, null, 'Jadwal tidak ditemukan', res);
        }

        const pasienList = await Patient.find({}).lean();

        const antrianWithPatientDetails = jadwal.antrian.map(antrian => {
            const pasien = pasienList.find(p => p.nomor_antrian === antrian.nomor_antrian) || {};
            return {
                nomor_antrian: antrian.nomor_antrian,
                kode_unik: pasien.kode_unik || '',
                waktu_mulai: moment(antrian.waktu_mulai).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'),
                waktu_selesai: moment(antrian.waktu_selesai).tz('Asia/Jakarta').format('YYYY-MM-DD HH:mm:ss'),
                status: pasien.status || 'unknown'
            };
        });

        sendResponse(200, antrianWithPatientDetails, 'Data antrian berhasil diambil', res);
    } catch (error) {
        next(error);
    }
};

const antrianBerapa = async (req, res, next) => {
    const { no_wa } = req.params;

    try {
        const dataPasien = await Patient.findOne({ no_wa });

        if (dataPasien) {
            let antrianBerapaLagi = dataPasien.nomor_antrian;

            if (antrianBerapaLagi === 1) {
                antrianBerapaLagi = 1;
            }

            const response = {
                no_wa,
                kode_unik: dataPasien.kode_unik
            };

            sendResponse(200, response, `Nomor WA ${no_wa} memiliki nomor antrian ke-${antrianBerapaLagi}`, res);
        } else {
            sendResponse(404, null, `Nomor WA ${no_wa} tidak ditemukan`, res);
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
