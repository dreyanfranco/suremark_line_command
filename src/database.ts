import { Collection, Db, MongoClient, ObjectId } from "mongodb"
import { DATABASE_CONFIG, ProcessedPost } from "./config"
import { logger } from "./utils/logger"

export class PostDatabase {
    private client: MongoClient | null = null
    private db: Db | null = null
    private collection: Collection | null = null

    /**
     * Initialize database connection and create indexes
     */
    async initialize(): Promise<void> {
        try {
            this.client = new MongoClient(DATABASE_CONFIG.URI)
            await this.client.connect()

            this.db = this.client.db(DATABASE_CONFIG.DATABASE)
            this.collection = this.db.collection(DATABASE_CONFIG.COLLECTION)

            // Create indexes for better performance
            await this.collection.createIndex({ url: 1 }, { unique: true })
            await this.collection.createIndex({ processedAt: -1 })
            await this.collection.createIndex({ platform: 1 })
            await this.collection.createIndex({ suremarkUsername: 1 })

            logger.info("MongoDB database initialized successfully")
        } catch (error) {
            logger.error(`Database initialization failed: ${error}`)
            throw error
        }
    }

    /**
     * Check if a post has already been successfully processed
     */
    async isPostProcessed(url: string): Promise<boolean> {
        if (!this.collection) {
            throw new Error("Database not initialized")
        }

        try {
            const result = await this.collection.findOne({ 
                url, 
                success: { $eq: true } 
            })
            return !!result
        } catch (error) {
            logger.error(`Error checking if post is processed: ${error}`)
            return false
        }
    }

    /**
     * Save a processed post to the database
     */
    async saveProcessedPost(post: ProcessedPost): Promise<void> {
        if (!this.collection) {
            throw new Error("Database not initialized")
        }

        try {
            const document = {
                url: post.url,
                platform: post.platform,
                processedAt: post.processedAt,
                suremarkUsername: post.suremarkUsername,
                title: post.title,
                content: post.content,
                author: post.author,
                success: post.success,
                metadata: post.metadata,
            }

            await this.collection.insertOne(document)
            logger.info(`Saved processed post: ${post.url}`)
        } catch (error: any) {
            if (error.code === 11000) {
                // Duplicate key error (URL already exists)
                logger.warn(`Post already exists: ${post.url}`)
                return
            }
            logger.error(`Error saving processed post: ${error}`)
            throw error
        }
    }

    /**
     * Save a successfully processed post with tweet info
     */
    async saveSuccessfulPost(post: ProcessedPost, tweetId: string, tweetUrl: string): Promise<void> {
        if (!this.collection) {
            throw new Error("Database not initialized")
        }

        try {
            const document = {
                url: post.url,
                platform: post.platform,
                processedAt: post.processedAt,
                suremarkUsername: post.suremarkUsername,
                title: post.title,
                content: post.content,
                author: post.author,
                success: true,
                tweet: {
                    id: tweetId,
                    url: tweetUrl,
                    postedAt: new Date(),
                },
                metadata: post.metadata,
            }

            await this.collection.insertOne(document)
            logger.info(`Saved successful post: ${post.url}`)
        } catch (error: any) {
            if (error.code === 11000) {
                // Duplicate key error (URL already exists)
                logger.warn(`Post already exists: ${post.url}`)
                return
            }
            logger.error(`Error saving successful post: ${error}`)
            throw error
        }
    }

    /**
     * Update tweet information for a processed post
     */
    async updateTweetInfo(
        url: string,
        tweetId: string,
        tweetUrl: string
    ): Promise<void> {
        if (!this.collection) {
            throw new Error("Database not initialized")
        }

        try {
            await this.collection.updateOne(
                { url },
                {
                    $set: {
                        tweet: {
                            id: tweetId,
                            url: tweetUrl,
                            postedAt: new Date(),
                        },
                    },
                }
            )

            logger.info(`Updated tweet info for post: ${url}`)
        } catch (error) {
            logger.error(`Error updating tweet info: ${error}`)
            throw error
        }
    }

    /**
     * Get all processed posts
     */
    async getProcessedPosts(limit: number = 100): Promise<ProcessedPost[]> {
        if (!this.collection) {
            throw new Error("Database not initialized")
        }

        try {
            const cursor = this.collection
                .find({})
                .sort({ processedAt: -1 })
                .limit(limit)
            const documents = await cursor.toArray()

            return documents.map((doc) => ({
                _id: doc._id?.toString(),
                url: doc.url,
                platform: doc.platform,
                processedAt: doc.processedAt,
                suremarkUsername: doc.suremarkUsername,
                title: doc.title,
                content: doc.content,
                author: doc.author,
                tweet: doc.tweet,
                metadata: doc.metadata,
            }))
        } catch (error) {
            logger.error(`Error getting processed posts: ${error}`)
            return []
        }
    }

    /**
     * Get processed posts by platform
     */
    async getProcessedPostsByPlatform(
        platform: string,
        limit: number = 50
    ): Promise<ProcessedPost[]> {
        if (!this.collection) {
            throw new Error("Database not initialized")
        }

        try {
            const cursor = this.collection
                .find({ platform })
                .sort({ processedAt: -1 })
                .limit(limit)
            const documents = await cursor.toArray()

            return documents.map((doc) => ({
                _id: doc._id?.toString(),
                url: doc.url,
                platform: doc.platform,
                processedAt: doc.processedAt,
                suremarkUsername: doc.suremarkUsername,
                title: doc.title,
                content: doc.content,
                author: doc.author,
                tweet: doc.tweet,
                metadata: doc.metadata,
            }))
        } catch (error) {
            logger.error(`Error getting processed posts by platform: ${error}`)
            return []
        }
    }

    /**
     * Get processed posts by SureMark username
     */
    async getProcessedPostsByUsername(
        username: string,
        limit: number = 50
    ): Promise<ProcessedPost[]> {
        if (!this.collection) {
            throw new Error("Database not initialized")
        }

        try {
            const cursor = this.collection
                .find({ suremarkUsername: username })
                .sort({ processedAt: -1 })
                .limit(limit)
            const documents = await cursor.toArray()

            return documents.map((doc) => ({
                _id: doc._id?.toString(),
                url: doc.url,
                platform: doc.platform,
                processedAt: doc.processedAt,
                suremarkUsername: doc.suremarkUsername,
                title: doc.title,
                content: doc.content,
                author: doc.author,
                tweet: doc.tweet,
                metadata: doc.metadata,
            }))
        } catch (error) {
            logger.error(`Error getting processed posts by username: ${error}`)
            return []
        }
    }

    /**
     * Get statistics about processed posts
     */
    async getStatistics(): Promise<{
        total: number
        successful: number
        failed: number
        byPlatform: Record<string, number>
        byUsername: Record<string, number>
        today: number
        thisWeek: number
        thisMonth: number
    }> {
        if (!this.collection) {
            throw new Error("Database not initialized")
        }

        try {
            // Total posts
            const total = await this.collection.countDocuments()
            const successful = await this.collection.countDocuments({ success: true })
            const failed = await this.collection.countDocuments({ success: false })

            // Posts by platform (only successful ones)
            const platformPipeline = [
                { $match: { success: true } },
                { $group: { _id: "$platform", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]
            const platformResults = await this.collection
                .aggregate(platformPipeline)
                .toArray()

            const byPlatform: Record<string, number> = {}
            platformResults.forEach((result: any) => {
                byPlatform[result._id] = result.count
            })

            // Posts by username (only successful ones)
            const usernamePipeline = [
                { $match: { success: true, suremarkUsername: { $exists: true, $ne: null } } },
                { $group: { _id: "$suremarkUsername", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]
            const usernameResults = await this.collection
                .aggregate(usernamePipeline)
                .toArray()

            const byUsername: Record<string, number> = {}
            usernameResults.forEach((result: any) => {
                byUsername[result._id] = result.count
            })

            // Posts today (only successful ones)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const todayCount = await this.collection.countDocuments({
                processedAt: { $gte: today },
                success: true,
            })

            // Posts this week (only successful ones)
            const thisWeek = new Date()
            thisWeek.setDate(thisWeek.getDate() - 7)
            const weekCount = await this.collection.countDocuments({
                processedAt: { $gte: thisWeek },
                success: true,
            })

            // Posts this month (only successful ones)
            const thisMonth = new Date()
            thisMonth.setDate(1)
            thisMonth.setHours(0, 0, 0, 0)
            const monthCount = await this.collection.countDocuments({
                processedAt: { $gte: thisMonth },
                success: true,
            })

            return {
                total,
                successful,
                failed,
                byPlatform,
                byUsername,
                today: todayCount,
                thisWeek: weekCount,
                thisMonth: monthCount,
            }
        } catch (error) {
            logger.error(`Error getting statistics: ${error}`)
            return {
                total: 0,
                successful: 0,
                failed: 0,
                byPlatform: {},
                byUsername: {},
                today: 0,
                thisWeek: 0,
                thisMonth: 0,
            }
        }
    }

    /**
     * Search posts by content or title
     */
    async searchPosts(
        query: string,
        limit: number = 20
    ): Promise<ProcessedPost[]> {
        if (!this.collection) {
            throw new Error("Database not initialized")
        }

        try {
            const cursor = this.collection
                .find({
                    $or: [
                        { title: { $regex: query, $options: "i" } },
                        { content: { $regex: query, $options: "i" } },
                        { author: { $regex: query, $options: "i" } },
                    ],
                })
                .sort({ processedAt: -1 })
                .limit(limit)

            const documents = await cursor.toArray()

            return documents.map((doc) => ({
                _id: doc._id?.toString(),
                url: doc.url,
                platform: doc.platform,
                processedAt: doc.processedAt,
                suremarkUsername: doc.suremarkUsername,
                title: doc.title,
                content: doc.content,
                author: doc.author,
                tweet: doc.tweet,
                metadata: doc.metadata,
            }))
        } catch (error) {
            logger.error(`Error searching posts: ${error}`)
            return []
        }
    }

    /**
     * Delete a processed post (for cleanup)
     */
    async deletePost(url: string): Promise<boolean> {
        if (!this.collection) {
            throw new Error("Database not initialized")
        }

        try {
            const result = await this.collection.deleteOne({ url })
            if (result.deletedCount > 0) {
                logger.info(`Deleted post: ${url}`)
                return true
            }
            return false
        } catch (error) {
            logger.error(`Error deleting post: ${error}`)
            return false
        }
    }

    /**
     * Close database connection
     */
    async close(): Promise<void> {
        if (this.client) {
            await this.client.close()
            this.client = null
            this.db = null
            this.collection = null
            logger.info("MongoDB connection closed")
        }
    }
}
