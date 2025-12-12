require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const cors = require("cors");
const helmet = require("helmet");
const errorHandler = require("./middlewares/errorHandler")
const logger = require("./utils/logger")
const mediaService = require("./routes/Media.routes")
const app = express();
const PORT = process.env.PORT || 3003;
const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME;

// connect to MongoDB
mongoose
  .connect(`${MONGODB_URI}/${DB_NAME}`)
  .then(() => logger.info("connected to mongodb"))
  .catch((e) => logger.error("Mongo connection error", e));

//middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

//logger
app.use((req, res, next) => {
  logger.info(`Recieved ${req.method} request to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
  next();
});

app.use("/api/media", mediaService)

app.use(errorHandler);

// unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at', promise, "reason: ", reason)
})

app.listen(PORT, () => {
  logger.info(`Media service is running on port: ${PORT}`)
})

