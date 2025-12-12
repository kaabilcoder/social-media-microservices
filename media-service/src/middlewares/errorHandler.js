const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    logger.error(err.stack || "No stack trace available");

    res.status(err.status || 500).json({
        message: err.message || "Internal server error",
    });
};

module.exports = errorHandler;