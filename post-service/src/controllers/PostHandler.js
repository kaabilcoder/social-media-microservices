const express = require('express');
const logger = require('../utils/logger');
const { validateCreatePost } = require('../utils/validations');
const {invalidatePostCache} = require("../utils/InvalidatePostCache")
const PostModel = require('../models/post');

const createPost = async(req, res) => {
    logger.info("createPost endpoint hit...")
    try{
        // validate the schema
        const {error} = validateCreatePost(req.body);
        if(error){
            logger.warn("Validation error", error.details[0].message);
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            })
        }

        const {content, mediaId} = req.body;
        const newlyCreatedPost = new PostModel({
            user: req.user.userId,
            content,
            mediaId: mediaId || [],
        })

        await newlyCreatedPost.save();
        await invalidatePostCache(req, newlyCreatedPost._id)
        logger.info("Post created successfull", newlyCreatedPost)
        res.status(201).json({
            success: true,
            message: 'Post created successfully'
        })
        
    } catch(error){
        logger.warn("Error creating post", error);
        res.status(500).json({
            success: false,
            message: "Error creating post"
        })
    }
}



const getAllPost = async(req, res) => {
    logger.info("getAllPost endpoint hit...")
    try{
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;

        // Redis Cacheing
        const cacheKey = `posts:${page}:${limit}`;
        const cachedPosts = await req.redisClient.get(cacheKey);

        if(cachedPosts){
            return res.json(JSON.parse(cachedPosts));
        }

        // fetch all posts
        const posts = await PostModel.find({}).sort({createdAt: -1}).skip(startIndex).limit(limit);

        const totalNoOfPosts = await PostModel.countDocuments()

        const result = {
            posts,
            currentPage: page,
            totalPages: Math.ceil(totalNoOfPosts/limit)
        }

        // save your posts in redis cache
        await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));

        res.json(result);

    } catch(error){
        logger.warn("Error getting all post", error);
        res.status(500).json({
            success: false,
            message: "Error getting all post"
        })
    }
}



const getSinglePost = async(req, res) => {
    logger.info("getSinglePost endpoint hit...")
    try{
        const postId = req.params.id;
        const cacheKey = `post:${postId}`;
        const cachedPosts = await req.redisClient.get(cacheKey);

        if(cachedPosts){
            return res.json(JSON.parse(cachedPosts));
        };

        const singlePostDetailsById = await PostModel.findById(postId);

        if(!singlePostDetailsById){
            return res.status(404).json({
                message: "Post not found",
                success: false
            })
        }

        await req.redisClient.setex(
            cachedPosts,
            3600,
            JSON.stringify(singlePostDetailsById)
        );

        res.json(singlePostDetailsById);

    } catch(error){
        logger.warn("Error getting Post post", error);
        res.status(500).json({
            success: false,
            message: "Error getting Post post"
        })
    }
}



const deletePost = async(req, res) => {
    logger.info("getSinglePost endpoint hit...")
    try{
        const post = await PostModel.findOneAndDelete({
            _id: req.params.id,
            user: req.user.userId
        })

        if(!post){
            return res.status(404).json({
                success: false,
                message: "Post not found"
            });
        }
        
        await invalidatePostCache(req, req.params.id);
        res.json({
            message: "Post deleted successfully"
        });

    } catch(error){
        logger.warn("Error getting Post post", error);
        res.status(500).json({
            success: false,
            message: "Error getting Post post"
        })
    }
}

module.exports = { createPost, getAllPost, getSinglePost, deletePost }