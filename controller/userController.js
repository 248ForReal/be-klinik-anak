const User = require('../model/user');
const bcrypt = require('bcrypt');
const sendResponse = require('../respon');


const createUser = async (req, res, next) => {
    try {
        const { name, role, username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            name,
            role,
            username,
            password: hashedPassword
        });

        const savedUser = await newUser.save();
        sendResponse(201, savedUser, 'User berhasil dibuat', res);
    } catch (error) {
        next(error);
    }
};

const getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find({});
        sendResponse(200, users, 'Daftar semua pengguna', res);
    } catch (error) {
        next(error);
    }
};


const getUserById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user = await User.findById(id);

        if (!user) {
            return sendResponse(404, null, 'User tidak ditemukan', res);
        }

        sendResponse(200, user, 'Detail user', res);
    } catch (error) {
        next(error);
    }
};


const updateUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, role, username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const updatedUser = await User.findByIdAndUpdate(id, {
            name,
            role,
            username,
            password: hashedPassword
        }, { new: true });

        if (!updatedUser) {
            return sendResponse(404, null, 'User tidak ditemukan', res);
        }

        sendResponse(200, updatedUser, 'User berhasil diperbarui', res);
    } catch (error) {
        next(error);
    }
};


const deleteUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        const deletedUser = await User.findByIdAndDelete(id);

        if (!deletedUser) {
            return sendResponse(404, null, 'User tidak ditemukan', res);
        }

        sendResponse(200, deletedUser, 'User berhasil dihapus', res);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser
};
