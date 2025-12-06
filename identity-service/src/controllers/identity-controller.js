

const argon2 = require("argon2")
const User = require("../models/user")
const generateTokens = require("../utils/generateTokens")
const logger = require("../utils/logger")
const { validateRegistration, validateLogin } = require("../utils/validation")
const RefreshTokenModel = require("../models/RefreshToken")

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
    logger.info("Login endpoint hit...")
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

        const isValidPassword = await existingUser.comparePassword(password)
        
        if (!isValidPassword) {
            logger.warn("Password is incorrect");
            return res.status(400).json({
                success: false,
                message: "Password is incorrect"
            })
        }

        const { accessToken, refreshToken } = await generateTokens(existingUser);
        res.status(200).json({
            success: true,
            message: "You are logged in",
            accessToken,
            refreshToken,
            userId: existingUser._id
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
const refreshTokenHandler = async(req, res) => {
    logger.info("Refresh token generator endpoint hit");
    try{

        const { refreshToken } = req.body;
        if(!refreshToken){
            logger.warn("Refresh token missing")
            return res.status(400).json({
                success: false,
                message: "Refresh token missing"
            });
        }

        const storedToken = await RefreshTokenModel.findOne({token: refreshToken})
        if(!storedToken || storedToken.expiresAt < new Date()){
            logger.warn("Invalid or expired refresh Token")

            return res.status(401).json({
                success: false,
                message: "Invalid or expired refresh Token"
            })
        };

        const user = await User.findById(storedToken.user)
        if(!user){
            logger.warn("User not found")

            return res.status(401).json({
                success: false,
                message: "User not found"
            })
        }

        const {accessToken: newAccessToken, refreshToken: newRefreshToken} = await generateTokens(user)

        // delete the old refresh token
        await RefreshTokenModel.deleteOne({_id: storedToken._id})

        res.json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        })
    } catch (error) {
        logger.error('RefreshToken generation error occured', error);
        res.status(500).json({
            success: false,
            message: 'RefreshToken generation error occured'
        })
    }
}



// logout
const logoutHandler = async(req, res) => {
    logger.info("Logout endpoint hit...")
    try{

        const {refreshToken} = req.body;
        if(!refreshToken){
            logger.warn("Refresh token missing")
            return res.status(400).json({
                success: false,
                message: "Refresh token missing"
            });
        }

        await RefreshTokenModel.deleteOne({ token: refreshToken })
        logger.info("Refresh token deleted for logout")
        res.json({
            success: true,
            message: "Logged out successfully!"
        })


    } catch (error) {
        logger.error('Error while logging out', error);
        res.status(500).json({
            success: false,
            message: 'Error while logging out'
        })
    }
}

module.exports = {loginUser, registerUser, refreshTokenHandler, logoutHandler };