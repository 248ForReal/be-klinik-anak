const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Definisikan skema User
const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    session: {
        type: String,
        required: false
    }
});

// Buat model User
const User = mongoose.model('User', userSchema);

module.exports = User;
