#!/usr/bin/env node

import chalk from "chalk"
import { Command } from "commander"
import ora from "ora"
import {
    BOT_CONFIG,
    ERROR_MESSAGES,
    MESSAGE_TEMPLATES,
    SUCCESS_MESSAGES,
    TWITTER_CONFIG,
} from "./config"
import { PostDatabase } from "./database"
import { PostProcessor } from "./post-processor"
import { logger } from "./utils/logger"
import { XAPIClient } from "./x-api"

const program = new Command()

// Set up program metadata
program
    .name("suremark-bot")
    .description("SureMark Truth Seeking Agent - Phase 1")
    .version("1.0.0")

// Global error handler
process.on("unhandledRejection", (error) => {
    logger.error(`Unhandled rejection: ${error}`)
    process.exit(1)
})

// Tweet command
program
    .command("tweet")
    .description("Tweet about a verified post")
    .requiredOption("-u, --url <url>", "URL of the post to tweet about")
    .option("-m, --message <message>", "Custom verification message")
    .option(
        "-s, --username <username>",
        "SureMark username (if different from post author)"
    )
    .option("--dry-run", "Generate tweet without posting")
    .option(
        "--platform <platform>",
        "Specify platform (auto-detected if not provided)"
    )
    .action(async (options) => {
        const spinner = ora("Processing post...").start()

        try {
            // Validate credentials
            if (!XAPIClient.validateCredentials()) {
                spinner.fail(chalk.red(ERROR_MESSAGES.MISSING_CREDENTIALS))
                process.exit(1)
            }

            // Initialize components
            const xClient = new XAPIClient()
            const postProcessor = new PostProcessor()
            const database = new PostDatabase()

            await database.initialize()

            // Verify credentials
            spinner.text = "Verifying X API credentials..."
            const credentialsValid = await xClient.verifyCredentials()
            if (!credentialsValid) {
                spinner.fail(chalk.red(ERROR_MESSAGES.API_ERROR))
                process.exit(1)
            }

            // Check if post already processed
            spinner.text = "Checking if post already processed..."
            const isProcessed = await database.isPostProcessed(options.url)
            if (isProcessed) {
                spinner.fail(chalk.yellow(ERROR_MESSAGES.DUPLICATE_POST))
                process.exit(1)
            }

            // Process the post
            spinner.text = "Extracting content from post..."
            const postData = await postProcessor.processUrl(
                options.url,
                options.username
            )

            // Check if required data is available
            if (!postData.platform || !postData.url) {
                throw new Error("Failed to extract required platform or URL information")
            }

            // Generate verification message
            const verificationMessage =
                postProcessor.generateVerificationMessage(
                    postData.platform,
                    postData.suremark_username || "suremark_user",
                    BOT_CONFIG.SURMARK_DASHBOARD_URL,
                    options.message
                )

            if (options.dryRun) {
                // For dry run, save as processed but not successful
                await database.saveProcessedPost({
                    url: postData.url,
                    platform: postData.platform,
                    processedAt: new Date(),
                    suremarkUsername: postData.suremark_username || undefined,
                    title: postData.title || undefined,
                    content: postData.content || undefined,
                    author: postData.author || undefined,
                    success: false,
                })

                spinner.succeed(chalk.green(SUCCESS_MESSAGES.DRY_RUN))
                console.log(chalk.cyan("\nGenerated tweet:"))
                console.log(chalk.white(verificationMessage))
                console.log(
                    chalk.gray(
                        `\nTweet length: ${verificationMessage.length} characters`
                    )
                )
            } else {
                // Post tweet
                spinner.text = "Posting verification tweet..."
                const result = await xClient.postTweet(verificationMessage)

                if (result.success) {
                    // Save to database only after successful tweet posting
                    await database.saveSuccessfulPost(
                        {
                            url: postData.url,
                            platform: postData.platform,
                            processedAt: new Date(),
                            suremarkUsername: postData.suremark_username || undefined,
                            title: postData.title || undefined,
                            content: postData.content || undefined,
                            author: postData.author || undefined,
                        },
                        result.tweet_id!,
                        result.tweet_url!
                    )

                    spinner.succeed(chalk.green(SUCCESS_MESSAGES.TWEET_POSTED))
                    console.log(chalk.cyan(`\nTweet URL: ${result.tweet_url}`))
                    console.log(chalk.cyan(`Tweet ID: ${result.tweet_id}`))
                } else {
                    spinner.fail(chalk.red(result.error))
                    process.exit(1)
                }
            }

            await database.close()
        } catch (error: any) {
            spinner.fail(chalk.red(`Error: ${error.message}`))
            logger.error(`Tweet command error: ${error}`)
            process.exit(1)
        }
    })

// Batch command
program
    .command("batch")
    .description("Process multiple posts from a file")
    .requiredOption("-f, --file <file>", "File containing list of post URLs")
    .option("-d, --delay <seconds>", "Delay between tweets in seconds", "30")
    .option("-s, --username <username>", "SureMark username for all posts")
    .option("--dry-run", "Process without posting tweets")
    .action(async (options) => {
        const spinner = ora("Starting batch processing...").start()

        try {
            // Validate credentials
            if (!XAPIClient.validateCredentials()) {
                spinner.fail(chalk.red(ERROR_MESSAGES.MISSING_CREDENTIALS))
                process.exit(1)
            }

            // Read URLs from file
            const fs = require("fs")
            const urls = fs
                .readFileSync(options.file, "utf8")
                .split("\n")
                .map((line: string) => line.trim())
                .filter((line: string) => line && !line.startsWith("#"))

            if (urls.length === 0) {
                spinner.fail(chalk.red("No valid URLs found in file"))
                process.exit(1)
            }

            // Initialize components
            const xClient = new XAPIClient()
            const postProcessor = new PostProcessor()
            const database = new PostDatabase()

            await database.initialize()

            // Verify credentials
            spinner.text = "Verifying X API credentials..."
            const credentialsValid = await xClient.verifyCredentials()
            if (!credentialsValid) {
                spinner.fail(chalk.red(ERROR_MESSAGES.API_ERROR))
                process.exit(1)
            }

            let processed = 0
            let skipped = 0
            let failed = 0

            for (const url of urls) {
                try {
                    spinner.text = `Processing ${processed + 1}/${
                        urls.length
                    }: ${url}`

                    // Check if already processed
                    const isProcessed = await database.isPostProcessed(url)
                    if (isProcessed) {
                        skipped++
                        continue
                    }

                    // Process post
                    const postData = await postProcessor.processUrl(
                        url,
                        options.username
                    )

                    // Check if required data is available
                    if (!postData.platform || !postData.url) {
                        throw new Error("Failed to extract required platform or URL information")
                    }

                    // Generate message
                    const verificationMessage =
                        postProcessor.generateVerificationMessage(
                            postData.platform,
                            postData.suremark_username || "suremark_user",
                            BOT_CONFIG.SURMARK_DASHBOARD_URL
                        )

                    if (!options.dryRun) {
                        // Post tweet
                        const result = await xClient.postTweet(
                            verificationMessage
                        )

                        if (result.success) {
                            // Save to database only after successful tweet posting
                            await database.saveSuccessfulPost(
                                {
                                    url: postData.url,
                                    platform: postData.platform,
                                    processedAt: new Date(),
                                    suremarkUsername:
                                        postData.suremark_username || undefined,
                                    title: postData.title || undefined,
                                    content: postData.content || undefined,
                                    author: postData.author || undefined,
                                },
                                result.tweet_id!,
                                result.tweet_url!
                            )
                            processed++
                        } else {
                            failed++
                            logger.error(
                                `Failed to tweet for ${url}: ${result.error}`
                            )
                        }

                        // Delay between tweets
                        if (processed < urls.length) {
                            await new Promise((resolve) =>
                                setTimeout(
                                    resolve,
                                    parseInt(options.delay) * 1000
                                )
                            )
                        }
                    } else {
                        // For dry run, save as processed but not successful
                        await database.saveProcessedPost({
                            url: postData.url,
                            platform: postData.platform,
                            processedAt: new Date(),
                            suremarkUsername:
                                postData.suremark_username || undefined,
                            title: postData.title || undefined,
                            content: postData.content || undefined,
                            author: postData.author || undefined,
                            success: false,
                        })
                        processed++
                    }
                } catch (error: any) {
                    failed++
                    logger.error(`Error processing ${url}: ${error.message}`)
                }
            }

            spinner.succeed(chalk.green(SUCCESS_MESSAGES.BATCH_COMPLETED))
            console.log(chalk.cyan(`\nResults:`))
            console.log(chalk.green(`  Processed: ${processed}`))
            console.log(chalk.yellow(`  Skipped: ${skipped}`))
            console.log(chalk.red(`  Failed: ${failed}`))

            await database.close()
        } catch (error: any) {
            spinner.fail(chalk.red(`Error: ${error.message}`))
            logger.error(`Batch command error: ${error}`)
            process.exit(1)
        }
    })

// Monitor command
program
    .command("monitor")
    .description("Monitor a specific user or hashtag")
    .option("-u, --username <username>", "Username to monitor")
    .option("-t, --tag <hashtag>", "Hashtag to monitor")
    .option("-i, --interval <minutes>", "Check interval in minutes", "5")
    .action(async (options) => {
        if (!options.username && !options.tag) {
            console.error(
                chalk.red("Please specify either --username or --tag")
            )
            process.exit(1)
        }

        const spinner = ora("Starting monitoring...").start()

        try {
            // Validate credentials
            if (!XAPIClient.validateCredentials()) {
                spinner.fail(chalk.red(ERROR_MESSAGES.MISSING_CREDENTIALS))
                process.exit(1)
            }

            const xClient = new XAPIClient()

            // Verify credentials
            spinner.text = "Verifying X API credentials..."
            const credentialsValid = await xClient.verifyCredentials()
            if (!credentialsValid) {
                spinner.fail(chalk.red(ERROR_MESSAGES.API_ERROR))
                process.exit(1)
            }

            spinner.succeed(chalk.green("Monitoring started"))
            console.log(
                chalk.cyan(`\nMonitoring: ${options.username || options.tag}`)
            )
            console.log(chalk.cyan(`Interval: ${options.interval} minutes`))
            console.log(chalk.gray("\nPress Ctrl+C to stop monitoring"))

            // TODO: Implement monitoring logic
            // This would involve periodic API calls to check for new posts
            // and processing them automatically
        } catch (error: any) {
            spinner.fail(chalk.red(`Error: ${error.message}`))
            logger.error(`Monitor command error: ${error}`)
            process.exit(1)
        }
    })

// Stats command
program
    .command("stats")
    .description("Show processing statistics")
    .action(async () => {
        const spinner = ora("Loading statistics...").start()

        try {
            const database = new PostDatabase()
            await database.initialize()

            const stats = await database.getStatistics()

            spinner.succeed(chalk.green("Statistics loaded"))

            console.log(chalk.cyan("\n📊 Processing Statistics:"))
            console.log(chalk.white(`  Total posts processed: ${stats.total}`))
            console.log(chalk.green(`  Successful posts: ${stats.successful}`))
            console.log(chalk.red(`  Failed posts: ${stats.failed}`))
            console.log(chalk.white(`  Successful posts today: ${stats.today}`))
            console.log(chalk.white(`  Successful posts this week: ${stats.thisWeek}`))
            console.log(chalk.white(`  Successful posts this month: ${stats.thisMonth}`))

            if (Object.keys(stats.byPlatform).length > 0) {
                console.log(chalk.cyan("\n📱 By Platform:"))
                Object.entries(stats.byPlatform).forEach(
                    ([platform, count]) => {
                        console.log(chalk.white(`  ${platform}: ${count}`))
                    }
                )
            }

            if (Object.keys(stats.byUsername).length > 0) {
                console.log(chalk.cyan("\n👤 By SureMark Username:"))
                Object.entries(stats.byUsername).forEach(
                    ([username, count]) => {
                        console.log(chalk.white(`  @${username}: ${count}`))
                    }
                )
            }

            await database.close()
        } catch (error: any) {
            spinner.fail(chalk.red(`Error: ${error.message}`))
            logger.error(`Stats command error: ${error}`)
            process.exit(1)
        }
    })

// Search command
program
    .command("search")
    .description("Search processed posts")
    .requiredOption("-q, --query <query>", "Search query")
    .option("-l, --limit <number>", "Maximum number of results", "20")
    .action(async (options) => {
        const spinner = ora("Searching posts...").start()

        try {
            const database = new PostDatabase()
            await database.initialize()

            const posts = await database.searchPosts(
                options.query,
                parseInt(options.limit)
            )

            spinner.succeed(chalk.green(`Found ${posts.length} posts`))

            if (posts.length > 0) {
                console.log(chalk.cyan("\n🔍 Search Results:"))
                posts.forEach((post, index) => {
                    console.log(
                        chalk.white(
                            `\n${index + 1}. ${post.title || "Untitled"}`
                        )
                    )
                    console.log(chalk.gray(`   Platform: ${post.platform}`))
                    console.log(chalk.gray(`   URL: ${post.url}`))
                    if (post.suremarkUsername) {
                        console.log(
                            chalk.gray(
                                `   Verified by: @${post.suremarkUsername}`
                            )
                        )
                    }
                    if (post.tweet?.url) {
                        console.log(chalk.blue(`   Tweet: ${post.tweet.url}`))
                    }
                })
            } else {
                console.log(chalk.yellow("No posts found matching your query."))
            }

            await database.close()
        } catch (error: any) {
            spinner.fail(chalk.red(`Error: ${error.message}`))
            logger.error(`Search command error: ${error}`)
            process.exit(1)
        }
    })

// Parse command line arguments
program.parse()
