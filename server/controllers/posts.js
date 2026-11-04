import schemas from "../core/schemas.js";
import { checkAuth, ClientError } from "../core/utils.js";
import errors from "../../shared/errors.js";
import express from "express";
import mongoose from "mongoose";
import {
    editPostsValidator,
    getPostValidator,
    commentsValidator,
    editCommentValidator,
    getCommentValidator
} from "../core/validators.js";
const router = express.Router();

router.post("/posts/:id/like", checkAuth, getPostValidator, async (req, res) => {
    const session = await mongoose.startSession();
    const id = req.cleanData.id;

    try {
        await session.withTransaction(async () => {
            const result = await schemas.Posts.findByIdAndUpdate(id, {
                $inc: {
                    likes: 1
                }
            }, {
                session
            });

            if (result.matchedCount === 0) throw new ClientError(errors.ACCESS_DENIED("post"), 404);

            await schemas.Likes.create([{ by: req.session.userId, for: id }], { session });
        });
    } finally {
        await session.endSession();
    }

    return res.status(201).json({ success: true });
});

router.put("/posts/:id/update", checkAuth, editPostsValidator, async (req, res) => {
    const { content, title, id } = req.cleanData;

    const result = await schemas.Posts.updateOne({
        _id: id,
        by: req.session.userId
    }, [
        {
            $set: {
                title: {
                    $cond: [{ $eq: ["$title", { $literal: title }] }, "$title", { $literal: title }]
                },
                content: {
                    $cond: [{ $eq: ["$content", { $literal: content }] }, "$content", { $literal: content }]
                },
                updatedAt: {
                    $cond: [
                        { $and: [{ $eq: ["$title", { $literal: title }] }, { $eq: ["$content", { $literal: content }] }] },
                        "$updatedAt",
                        "$$NOW"
                    ]
                }
            }
        }
    ], {
        timestamps: false
    });

    if (result.matchedCount === 0) return res.status(404).json({ error: errors.NOT_FOUND("Post") });

    return res.status(200).json({
        changed: result.modifiedCount !== 0,
        success: true
    });
});

router.delete("/posts/:id/delete", checkAuth, getPostValidator, async function (req, res) {
    const session = await mongoose.startSession();
    const id = req.cleanData.id;

    try {
        await session.withTransaction(async () => {
            const result = await schemas.Posts.deleteOne({
                _id: id,
                by: req.session.userId
            }, { session });
            if (result.deletedCount === 0) throw new ClientError(errors.ACCESS_DENIED("post"), 404);

            // Not bad for small scale ;)
            await schemas.Likes.deleteMany({ for: id }, { session });
            await schemas.Comments.deleteMany({ for: id }, { session });
            await schemas.Bookmarks.deleteMany({ for: id }, { session });
        });
    } finally {
        await session.endSession();
    }

    return res.status(200).json({ success: true });
});

router.post("/posts/:id/comments", checkAuth, commentsValidator, async (req, res) => {
    const { id, content } = req.cleanData;
    const post = await schemas.Posts.exists({ _id: id });
    if (!post) return res.status(404).json({ error: errors.NOT_FOUND("Post") });

    await schemas.Comments.create({ content, for: id, by: req.session.userId });
    return res.status(201).json({ success: true });
});

router.put("/comments/:id/update", checkAuth, editCommentValidator, async (req, res) => {
    const { id, content } = req.cleanData;

    const result = await schemas.Comments.updateOne({
        _id: id,
        by: req.session.userId
    },
        [
            {
                $set: {
                    content: {
                        $cond: [{ $eq: ["$content", { $literal: content }] }, "$content", { $literal: content }]
                    },

                    editedAt: {
                        $cond: [{ $eq: ["$content", { $literal: content }] }, "$editedAt", "$$NOW"]
                    },

                    updatedAt: {
                        $cond: [{ $eq: ["$content", { $literal: content }] }, "$updatedAt", "$$NOW"]
                    }
                }
            }
        ], {
        timestamps: false
    });

    if (result.matchedCount === 0) return res.status(404).json({ error: errors.NOT_FOUND("Comment") });

    return res.status(200).json({
        changed: result.modifiedCount !== 0,
        success: true
    });
});

router.delete("/comments/:id/delete", checkAuth, getCommentValidator, async function (req, res) {
    const id = req.cleanData.id;
    const result = await schemas.Comments.deleteOne({ _id: id, by: req.session.userId });
    if (result.deletedCount === 0) return res.status(404).json({ error: errors.ACCESS_DENIED("comment") });

    return res.status(200).json({ success: true });
});

export default router;