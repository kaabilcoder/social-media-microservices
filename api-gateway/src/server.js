require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Redis = require("ioredis");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const logger = require("./utils/logger");
const proxy = require("express-http-proxy");
const errorHandler = require("./middleware/errorHandler");
const { authMiddleware } = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT;

const redisClient = new Redis(process.env.REDIS_URI);

app.use(helmet());
app.use(cors());
app.use(express.json());

// red limiting
const rateLimitOptions = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each ip to 100 requests per 'window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ success: false, message: "Too many requests" });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

app.use(rateLimitOptions);

app.use((req, res, next) => {
  logger.info(`Recieved ${req.method} request to ${req.url}`);
  logger.info(`Request body: ${JSON.stringify(req.body)}`);
  next();
});

const proxyOptions = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, "/api");
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error("Proxy Error:", err);
    res.status(500).json({
      message: `internal server error`,
      error: err.message || 'Proxying failed',
    });
  },
};

// Setting up proxy for identity service

app.use(
  "/v1/auth",
  proxy(process.env.IDENTITY_SERVICE_URI, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from identity service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },
  })
);

// Setting up proxy for post service

app.use("/v1/posts", authMiddleware, proxy(process.env.POST_SERVICE_URI, {
  ...proxyOptions,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      proxyReqOpts.headers['x-user-id'] = srcReq.user.userId;
      return proxyReqOpts;
    },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from post service: ${proxyRes.statusCode}`
      );
      return proxyResData;
  }
})); 

// Setting up proxy for Media service
app.use("/v1/media", authMiddleware, proxy(process.env.MEDIA_SERVICE_URI, {
  ...proxyOptions,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers['x-user-id'] = srcReq.user.userId;
    if(!srcReq.headers['content-type'].startsWith('multipart/form-data')){
      proxyReqOpts.headers["Content-Type"] = "application/json";
    }
      return proxyReqOpts;
    },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from media service: ${proxyRes.statusCode}`
      );
      return proxyResData;
  },
  parseReqBody: false
})); 


app.use(errorHandler)

app.listen(PORT, () => {
  logger.info(`API gateway is running on port ${PORT}`)
  logger.info(`Identity service is running on port ${process.env.IDENTITY_SERVICE_URI}`)
  logger.info(`Post service is running on port ${process.env.POST_SERVICE_URI}`)
  logger.info(`Media service is running on port ${process.env.MEDIA_SERVICE_URI}`)
  logger.info(`Redis Url: ${process.env.REDIS_URI}`)
})  