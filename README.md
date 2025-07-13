# SureMark Truth Seeking Agent - Phase 1

A TypeScript command-line tool that automatically tweets about verified posts from any platform using the X (Twitter) API.

## Features

-   **Universal Post Support**: Handles posts from any platform (Twitter, Instagram, YouTube, websites, etc.)
-   **X API Integration**: Automatically posts verification tweets using Twitter API v2
-   **Smart Content Processing**: Extracts relevant information from various post types
-   **Duplicate Prevention**: Tracks processed posts to avoid duplicate tweets
-   **Configurable Messaging**: Customizable verification message templates
-   **Batch Processing**: Process multiple posts from a file
-   **Statistics**: Track processing metrics and performance

## Prerequisites

-   Node.js 18+
-   npm or yarn
-   MongoDB (local installation or MongoDB Atlas)
-   X (Twitter) Developer Account with API access

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Build the Project

```bash
npm run build
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# X (Twitter) API Credentials
TWITTER_API_KEY=your_api_key_here
TWITTER_API_SECRET=your_api_secret_here
TWITTER_ACCESS_TOKEN=your_access_token_here
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret_here
TWITTER_BEARER_TOKEN=your_bearer_token_here

# Bot Configuration
BOT_USERNAME=SureMarkTruthAgent
SURMARK_DASHBOARD_URL=https://suremark.com/dashboard

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=suremark_bot
```

### 4. Set Up MongoDB

**Option A: Local MongoDB**

1. Install MongoDB Community Edition from [mongodb.com](https://www.mongodb.com/try/download/community)
2. Start MongoDB service: `mongod`
3. The default connection string is `mongodb://localhost:27017`

**Option B: MongoDB Atlas (Cloud)**

1. Create a free account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string and update `MONGODB_URI` in `.env`

### 5. Get X API Credentials

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new app or use existing one
3. Generate API keys and tokens with read/write permissions
4. Add them to your `.env` file

## Usage

### Basic Usage

```bash
# Tweet about a specific post
npm run tweet -- -u "https://twitter.com/user/status/123456789"

# Tweet about a post with custom message
npm run tweet -- -u "https://instagram.com/p/ABC123" -m "Custom verification message"

# Process multiple posts from a file
npm run batch -- -f posts.txt

# Show processing statistics
npm run stats

# Search processed posts
npm run search -- -q "verification"
```

### Advanced Usage

```bash
# Generate verification tweet without posting (dry run)
npm run tweet -- -u "https://example.com" --dry-run

# Process batch with custom delay and username
npm run batch -- -f posts.txt -d 60 -s "suremark_user"

# Monitor a specific user (placeholder for future implementation)
npm run monitor -- -u "suremark_user"
```

### Command Options

#### `tweet` Command

-   `-u, --url <url>`: URL of the post to tweet about (required)
-   `-m, --message <message>`: Custom verification message
-   `-s, --username <username>`: SureMark username (if different from post author)
-   `--dry-run`: Generate tweet without posting
-   `--platform <platform>`: Specify platform (auto-detected if not provided)

#### `batch` Command

-   `-f, --file <file>`: File containing list of post URLs (required)
-   `-d, --delay <seconds>`: Delay between tweets (default: 30 seconds)
-   `-s, --username <username>`: SureMark username for all posts
-   `--dry-run`: Process without posting tweets

#### `monitor` Command

-   `-u, --username <username>`: Username to monitor
-   `-t, --tag <hashtag>`: Hashtag to monitor
-   `-i, --interval <minutes>`: Check interval in minutes (default: 5)

#### `stats` Command

-   Shows processing statistics including total posts, platform breakdown, and recent activity

#### `search` Command

-   `-q, --query <query>`: Search query (required)
-   `-l, --limit <number>`: Maximum number of results (default: 20)

## Statistics and Analytics

The `npm run stats` command provides comprehensive analytics about your SureMark verification activity. This helps you track the effectiveness of your verification efforts and understand which platforms and content types are being verified most frequently.

### What the Stats Show

**Overall Metrics:**
- **Total posts processed**: All posts that have been attempted (successful + failed)
- **Successful posts**: Posts that were successfully verified and tweeted
- **Failed posts**: Posts that failed during processing or tweeting

**Time-based Metrics:**
- **Today**: Successful verifications completed today
- **This week**: Successful verifications in the last 7 days
- **This month**: Successful verifications since the beginning of the current month

**Platform Breakdown:**
Shows which platforms you're verifying content from most frequently:
- Twitter/X posts
- Instagram posts
- YouTube videos
- Website articles
- Other platforms

**Username Activity:**
Tracks which SureMark usernames are most active in content verification.

### Example Output

```
📊 Processing Statistics:
  Total posts processed: 25
  Successful posts: 23
  Failed posts: 2
  Successful posts today: 5
  Successful posts this week: 18
  Successful posts this month: 23

📱 By Platform:
  twitter: 15
  instagram: 5
  youtube: 2
  website: 1

👤 By SureMark Username:
  @john_suremark: 12
  @jane_verifier: 8
  @content_checker: 3
```

### Using Stats for Optimization

1. **Track Performance**: Monitor your success rate to identify potential issues
2. **Platform Focus**: See which platforms generate the most verification activity
3. **User Activity**: Understand which team members are most active
4. **Trend Analysis**: Compare daily, weekly, and monthly activity levels

### Database Requirements

The statistics feature requires a MongoDB connection to track processed posts. Make sure your MongoDB instance is running and properly configured in your `.env` file before using the stats command.

## Message Templates

The bot uses customizable message templates:

**Default Template:**

```
This post is verified by @{suremark_username} using SureMark Digital.
Check the SureMark dashboard for more recent posts: {dashboard_url}
```

**Platform-Specific Templates:**

-   **Instagram**: Includes 📸 emoji and Instagram-specific messaging
-   **YouTube**: Includes 🎥 emoji and video-specific messaging
-   **Website**: Includes 🌐 emoji for general web content
-   **Article**: Includes 📰 emoji for article content

## Supported Platforms

-   **Twitter/X**: Direct tweet replies and mentions
-   **Instagram**: Post verification and story mentions
-   **YouTube**: Video verification and comment replies
-   **Websites/Articles**: Cross-platform posting to Twitter
-   **General URLs**: Any web content with metadata extraction

## File Structure

```
suremark_line_command/
├── src/
│   ├── index.ts              # Main CLI application
│   ├── x-api.ts              # X (Twitter) API integration
│   ├── post-processor.ts     # Post content processing
│   ├── database.ts           # Post tracking and duplicate prevention
│   ├── config.ts             # Configuration and templates
│   └── utils/
│       └── logger.ts         # Logging utility
├── dist/                     # Compiled JavaScript (generated)
├── logs/                     # Log files (generated)
├── package.json              # Project dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── .env                      # Environment variables (create this)
└── README.md                 # This file
```

## Development

### Scripts

```bash
# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Clean build artifacts
npm run clean
```

### Adding New Platforms

To add support for a new platform:

1. Add the domain to `SUPPORTED_PLATFORMS` in `config.ts`
2. Add a platform-specific message template
3. Implement content extraction logic in `post-processor.ts`
4. Add platform-specific handling in the main processing flow

## Error Handling

The bot includes comprehensive error handling for:

-   API rate limits
-   Network connectivity issues
-   Invalid URLs or content
-   Authentication failures
-   Platform-specific restrictions

## Logging

All activities are logged with different levels:

-   **INFO**: Normal operations
-   **WARNING**: Non-critical issues
-   **ERROR**: Critical failures
-   **DEBUG**: Detailed debugging information

Logs are stored in:

-   `logs/combined.log`: All logs
-   `logs/error.log`: Error logs only
-   Console output in development mode

## Database

The bot uses MongoDB to track processed posts and prevent duplicates. The database contains:

### Document Structure

```javascript
{
  _id: ObjectId("..."),
  url: "https://twitter.com/user/status/123456789",
  platform: "twitter",
  processedAt: ISODate("2024-01-15T10:30:00Z"),
  suremarkUsername: "suremark_user",
  title: "Post title",
  content: "Post content...",
  author: "original_author",
  tweet: {
    id: "1234567890123456789",
    url: "https://twitter.com/SureMarkTruthAgent/status/...",
    postedAt: ISODate("2024-01-15T10:31:00Z")
  },
  metadata: {
    hashtags: ["#suremark", "#verified"],
    mentions: ["@user1", "@user2"],
    mediaUrls: ["https://..."]
  }
}
```

### Features

-   **Flexible Schema**: Easy to add new fields without migrations
-   **Rich Queries**: Advanced filtering and aggregation
-   **Scalability**: Can handle high-volume processing
-   **Indexes**: Optimized for fast lookups by URL, platform, and username

## Rate Limiting

The bot respects X API rate limits:

-   300 tweets per 15 minutes
-   300 replies per 15 minutes
-   Automatic retry with exponential backoff

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is part of the SureMark Truth Seeking Agent initiative.
