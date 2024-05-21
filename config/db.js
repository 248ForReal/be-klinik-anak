const mongoose = require('mongoose');
require('dotenv').config();

const dbURI = process.env.MONGODB_URI;

const connectDB = async () => {
    try {
        await mongoose.connect(dbURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Terhubung ke MongoDB');
    } catch (err) {
        console.error('Koneksi MongoDB error:', err);
        process.exit(1);
    }
};

module.exports = connectDB;
