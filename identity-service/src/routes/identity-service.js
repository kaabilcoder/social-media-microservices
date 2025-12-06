const express = require("express");
const {registerUser, loginUser, logoutHandler, refreshTokenHandler} = require("../controllers/identity-controller")

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser)
router.post('/refreshToken', refreshTokenHandler)
router.post('/logout', logoutHandler)

module.exports = router
