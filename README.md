# @noleemits/vision-builder-mcp

MCP Server for [Noleemits Vision Builder](https://noleemits.com) - Connect Claude Desktop to your WordPress + Elementor site.

## What it does

This MCP server gives Claude Desktop the ability to:

- **Elementor**: Create pages, add sections (hero, features, pricing, FAQ, etc.), manage style presets
- **Content Editing**: Search posts, read/update content, find & replace text, manage links
- **SEO (Rank Math)**: Read/update SEO titles, descriptions, focus keywords, Open Graph data

## Prerequisites

- **Node.js 18+** installed on your machine
- **Noleemits Vision Builder** plugin installed on your WordPress site
- A **WordPress Application Password** for authentication

## Quick Setup

### 1. Generate an Application Password

In your WordPress admin, go to **Vision Builder > Settings > MCP Config** and click **Generate Connection**.

Or manually: **Users > Profile > Application Passwords** > enter "Claude Desktop" > click **Add New**.

### 2. Add to Claude Desktop config

Open Claude Desktop > Settings > Developer > Edit Config, then add:

```json
{
  "mcpServers": {
    "my-wordpress": {
      "command": "npx",
      "args": ["-y", "@noleemits/vision-builder-mcp"],
      "env": {
        "WP_URL": "https://your-site.com",
        "WP_USER": "your-username",
        "WP_APP_PASSWORD": "xxxx xxxx xxxx xxxx xxxx xxxx"
      }
    }
  }
}
```

Replace the values with your actual WordPress site URL, username, and application password.

### 3. Restart Claude Desktop

Quit and reopen Claude Desktop. You should see the MCP tools icon in the chat input.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `WP_URL` | Yes | Your WordPress site URL (e.g., `https://example.com`) |
| `WP_USER` | Yes | WordPress username |
| `WP_APP_PASSWORD` | Yes | WordPress Application Password |

## Available Tools (40+)

### Page Management
- `create_page` - Create a new Elementor page
- `get_pages` / `get_page` / `delete_page`

### Style Presets
- `list_style_presets` / `apply_style_preset` / `detect_style_preset` / `get_style_settings`

### Section Generation
- `add_hero` - Multiple layouts (centered, split, asymmetric, overlap)
- `add_features` - Grid, bento, or magazine layout
- `add_testimonial` / `add_cta` / `add_faq` / `add_pricing` / `add_team` / `add_contact` / `add_gallery`

### Content Editing (Gutenberg)
- `search_content` / `get_post_content` / `update_post`
- `find_links` / `update_link` / `find_and_replace`

### SEO (Rank Math)
- `get_seo_data` / `update_seo_data` / `get_seo_status`

### Utilities
- `health_check` / `preview_page`

## Multiple Sites

Use a unique key name for each site:

```json
{
  "mcpServers": {
    "site-one": {
      "command": "npx",
      "args": ["-y", "@noleemits/vision-builder-mcp"],
      "env": {
        "WP_URL": "https://site-one.com",
        "WP_USER": "admin",
        "WP_APP_PASSWORD": "xxxx xxxx xxxx xxxx"
      }
    },
    "site-two": {
      "command": "npx",
      "args": ["-y", "@noleemits/vision-builder-mcp"],
      "env": {
        "WP_URL": "https://site-two.com",
        "WP_USER": "editor",
        "WP_APP_PASSWORD": "yyyy yyyy yyyy yyyy"
      }
    }
  }
}
```

## Troubleshooting

**503 errors**: Whitelist `/wp-json/nvb/` in your firewall/security plugin.

**"Application passwords not available"**: Requires HTTPS or localhost.

**Test the connection**: Visit `https://your-site.com/wp-json/nvb/v1/health` in your browser.

## License

GPL-2.0-or-later
