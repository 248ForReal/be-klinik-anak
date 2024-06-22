const express = require('express');
const router = express.Router();
const {
    createUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser
} = require('../controller/userController');
const { checkAdminRole, checkSuperAdminRole } = require('../middleware/chekin');

router.post('/users', createUser, checkSuperAdminRole);
router.get('/users', getAllUsers, checkSuperAdminRole);
router.get('/users/:id', getUserById, checkSuperAdminRole);
router.put('/users/:id', updateUser, checkSuperAdminRole);
router.delete('/users/:id', deleteUser, checkSuperAdminRole);

module.exports = router;
