import { TwitterApi } from "twitter-api-v2"
import {
    ERROR_MESSAGES,
    PROCESSING_CONFIG,
    SUCCESS_MESSAGES,
    TweetResult,
    TWITTER_CONFIG,
} from "./config"
import { logger } from "./utils/logger"

export class XAPIClient {
    private client: TwitterApi

    constructor() {
        this.client = new TwitterApi({
            appKey: TWITTER_CONFIG.API_KEY,
            appSecret: TWITTER_CONFIG.API_SECRET,
            accessToken: TWITTER_CONFIG.ACCESS_TOKEN,
            accessSecret: TWITTER_CONFIG.ACCESS_TOKEN_SECRET,
        })
    }

    /**
     * Post a tweet using X API v2
     */
    async postTweet(message: string, replyTo?: string): Promise<TweetResult> {
        try {
            // Validate tweet length
            if (message.length > PROCESSING_CONFIG.MAX_TWEET_LENGTH) {
                return {
                    success: false,
                    error: ERROR_MESSAGES.TWEET_TOO_LONG,
                }
            }

            // Prepare tweet parameters
            const tweetParams: any = { text: message }

            if (replyTo) {
                tweetParams.reply = { in_reply_to_tweet_id: replyTo }
            }

            // Post tweet
            const tweet = await this.client.v2.tweet(tweetParams)

            if (tweet.data) {
                const tweetId = tweet.data.id
                const tweetUrl = `https://twitter.com/user/status/${tweetId}`

                logger.info(`Tweet posted successfully. ID: ${tweetId}`)

                return {
                    success: true,
                    tweet_id: tweetId,
                    tweet_url: tweetUrl,
                    message: SUCCESS_MESSAGES.TWEET_POSTED,
                }
            } else {
                throw new Error("No response data received from X API")
            }
        } catch (error: any) {
            if (error.code === 429) {
                logger.warn("Rate limit exceeded")
                return {
                    success: false,
                    error: ERROR_MESSAGES.RATE_LIMIT,
                    retry_after: 900, // 15 minutes
                }
            }

            // Log detailed error information
            logger.error(`X API error details:`, {
                message: error.message,
                code: error.code,
                data: error.data,
                errors: error.errors,
                status: error.status
            })
            
            return {
                success: false,
                error: `X API error: ${error.message}`,
            }
        }
    }

    /**
     * Reply to a specific tweet
     */
    async replyToTweet(tweetId: string, message: string): Promise<TweetResult> {
        return this.postTweet(message, tweetId)
    }

    /**
     * Get information about a specific tweet
     */
    async getTweetInfo(
        tweetId: string
    ): Promise<{ success: boolean; tweet?: any; error?: string }> {
        try {
            const tweet = await this.client.v2.singleTweet(tweetId, {
                expansions: ["author_id", "referenced_tweets.id"],
                "user.fields": ["username", "name"],
            })

            if (tweet.data) {
                return {
                    success: true,
                    tweet: tweet.data,
                }
            } else {
                return {
                    success: false,
                    error: "Tweet not found",
                }
            }
        } catch (error: any) {
            logger.error(`Error getting tweet info: ${error.message}`)
            return {
                success: false,
                error: error.message,
            }
        }
    }

    /**
     * Verify that the API credentials are valid
     */
    async verifyCredentials(): Promise<boolean> {
        try {
            const me = await this.client.v2.me()
            if (me.data) {
                logger.info(
                    `Credentials verified. Bot username: @${me.data.username}`
                )
                return true
            }
            return false
        } catch (error: any) {
            logger.error(`Credential verification failed: ${error.message}`)
            return false
        }
    }

    /**
     * Get current rate limit status
     */
    // async getRateLimitStatus(): Promise<{
    //     success: boolean
    //     limits?: any
    //     error?: string
    // }> {
    //     // Not supported in twitter-api-v2
    //     return { success: false, error: 'Not supported' };
    // }

    /**
     * Search for tweets matching a query
     */
    async searchTweets(
        query: string,
        count: number = 10
    ): Promise<{ success: boolean; tweets?: any[]; error?: string }> {
        try {
            const paginator = await this.client.v2.search(query, {
                max_results: Math.min(count, 100),
                "tweet.fields": ["created_at", "author_id", "text"],
                "user.fields": ["username", "name"],
            })
            const tweets: any[] = []
            for await (const tweet of paginator) {
                tweets.push(tweet)
                if (tweets.length >= count) break
            }
            return {
                success: true,
                tweets,
            }
        } catch (error: any) {
            logger.error(`Error searching tweets: ${error.message}`)
            return {
                success: false,
                error: error.message,
            }
        }
    }

    /**
     * Check if credentials are properly configured
     */
    static validateCredentials(): boolean {
        const required = [
            TWITTER_CONFIG.API_KEY,
            TWITTER_CONFIG.API_SECRET,
            TWITTER_CONFIG.ACCESS_TOKEN,
            TWITTER_CONFIG.ACCESS_TOKEN_SECRET,
        ]

        return required.every(
            (credential) => credential && credential.length > 0
        )
    }
}
