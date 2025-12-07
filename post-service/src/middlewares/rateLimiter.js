const logger = require("../utils/logger")
const { RedisStore } = require("rate-limit-redis")


const createPostRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,           // 1 minutes
  max: 10,                          // limit each ip to 10 post per 'minute'
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ success: false, message: "Too many requests" });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  })
});

module.exports = { createPostRateLimiter };