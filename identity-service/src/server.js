require("dotenv").config();
const mongoose = require("mongoose");
let logger = require("./utils/logger");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const { rateLimit } = require("express-rate-limit")
const { RedisStore } = require("rate-limit-redis")
const Redis = require("ioredis");
const authRoutes = require("./routes/identity-service")
const errorHandler = require("./middleware/errorHandler")

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"
const DB_NAME=process.env.DB_NAME

// connect to mongo
mongoose
  .connect(`${MONGODB_URI}/${DB_NAME}`)
  .then(() => logger.info("connected to mongodb"))
  .catch((e) => logger.error("Mongo connection error", e));

// redis client
const redisClient = new Redis(process.env.REDIS_URI);

//middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Recieved ${req.method} request to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
  next();
});

// DDos protection and rate limiting
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient, // tells this store client is the redis client instance that stores rate limit data, you can use postgres for storeclient too or others, the method will be same
  keyPrefix: "middleware", // helps to distinguish between rate limiting data of redis from other data in redis client
  points: 10, // max no. of request that ip address makes in a given period of time => points: 10 requests
  duration: 1, // make 10 requests in 1 second
});

app.use((req, res, next) => {
  rateLimiter.consume(req.ip)
    .then(() => next())
    .catch(() => {
      logger.warn(`rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({ success: false, message: "Too many requests" });
    });
});


// IP based rate limiting for sensitive endpoints
const sensitiveEndpointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,           // 15 minutes
  max: 50,                          // limit each ip to 50 requests per 'window
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


// apply this sensitiveEndpointsLimiter to our routes
app.use('/api/auth/register', sensitiveEndpointsLimiter);

//Routes
app.use('/api/auth', authRoutes);

// error handler
app.use(errorHandler);

// unhandled promise rejection

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at', promise, "reason: ", reason)
})

app.listen(PORT, () => {
  logger.info(`Identity service running on port: ${PORT}`)
})