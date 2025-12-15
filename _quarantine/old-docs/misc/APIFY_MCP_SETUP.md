# Apify MCP Server Setup Guide

## ✅ Installation Complete

The Apify MCP server has been added to your Claude Code configuration!

## 🔑 Get Your API Token

1. **Sign up or log in** to Apify: https://console.apify.com/
2. **Navigate to** Account → Integrations: https://console.apify.com/account/integrations
3. **Copy your API token** (it starts with `apify_api_`)
4. **Add it to your `.env` file**:
   ```bash
   APIFY_TOKEN=apify_api_YOUR_TOKEN_HERE
   ```

## 🚀 What is Apify?

Apify is a powerful web scraping and automation platform that provides:

### Key Features:
- **Web Scraping at Scale** - Extract data from any website
- **Pre-built Actors** - 1000+ ready-made scrapers for popular sites
- **Browser Automation** - Puppeteer/Playwright integration
- **Data Storage** - Store and retrieve scraped data
- **Scheduled Runs** - Automate scraping jobs
- **Proxy Management** - Built-in rotating proxies
- **Anti-blocking** - Handle CAPTCHAs and rate limits

## 📊 Available MCP Tools

Once configured, you'll have access to:

### Actor Management
- `apify_run_actor` - Run any Apify actor
- `apify_get_actor_run` - Get details of an actor run
- `apify_list_actors` - List available actors

### Dataset Operations
- `apify_get_dataset_items` - Retrieve scraped data
- `apify_push_dataset_items` - Store data

### Key-Value Store
- `apify_get_kv_store_record` - Retrieve stored values
- `apify_set_kv_store_record` - Store key-value data

## 💡 Use Cases for Car Crash Lawyer AI

### 1. **Competitor Analysis**
```
Run the Website Content Crawler actor to analyze competitor law firm websites
```

### 2. **Legal Research**
```
Scrape case law databases and legal forums for relevant precedents
```

### 3. **Market Intelligence**
```
Monitor competitor pricing, services, and client reviews
```

### 4. **Data Collection**
```
Gather UK traffic statistics, accident data, and insurance information
```

### 5. **Contact Validation**
```
Verify business information and contact details for witnesses
```

## 🎯 Quick Start Examples

### Example 1: Scrape a Website
```
Use the apify_run_actor tool with the Website Content Crawler actor
to extract content from a competitor's website.
```

### Example 2: Google Maps Scraper
```
Run the Google Maps Scraper actor to find nearby law firms,
repair shops, or medical facilities for your users.
```

### Example 3: Social Media Monitoring
```
Use Instagram or LinkedIn scrapers to monitor competitor
marketing campaigns and client engagement.
```

## 🔒 Free Tier Limits

- **$5 free credit** per month
- No credit card required to start
- Great for testing and development
- Upgrade for production use

## 📚 Popular Actors You Can Use

1. **Website Content Crawler** - General web scraping
2. **Google Maps Scraper** - Extract business data
3. **Instagram Scraper** - Social media monitoring
4. **LinkedIn Company Scraper** - Business intelligence
5. **Google Search Results Scraper** - SEO research
6. **Amazon Product Scraper** - Product data
7. **Twitter Scraper** - Social listening
8. **Reddit Scraper** - Community insights

## ⚙️ Configuration Details

**MCP Config Location**: `~/.claude/mcp_config.json`

```json
{
  "mcpServers": {
    "apify": {
      "command": "npx",
      "args": ["-y", "@apify/actors-mcp-server"],
      "env": {
        "APIFY_TOKEN": "${APIFY_TOKEN}"
      },
      "disabled": false
    }
  }
}
```

## 🧪 Testing the Connection

After adding your API token:

1. **Restart Claude Code** to load the new MCP server
2. **Try a simple command**:
   ```
   List available Apify actors
   ```
3. **Check the logs** to verify connection

## 🆚 Apify vs Firecrawl

You already have Firecrawl configured. Here's when to use each:

| Feature | Apify | Firecrawl |
|---------|-------|-----------|
| **Best for** | Complex automation, browser tasks | Simple content extraction |
| **Pre-built actors** | 1000+ | Limited |
| **JavaScript rendering** | ✅ Full browser | ✅ Simplified |
| **Data storage** | Built-in datasets | Return only |
| **Scheduling** | ✅ Yes | ❌ No |
| **Proxy management** | ✅ Advanced | ✅ Basic |
| **Learning curve** | Moderate | Easy |
| **Cost** | $5 free/month | Pay per scrape |

### When to Use Apify:
- Need to scrape sites with complex JavaScript
- Want to schedule recurring scrapes
- Need to store historical data
- Require advanced proxy rotation
- Building production scraping workflows

### When to Use Firecrawl:
- Quick one-off scrapes
- Simple content extraction
- Need markdown output
- Don't want to manage storage
- Prefer pay-as-you-go pricing

## 📖 Documentation

- **Apify Platform**: https://docs.apify.com/
- **Actor Store**: https://apify.com/store
- **MCP Server**: https://github.com/apify/mcp-server-apify
- **API Reference**: https://docs.apify.com/api/v2

## 🔧 Troubleshooting

### Connection Issues
1. Check your API token is correct in `.env`
2. Verify environment variables are loaded: `echo $APIFY_TOKEN`
3. Restart Claude Code after adding token
4. Check MCP logs for errors

### Rate Limiting
- Free tier has usage limits
- Upgrade plan if needed
- Use Apify's built-in proxies

### Actor Errors
- Check actor documentation
- Verify input parameters
- Review actor run logs in Apify Console

## 💰 Pricing

**Free Tier**: $5/month credit (no card required)
**Starter**: $49/month ($58 credits + platform)
**Team**: Custom pricing

For your Car Crash Lawyer AI project, the **free tier** should be sufficient for:
- Development and testing
- Small-scale competitor monitoring
- Research and validation

## 🎉 Next Steps

1. **Get your API token** from Apify Console
2. **Add it to `.env` file**
3. **Restart Claude Code**
4. **Try your first scrape**:
   - "Use Apify to scrape competitor law firm websites"
   - "List available actors in Apify store"
   - "Run the Google Maps Scraper for law firms in London"

---

**Setup completed**: 2025-10-31
**MCP Config**: `~/.claude/mcp_config.json`
**Environment**: `/Users/ianring/Node.js/.env`

Happy scraping! 🕷️🚀
