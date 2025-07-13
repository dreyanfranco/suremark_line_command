import dotenv from "dotenv"

// Load environment variables
dotenv.config()

// X (Twitter) API Configuration
export const TWITTER_CONFIG = {
    API_KEY: process.env.TWITTER_API_KEY || "",
    API_SECRET: process.env.TWITTER_API_SECRET || "",
    ACCESS_TOKEN: process.env.TWITTER_ACCESS_TOKEN || "",
    ACCESS_TOKEN_SECRET: process.env.TWITTER_ACCESS_TOKEN_SECRET || "",
    BEARER_TOKEN: process.env.TWITTER_BEARER_TOKEN || "",
}

// Bot Configuration
export const BOT_CONFIG = {
    USERNAME: process.env.BOT_USERNAME || "SureMarkTruthAgent",
    SURMARK_DASHBOARD_URL:
        process.env.SURMARK_DASHBOARD_URL || "https://suremark.com/dashboard",
}

// Message Templates
export const MESSAGE_TEMPLATES = {
    DEFAULT: `This post is verified by @{suremark_username} using SureMark Digital. 
Check the SureMark dashboard for more recent posts: {dashboard_url}`,

    CUSTOM: `✅ Verified by @{suremark_username} via SureMark Digital
🔍 Check more verified content: {dashboard_url}`,

    SHORT: `Verified by @{suremark_username} using SureMark Digital. 
More at: {dashboard_url}`,

    PLATFORM_SPECIFIC: {
        twitter: `This post is verified by @{suremark_username} using SureMark Digital. 
Check the SureMark dashboard for more recent posts: {dashboard_url}`,

        instagram: `📸 This Instagram post is verified by @{suremark_username} using SureMark Digital.
Check more verified content: {dashboard_url}`,

        youtube: `🎥 This YouTube video is verified by @{suremark_username} using SureMark Digital.
Check more verified content: {dashboard_url}`,

        website: `🌐 This content is verified by @{suremark_username} using SureMark Digital.
Check more verified content: {dashboard_url}`,

        article: `📰 This article is verified by @{suremark_username} using SureMark Digital.
Check more verified content: {dashboard_url}`,
    },
}

// API Rate Limits (requests per 15 minutes)
export const RATE_LIMITS = {
    TWEETS: 300,
    REPLIES: 300,
    MENTIONS: 75,
}

// Processing Configuration
export const PROCESSING_CONFIG = {
    DEFAULT_DELAY_BETWEEN_TWEETS: 30, // seconds
    DEFAULT_MONITOR_INTERVAL: 5, // minutes
    MAX_TWEET_LENGTH: 280,
    MAX_URL_LENGTH: 23, // Twitter's t.co URL length
}

// Database Configuration
export const DATABASE_CONFIG = {
    URI: process.env.MONGODB_URI || "mongodb://localhost:27017",
    DATABASE: process.env.MONGODB_DATABASE || "suremark_bot",
    COLLECTION: "processed_posts",
}

// Logging Configuration
export const LOGGING_CONFIG = {
    FILE: "suremark_bot.log",
    LEVEL: "info",
}

// Supported Platforms
export const SUPPORTED_PLATFORMS: Record<string, string> = {
    "twitter.com": "twitter",
    "x.com": "twitter",
    "instagram.com": "instagram",
    "youtube.com": "youtube",
    "youtu.be": "youtube",
}

// Content Extraction Settings
export const CONTENT_CONFIG = {
    MAX_CONTENT_LENGTH: 1000, // characters to extract from content
    DEFAULT_TITLE_LENGTH: 100, // characters for title truncation
}

// Error Messages
export const ERROR_MESSAGES = {
    API_ERROR: "Failed to connect to X API. Please check your credentials.",
    RATE_LIMIT: "Rate limit exceeded. Please wait before trying again.",
    INVALID_URL: "Invalid URL provided. Please check the format.",
    DUPLICATE_POST: "This post has already been processed.",
    CONTENT_EXTRACTION_FAILED:
        "Failed to extract content from the provided URL.",
    TWEET_TOO_LONG:
        "Generated tweet exceeds maximum length. Please use a shorter message.",
    MISSING_CREDENTIALS:
        "Missing required X API credentials. Please check your .env file.",
}

// Success Messages
export const SUCCESS_MESSAGES = {
    TWEET_POSTED: "Verification tweet posted successfully!",
    DRY_RUN: "Dry run completed. Tweet would have been posted.",
    BATCH_COMPLETED: "Batch processing completed successfully.",
    CONTENT_EXTRACTED: "Content extracted successfully from URL.",
    CREDENTIALS_VERIFIED: "X API credentials verified successfully.",
}

// Types
export interface PostData {
    url?: string | undefined
    platform?: string | undefined
    title?: string | undefined
    content?: string | undefined
    author?: string | undefined
    timestamp?: Date | undefined
    suremark_username?: string | undefined
}

export interface TweetResult {
    success: boolean
    tweet_id?: string
    tweet_url?: string
    message?: string
    error?: string
    retry_after?: number
}

export interface ProcessedPost {
    _id?: string
    url: string
    platform: string
    processedAt: Date
    suremarkUsername?: string | undefined
    title?: string | undefined
    content?: string | undefined
    author?: string | undefined
    success?: boolean | undefined
    tweet?:
        | {
              id: string
              url: string
              postedAt: Date
          }
        | undefined
    metadata?:
        | {
              hashtags?: string[]
              mentions?: string[]
              mediaUrls?: string[]
          }
        | undefined
}
