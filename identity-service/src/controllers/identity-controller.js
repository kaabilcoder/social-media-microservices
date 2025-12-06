

const argon2 = require("argon2")
const User = require("../models/user")
const generateTokens = require("../utils/generateTokens")
const logger = require("../utils/logger")
const { validateRegistration, validateLogin } = require("../utils/validation")

// user registration
const registerUser = async (req, res) => {
    logger.info("Registration endpoint hit...")
    try {
        //validate the schema
        const { error } = validateRegistration(req.body)
        if (error) {
            logger.warn('validation error', error.details[0].message)
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            })
        }

        const { email, password, username } = req.body

        let user = await User.findOne({ $or: [{ email }, { username }] });

        if (user) {
            logger.warn('User already exists')
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        user = new User({ username, email, password })
        await user.save();
        logger.warn('User saved successfully', user._id);

        const { accessToken, refreshToken } = await generateTokens(user)

        res.status(201).json({
            success: true,
            message: "User registered successfully!",
            accessToken,
            refreshToken
        })

    } catch (error) {
        logger.error('Registration error occured', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
}





// user login
const loginUser = async (req, res) => {
    logger.warn("Login endpoint hit...")
    try {
        const { error } = validateLogin(req.body);
        if (error) {
            logger.warn('validation error', error.details[0].message)
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            })
        }

        const { email, password } = req.body
        let existingUser = await User.findOne({email});

        if (!existingUser) {
            logger.warn("User don't exists")
            return res.status(400).json({
                success: false,
                message: "User don't exists"
            });
        }

        const verifiedPassword = existingUser && await argon2.verify(existingUser.password, password);
        if (!verifiedPassword) {
            logger.warn("Password is incorrect");
            return res.status(400).json({
                success: false,
                message: "Passwrod is incorrect"
            })
        }

        const { accessToken, refreshToken } = await generateTokens(existingUser);
        res.status(201).json({
            success: true,
            message: "You are logged in",
            accessToken,
            refreshToken
        })

    } catch (error) {
        logger.error('Login error occured', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        })
    }
}

// refresh token






// logout


module.exports = {loginUser, registerUser };