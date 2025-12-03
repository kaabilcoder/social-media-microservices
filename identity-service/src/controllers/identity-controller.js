

const User = require("../models/user")
const generateTokens = require("../utils/generateTokens")
const logger = require("../utils/logger")
const {validateRegisteration} = require("../utils/validation")






// user registration
const registerUser = async(req, res)=>{
    logger.info("Registration endpoint hit...")
    try {
        
        //validate the schema
        const {error} = validateRegisteration(req.body)
        if(error){
            logger.warn('validation error', error.details[0].message)
            return res.status(400).json({
                success : false,
                message: error.details[0].message
            })
        }

        const {email, password, username} = req.body

        let user = await User.findOne({ $or : [{email}, {username}]});

        if(user){
            logger.warn('User already exists')
            return res.status(400).json({
                success : false,
                message: 'User already exists'
            });
        }

        user = new User({username, email, password})
        await user.save();
        logger.warn('User saved successfully', user._id);

        const {accessToken, refreshToken} = await generateTokens(user)

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






// refresh token






// logout


module.exports = {registerUser};