const express = require('express');
const logger = require('../utils/logger');
const { validateCreatePost } = require('../utils/validations');
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

    } catch(error){
        logger.warn("Error getting Post post", error);
        res.status(500).json({
            success: false,
            message: "Error getting Post post"
        })
    }
}

module.exports = { createPost }