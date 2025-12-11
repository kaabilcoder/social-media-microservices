const express = require('express');
const {createPost, getAllPost, getSinglePost, deletePost} = require("../controllers/PostHandler") 
const {authenticateRequest} = require("../middlewares/authMiddleware")
const router = express();

// middleware
router.use(authenticateRequest);

router.post("/create-post", createPost);
router.get("/allposts", getAllPost);
router.get("/:id", getSinglePost);
router.delete("/:id", deletePost);


module.exports = router;