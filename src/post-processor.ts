import axios from "axios"
import * as cheerio from "cheerio"
import {
    CONTENT_CONFIG,
    ERROR_MESSAGES,
    MESSAGE_TEMPLATES,
    PostData,
    SUCCESS_MESSAGES,
    SUPPORTED_PLATFORMS,
} from "./config"
import { logger } from "./utils/logger"

export class PostProcessor {
    /**
     * Process a URL and extract relevant information
     */
    async processUrl(
        url: string,
        suremarkUsername?: string
    ): Promise<PostData> {
        try {
            // Validate URL
            if (!this.isValidUrl(url)) {
                throw new Error(ERROR_MESSAGES.INVALID_URL)
            }

            // Detect platform
            const platform = this.detectPlatform(url)

            // Extract content based on platform
            const content = await this.extractContent(url, platform)

            return {
                url,
                platform,
                title: content.title ?? undefined,
                content: content.content ?? undefined,
                author: content.author ?? undefined,
                timestamp: content.timestamp ?? undefined,
                suremark_username: suremarkUsername ?? undefined,
            }
        } catch (error: any) {
            logger.error(`Error processing URL ${url}: ${error.message}`)
            throw error
        }
    }

    /**
     * Detect platform from URL
     */
    private detectPlatform(url: string): string {
        const urlObj = new URL(url)
        const hostname = urlObj.hostname.toLowerCase()

        // Check for exact matches
        for (const [domain, platform] of Object.entries(SUPPORTED_PLATFORMS)) {
            if (hostname.includes(domain)) {
                return platform
            }
        }

        // Default to website for unknown platforms
        return "website"
    }

    /**
     * Extract content from URL based on platform
     */
    private async extractContent(
        url: string,
        platform: string
    ): Promise<{
        title?: string
        content?: string
        author?: string
        timestamp?: Date
    }> {
        switch (platform) {
            case "twitter":
                return this.extractTwitterContent(url)
            case "instagram":
                return this.extractInstagramContent(url)
            case "youtube":
                return this.extractYouTubeContent(url)
            default:
                return this.extractWebsiteContent(url)
        }
    }

    /**
     * Extract content from Twitter/X posts
     * Note: For now, returns generic content since X API content extraction 
     * requires additional setup. This can be enhanced later.
     */
    private async extractTwitterContent(url: string): Promise<{
        title?: string
        content?: string
        author?: string
        timestamp?: Date
    }> {
        try {
            // Extract tweet ID from URL
            const tweetId = this.extractTweetId(url)
            if (!tweetId) {
                throw new Error("Could not extract tweet ID from URL")
            }

            // For now, return generic content with the tweet ID
            // TODO: Implement X API tweet lookup when needed
            const result: {
                title?: string
                content?: string
                author?: string
                timestamp?: Date
            } = {
                title: "X/Twitter Post",
                content: `Post from X/Twitter (ID: ${tweetId})`,
                timestamp: new Date(),
            }
            
            return result
        } catch (error: any) {
            logger.warn(`Failed to extract Twitter content:`, {
                message: error.message,
                url: url
            })
            return {
                title: "X/Twitter Post",
                content: "Verified content from X/Twitter",
                timestamp: new Date(),
            }
        }
    }

    /**
     * Extract tweet ID from Twitter/X URL
     */
    private extractTweetId(url: string): string | null {
        try {
            const urlObj = new URL(url)
            const pathParts = urlObj.pathname.split('/')
            const statusIndex = pathParts.indexOf('status')
            
            if (statusIndex !== -1 && statusIndex + 1 < pathParts.length) {
                const tweetId = pathParts[statusIndex + 1]
                return tweetId || null
            }
            
            return null
        } catch {
            return null
        }
    }

    /**
     * Extract content from Instagram posts
     */
    private async extractInstagramContent(url: string): Promise<{
        title?: string
        content?: string
        author?: string
        timestamp?: Date
    }> {
        try {
            const response = await axios.get(url, {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
                timeout: 10000,
            })

            const $ = cheerio.load(response.data)

            // Extract Instagram post content
            const content =
                $('meta[property="og:description"]').attr("content") ||
                $(".caption").text() ||
                $('[data-testid="post-caption"]').text()

            // Extract author
            const author =
                $('meta[property="og:title"]')
                    .attr("content")
                    ?.split(" on Instagram")[0] || $(".username").text()

            const result: {
                title?: string
                content?: string
                author?: string
                timestamp?: Date
            } = {
                title: `Instagram Post by ${author ?? ""}`,
                timestamp: new Date(),
            }
            
            if (content) {
                result.content = content.substring(
                    0,
                    CONTENT_CONFIG.MAX_CONTENT_LENGTH
                )
            }
            
            if (author) {
                result.author = author
            }
            
            return result
        } catch (error) {
            logger.warn(`Failed to extract Instagram content: ${error}`)
            return {
                title: "Instagram Post",
                content: "Content from Instagram",
                timestamp: new Date(),
            }
        }
    }

    /**
     * Extract content from YouTube videos
     */
    private async extractYouTubeContent(url: string): Promise<{
        title?: string
        content?: string
        author?: string
        timestamp?: Date
    }> {
        try {
            const response = await axios.get(url, {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
                timeout: 10000,
            })

            const $ = cheerio.load(response.data)

            // Extract video title
            const title =
                $('meta[property="og:title"]').attr("content") ||
                $("title").text() ||
                $(".title").text()

            // Extract channel name
            const author =
                $('meta[name="author"]').attr("content") ||
                $(".channel-name").text() ||
                $('[data-testid="channel-name"]').text()

            // Extract description
            const description =
                $('meta[property="og:description"]').attr("content") ||
                $(".description").text()

            const result: {
                title?: string
                content?: string
                author?: string
                timestamp?: Date
            } = {
                timestamp: new Date(),
            }
            
            if (title) {
                result.title = title.substring(0, CONTENT_CONFIG.DEFAULT_TITLE_LENGTH)
            }
            
            if (description) {
                result.content = description.substring(
                    0,
                    CONTENT_CONFIG.MAX_CONTENT_LENGTH
                )
            }
            
            if (author) {
                result.author = author
            }
            
            return result
        } catch (error) {
            logger.warn(`Failed to extract YouTube content: ${error}`)
            return {
                title: "YouTube Video",
                content: "Content from YouTube",
                timestamp: new Date(),
            }
        }
    }

    /**
     * Extract content from general websites
     */
    private async extractWebsiteContent(url: string): Promise<{
        title?: string
        content?: string
        author?: string
        timestamp?: Date
    }> {
        try {
            const response = await axios.get(url, {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
                timeout: 10000,
            })

            const $ = cheerio.load(response.data)

            // Extract title
            const title =
                $('meta[property="og:title"]').attr("content") ||
                $("title").text() ||
                $("h1").first().text()

            // Extract description/content
            const content =
                $('meta[property="og:description"]').attr("content") ||
                $('meta[name="description"]').attr("content") ||
                $("p").first().text()

            // Extract author
            const author =
                $('meta[name="author"]').attr("content") ||
                $(".author").text() ||
                $("[data-author]").attr("data-author")

            const result: {
                title?: string
                content?: string
                author?: string
                timestamp?: Date
            } = {
                timestamp: new Date(),
            }
            
            if (title) {
                result.title = title.substring(0, CONTENT_CONFIG.DEFAULT_TITLE_LENGTH)
            }
            
            if (content) {
                result.content = content.substring(0, CONTENT_CONFIG.MAX_CONTENT_LENGTH)
            }
            
            if (author) {
                result.author = author
            }
            
            return result
        } catch (error) {
            logger.warn(`Failed to extract website content: ${error}`)
            return {
                title: "Website Content",
                content: "Content from website",
                timestamp: new Date(),
            }
        }
    }

    /**
     * Validate URL format
     */
    private isValidUrl(url: string): boolean {
        try {
            new URL(url)
            return true
        } catch {
            return false
        }
    }

    /**
     * Generate verification message based on platform and content
     */
    generateVerificationMessage(
        platform: string,
        suremarkUsername: string,
        dashboardUrl: string,
        customMessage?: string
    ): string {
        if (customMessage) {
            return customMessage
                .replace("@{suremark_username}", `@${suremarkUsername}`)
                .replace("{dashboard_url}", dashboardUrl)
        }

        const template =
            MESSAGE_TEMPLATES.PLATFORM_SPECIFIC[
                platform as keyof typeof MESSAGE_TEMPLATES.PLATFORM_SPECIFIC
            ] || MESSAGE_TEMPLATES.DEFAULT

        return template
            .replace("@{suremark_username}", `@${suremarkUsername}`)
            .replace("{dashboard_url}", dashboardUrl)
    }
}
