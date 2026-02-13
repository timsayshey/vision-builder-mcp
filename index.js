#!/usr/bin/env node
/**
 * MCP Server for Noleemits Vision Builder
 *
 * IMPORTANT: If you see this message in Claude Desktop logs, the new server is running!
 * Version: 1.7.3
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ErrorCode,
    McpError,
} from "@modelcontextprotocol/sdk/types.js";

// Configuration
const CONFIG = {
    wordpressUrl: process.env.WP_URL || 'http://localhost',
    username: process.env.WP_USER || '',
    applicationPassword: process.env.WP_APP_PASSWORD || ''
};

console.error('========================================');
console.error('NVB MCP Server v1.7.3 Starting...');
console.error(`WordPress URL: ${CONFIG.wordpressUrl}`);
console.error(`Username: ${CONFIG.username}`);
console.error('========================================');

/**
 * Make authenticated request to WordPress REST API
 */
async function wpRequest(endpoint, method = 'GET', body = null) {
    const url = `${CONFIG.wordpressUrl}/wp-json/nvb/v1${endpoint}`;
    const auth = Buffer.from(`${CONFIG.username}:${CONFIG.applicationPassword}`).toString('base64');

    console.error(`[API] ${method} ${url}`);

    const options = {
        method,
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'NVB-MCP-Server/1.0 (Claude Desktop; WordPress Plugin)'
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
        console.error(`[API] Body: ${JSON.stringify(body)}`);
    }

    try {
        const response = await fetch(url, options);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `HTTP ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error(`[API] Error: ${error.message}`);
        throw new Error(`WordPress API Error: ${error.message}`);
    }
}

// Create server
const server = new Server(
    {
        name: "noleemits-vision-builder",
        version: "1.7.3",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Tool definitions - following wp-elementor-mcp pattern exactly
server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error('[MCP] ListTools request received - returning tools with inputSchema');

    const tools = [];

    // ============ PAGE MANAGEMENT ============
    tools.push({
        name: 'create_page',
        description: 'Create a new WordPress page with Elementor',
        inputSchema: {
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: 'Page title',
                },
                status: {
                    type: 'string',
                    enum: ['draft', 'publish'],
                    description: 'Page status (default: draft)',
                },
            },
            required: ['title'],
        },
    });

    tools.push({
        name: 'get_pages',
        description: 'List existing Elementor pages',
        inputSchema: {
            type: 'object',
            properties: {
                status: {
                    type: 'string',
                    enum: ['draft', 'publish', 'any'],
                    description: 'Filter by status (default: any)',
                },
                limit: {
                    type: 'number',
                    description: 'Max pages to return (default: 20)',
                },
            },
        },
    });

    tools.push({
        name: 'get_page',
        description: 'Get details of a specific page',
        inputSchema: {
            type: 'object',
            properties: {
                page_id: {
                    type: 'number',
                    description: 'ID of the page',
                },
            },
            required: ['page_id'],
        },
    });

    tools.push({
        name: 'delete_page',
        description: 'Delete a WordPress page',
        inputSchema: {
            type: 'object',
            properties: {
                page_id: {
                    type: 'number',
                    description: 'ID of the page to delete',
                },
            },
            required: ['page_id'],
        },
    });

    // ============ STYLE PRESETS ============
    tools.push({
        name: 'list_style_presets',
        description: 'List available style presets for different industries. IMPORTANT: Use this to select a cohesive design style before creating pages.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    });

    tools.push({
        name: 'apply_style_preset',
        description: 'Apply a style preset to ensure consistent, professional design. ALWAYS use this before creating sections.',
        inputSchema: {
            type: 'object',
            properties: {
                preset_id: {
                    type: 'string',
                    enum: ['healthcare', 'saas', 'creative', 'corporate', 'minimal', 'friendly'],
                    description: 'Preset ID: healthcare, saas, creative, corporate, minimal, or friendly',
                },
            },
            required: ['preset_id'],
        },
    });

    tools.push({
        name: 'detect_style_preset',
        description: 'Automatically detect the best style preset based on business description',
        inputSchema: {
            type: 'object',
            properties: {
                description: {
                    type: 'string',
                    description: 'Business description or keywords',
                },
            },
            required: ['description'],
        },
    });

    tools.push({
        name: 'get_active_preset',
        description: 'Check which style preset is currently active',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    });

    tools.push({
        name: 'get_style_settings',
        description: 'Get current style settings (colors, design, spacing). These are the actual values used when generating sections. Can be populated by applying a preset or customized by the user in the WordPress admin.',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    });

    // ============ SECTION GENERATION ============
    tools.push({
        name: 'add_hero',
        description: 'Add a premium hero section with modern layouts: centered, balanced split (50/50), asymmetric splits (60/40 or 40/60), or overlapping image design. Text colors automatically adapt for contrast based on background.',
        inputSchema: {
            type: 'object',
            properties: {
                page_id: {
                    type: 'number',
                    description: 'Page ID',
                },
                heading: {
                    type: 'string',
                    description: 'Main heading text',
                },
                subheading: {
                    type: 'string',
                    description: 'Subheading or description',
                },
                cta_text: {
                    type: 'string',
                    description: 'Call-to-action button text',
                },
                cta_url: {
                    type: 'string',
                    description: 'CTA button URL',
                },
                image_url: {
                    type: 'string',
                    description: 'URL to an image. When provided, enables split/asymmetric layouts.',
                },
                layout: {
                    type: 'string',
                    enum: ['centered', 'split', 'asymmetric-left', 'asymmetric-right', 'overlap'],
                    description: 'Layout: centered (default), split (50/50), asymmetric-left (60/40 text-heavy), asymmetric-right (40/60 image-heavy), overlap (image bleeds into next section)',
                },
                background_color: {
                    type: 'string',
                    description: 'Custom background color (hex, e.g. #3B82F6 for blue, #f2f2f2 for light gray). Text colors auto-adjust for contrast. If not provided, uses gradient from primary colors.',
                },
            },
            required: ['page_id', 'heading'],
        },
    });

    tools.push({
        name: 'add_features',
        description: 'Add a features/content section. IMPORTANT: For content with images, use "magazine" layout which places IMAGE BESIDE TEXT (alternating left/right). Grid layout stacks images below text. Magazine layout is BEST for articles, blog posts, and content pages.',
        inputSchema: {
            type: 'object',
            properties: {
                page_id: {
                    type: 'number',
                    description: 'Page ID',
                },
                heading: {
                    type: 'string',
                    description: 'Section heading',
                },
                layout: {
                    type: 'string',
                    enum: ['grid', 'bento', 'magazine'],
                    description: 'IMPORTANT: Use "magazine" for content with images side-by-side (alternates image-left/image-right). Grid puts images BELOW text. Magazine is best for articles/blog posts.',
                },
                background_color: {
                    type: 'string',
                    description: 'Background color for the section (hex, e.g. #f2f2f2). Magazine rows alternate between this and white.',
                },
                features: {
                    type: 'array',
                    description: 'Array of content items (3 for grid, 5 for bento, 4-6 for magazine)',
                    items: {
                        type: 'object',
                        properties: {
                            title: { type: 'string' },
                            description: { type: 'string' },
                            icon: { type: 'string', description: 'FontAwesome icon class (e.g., "fas fa-star")' },
                            image_prompt: { type: 'string', description: 'AI image generation prompt - REQUIRED for magazine layout to show images beside text' },
                        },
                        required: ['title', 'description'],
                    },
                },
            },
            required: ['page_id', 'features'],
        },
    });

    tools.push({
        name: 'add_testimonial',
        description: 'Add a testimonial/quote section',
        inputSchema: {
            type: 'object',
            properties: {
                page_id: {
                    type: 'number',
                    description: 'Page ID',
                },
                quote: {
                    type: 'string',
                    description: 'Testimonial quote text',
                },
                author: {
                    type: 'string',
                    description: 'Author name',
                },
                company: {
                    type: 'string',
                    description: 'Company or title',
                },
            },
            required: ['page_id', 'quote', 'author'],
        },
    });

    tools.push({
        name: 'add_cta',
        description: 'Add a call-to-action section',
        inputSchema: {
            type: 'object',
            properties: {
                page_id: {
                    type: 'number',
                    description: 'Page ID',
                },
                heading: {
                    type: 'string',
                    description: 'CTA heading',
                },
                subheading: {
                    type: 'string',
                    description: 'Supporting text',
                },
                button_text: {
                    type: 'string',
                    description: 'Button text',
                },
                button_url: {
                    type: 'string',
                    description: 'Button URL',
                },
            },
            required: ['page_id', 'heading', 'button_text'],
        },
    });

    tools.push({
        name: 'add_faq',
        description: 'Add a FAQ section',
        inputSchema: {
            type: 'object',
            properties: {
                page_id: {
                    type: 'number',
                    description: 'Page ID',
                },
                heading: {
                    type: 'string',
                    description: 'Section heading',
                },
                faqs: {
                    type: 'array',
                    description: 'Array of FAQ items',
                    items: {
                        type: 'object',
                        properties: {
                            question: { type: 'string' },
                            answer: { type: 'string' },
                        },
                        required: ['question', 'answer'],
                    },
                },
            },
            required: ['page_id', 'faqs'],
        },
    });

    tools.push({
        name: 'add_pricing',
        description: 'Add a pricing section with 2-3 pricing tiers',
        inputSchema: {
            type: 'object',
            properties: {
                page_id: {
                    type: 'number',
                    description: 'Page ID',
                },
                heading: {
                    type: 'string',
                    description: 'Section heading (e.g., "Choose Your Plan")',
                },
                subheading: {
                    type: 'string',
                    description: 'Optional subheading text',
                },
                tiers: {
                    type: 'array',
                    description: 'Array of pricing tiers (2-3 recommended)',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', description: 'Tier name (e.g., "Basic", "Pro")' },
                            price: { type: 'string', description: 'Price (e.g., "$29", "$99/mo")' },
                            period: { type: 'string', description: 'Billing period (e.g., "/month", "/year")' },
                            description: { type: 'string', description: 'Short tier description' },
                            features: {
                                type: 'array',
                                items: { type: 'string' },
                                description: 'List of features included',
                            },
                            cta_text: { type: 'string', description: 'Button text' },
                            cta_url: { type: 'string', description: 'Button URL' },
                            highlighted: { type: 'boolean', description: 'Whether this tier is highlighted/popular' },
                        },
                        required: ['name', 'price', 'features'],
                    },
                },
            },
            required: ['page_id', 'tiers'],
        },
    });

    tools.push({
        name: 'add_team',
        description: 'Add a team section with member cards',
        inputSchema: {
            type: 'object',
            properties: {
                page_id: {
                    type: 'number',
                    description: 'Page ID',
                },
                heading: {
                    type: 'string',
                    description: 'Section heading (e.g., "Meet Our Team")',
                },
                subheading: {
                    type: 'string',
                    description: 'Optional subheading text',
                },
                members: {
                    type: 'array',
                    description: 'Array of team members (2-4 recommended)',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', description: 'Member name' },
                            role: { type: 'string', description: 'Job title/role' },
                            bio: { type: 'string', description: 'Short biography' },
                            image_url: { type: 'string', description: 'Profile photo URL' },
                            social: {
                                type: 'object',
                                properties: {
                                    linkedin: { type: 'string' },
                                    twitter: { type: 'string' },
                                    email: { type: 'string' },
                                },
                                description: 'Social media links',
                            },
                        },
                        required: ['name', 'role'],
                    },
                },
            },
            required: ['page_id', 'members'],
        },
    });

    tools.push({
        name: 'add_contact',
        description: 'Add a contact section with contact information and optional form placeholder',
        inputSchema: {
            type: 'object',
            properties: {
                page_id: {
                    type: 'number',
                    description: 'Page ID',
                },
                heading: {
                    type: 'string',
                    description: 'Section heading (e.g., "Get In Touch")',
                },
                subheading: {
                    type: 'string',
                    description: 'Optional subheading text',
                },
                address: {
                    type: 'string',
                    description: 'Physical address',
                },
                phone: {
                    type: 'string',
                    description: 'Phone number',
                },
                email: {
                    type: 'string',
                    description: 'Email address',
                },
                hours: {
                    type: 'string',
                    description: 'Business hours (e.g., "Mon-Fri: 9AM-5PM")',
                },
                show_form: {
                    type: 'boolean',
                    description: 'Whether to include a contact form placeholder (default: true)',
                },
                show_map: {
                    type: 'boolean',
                    description: 'Whether to include a map placeholder (default: false)',
                },
            },
            required: ['page_id'],
        },
    });

    tools.push({
        name: 'add_gallery',
        description: 'Add an image gallery section with grid layout',
        inputSchema: {
            type: 'object',
            properties: {
                page_id: {
                    type: 'number',
                    description: 'Page ID',
                },
                heading: {
                    type: 'string',
                    description: 'Section heading (e.g., "Our Gallery")',
                },
                images: {
                    type: 'array',
                    description: 'Array of images for the gallery',
                    items: {
                        type: 'object',
                        properties: {
                            url: { type: 'string', description: 'Image URL' },
                            caption: { type: 'string', description: 'Optional caption' },
                            alt: { type: 'string', description: 'Alt text for accessibility' },
                        },
                        required: ['url'],
                    },
                },
                columns: {
                    type: 'number',
                    description: 'Number of columns (2, 3, or 4). Default: 3',
                },
                lightbox: {
                    type: 'boolean',
                    description: 'Enable lightbox on click (default: true)',
                },
            },
            required: ['page_id', 'images'],
        },
    });

    tools.push({
        name: 'insert_element',
        description: 'Insert a widget element at a specific position within an existing column or section',
        inputSchema: {
            type: 'object',
            properties: {
                page_id: {
                    type: 'number',
                    description: 'Page ID',
                },
                parent_id: {
                    type: 'string',
                    description: 'ID of the parent column or section to insert into',
                },
                position: {
                    type: 'number',
                    description: 'Position index (0 = first, -1 = last). Default: -1 (append)',
                },
                widget_type: {
                    type: 'string',
                    enum: ['heading', 'text-editor', 'image', 'button', 'icon', 'divider', 'spacer'],
                    description: 'Type of widget to insert',
                },
                settings: {
                    type: 'object',
                    description: 'Widget settings (varies by widget type). Examples: {title: "Hello"} for heading, {editor: "<p>Text</p>"} for text-editor, {image: {url: "..."}} for image, {text: "Click", link: {url: "#"}} for button',
                },
            },
            required: ['page_id', 'parent_id', 'widget_type'],
        },
    });

    // ============ TEMPLATES ============
    tools.push({
        name: 'list_templates',
        description: 'List available section templates',
        inputSchema: {
            type: 'object',
            properties: {
                category: {
                    type: 'string',
                    enum: ['hero', 'features', 'testimonial', 'cta', 'pricing', 'faq'],
                    description: 'Filter by category (optional)',
                },
            },
        },
    });

    tools.push({
        name: 'list_patterns',
        description: 'List available layout patterns (Bento, Masonry, Zigzag, Grid)',
        inputSchema: {
            type: 'object',
            properties: {
                category: {
                    type: 'string',
                    enum: ['bento', 'masonry', 'zigzag', 'grid'],
                    description: 'Filter by pattern category',
                },
            },
        },
    });

    // ============ PAGE INSPECTION ============
    tools.push({
        name: 'get_page_structure',
        description: 'Get the Elementor JSON structure of a page to understand its current layout',
        inputSchema: {
            type: 'object',
            properties: {
                page_id: {
                    type: 'number',
                    description: 'Page ID to inspect',
                },
            },
            required: ['page_id'],
        },
    });

    tools.push({
        name: 'get_elementor_elements',
        description: 'List all Elementor elements (sections, columns, widgets) on a page',
        inputSchema: {
            type: 'object',
            properties: {
                page_id: {
                    type: 'number',
                    description: 'Page ID',
                },
            },
            required: ['page_id'],
        },
    });

    // Alias for compatibility
    tools.push({
        name: 'get_elementor_data',
        description: 'Get Elementor data for a page (alias for get_elementor_elements)',
        inputSchema: {
            type: 'object',
            properties: {
                page_id: {
                    type: 'number',
                    description: 'Page ID',
                },
            },
            required: ['page_id'],
        },
    });

    tools.push({
        name: 'update_element',
        description: 'Update a specific element on the page by its ID',
        inputSchema: {
            type: 'object',
            properties: {
                page_id: {
                    type: 'number',
                    description: 'Page ID',
                },
                element_id: {
                    type: 'string',
                    description: 'The Elementor element ID to update',
                },
                settings: {
                    type: 'object',
                    description: 'Settings to update on the element',
                },
            },
            required: ['page_id', 'element_id', 'settings'],
        },
    });

    // Alias for compatibility
    tools.push({
        name: 'update_elementor_widget',
        description: 'Update a widget on the page (alias for update_element)',
        inputSchema: {
            type: 'object',
            properties: {
                page_id: {
                    type: 'number',
                    description: 'Page ID',
                },
                element_id: {
                    type: 'string',
                    description: 'The widget/element ID to update',
                },
                settings: {
                    type: 'object',
                    description: 'Settings to update',
                },
            },
            required: ['page_id', 'element_id', 'settings'],
        },
    });

    tools.push({
        name: 'delete_element',
        description: 'Delete an element from a page by its ID',
        inputSchema: {
            type: 'object',
            properties: {
                page_id: {
                    type: 'number',
                    description: 'Page ID',
                },
                element_id: {
                    type: 'string',
                    description: 'The element ID to delete',
                },
            },
            required: ['page_id', 'element_id'],
        },
    });

    // Alias for compatibility
    tools.push({
        name: 'delete_elementor_element',
        description: 'Delete an Elementor element from a page (alias for delete_element)',
        inputSchema: {
            type: 'object',
            properties: {
                page_id: {
                    type: 'number',
                    description: 'Page ID',
                },
                element_id: {
                    type: 'string',
                    description: 'The element ID to delete',
                },
            },
            required: ['page_id', 'element_id'],
        },
    });

    // ============ UTILITIES ============
    tools.push({
        name: 'health_check',
        description: 'Check connection to WordPress and plugin status',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    });

    tools.push({
        name: 'preview_page',
        description: 'Get the preview URL for a page',
        inputSchema: {
            type: 'object',
            properties: {
                page_id: {
                    type: 'number',
                    description: 'Page ID',
                },
            },
            required: ['page_id'],
        },
    });

    // ============ GUTENBERG / CONTENT EDITING ============
    tools.push({
        name: 'search_content',
        description: 'Search WordPress posts and pages by keyword. Returns matching posts with titles, URLs, status, and excerpts.',
        inputSchema: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search keyword or phrase' },
                post_type: { type: 'string', enum: ['any', 'post', 'page'], description: 'Filter by post type (default: any)' },
                per_page: { type: 'number', description: 'Results per page (default: 10, max: 50)' },
            },
            required: ['query'],
        },
    });

    tools.push({
        name: 'get_post_content',
        description: 'Get the full content of a WordPress post or page, including raw HTML, word count, link count, and editor type (Gutenberg vs Classic).',
        inputSchema: {
            type: 'object',
            properties: {
                post_id: { type: 'number', description: 'Post or page ID' },
            },
            required: ['post_id'],
        },
    });

    tools.push({
        name: 'update_post',
        description: 'Update a post/page title, content, excerpt, status, or slug. Only provide the fields you want to change.',
        inputSchema: {
            type: 'object',
            properties: {
                post_id: { type: 'number', description: 'Post or page ID' },
                title: { type: 'string', description: 'New post title' },
                content: { type: 'string', description: 'New post content (HTML)' },
                excerpt: { type: 'string', description: 'New post excerpt' },
                status: { type: 'string', enum: ['publish', 'draft', 'private', 'pending'], description: 'Post status' },
                slug: { type: 'string', description: 'URL slug' },
            },
            required: ['post_id'],
        },
    });

    tools.push({
        name: 'find_links',
        description: 'Find all links in a post/page. Returns internal and external links with their anchor text and URLs.',
        inputSchema: {
            type: 'object',
            properties: {
                post_id: { type: 'number', description: 'Post or page ID' },
            },
            required: ['post_id'],
        },
    });

    tools.push({
        name: 'update_link',
        description: 'Replace a specific link URL in a post/page. Finds the old URL and replaces it with a new one.',
        inputSchema: {
            type: 'object',
            properties: {
                post_id: { type: 'number', description: 'Post or page ID' },
                old_url: { type: 'string', description: 'The current URL to find and replace' },
                new_url: { type: 'string', description: 'The new URL to replace it with' },
            },
            required: ['post_id', 'old_url', 'new_url'],
        },
    });

    tools.push({
        name: 'find_and_replace',
        description: 'Find and replace text in a post/page content and title. Useful for bulk text updates.',
        inputSchema: {
            type: 'object',
            properties: {
                post_id: { type: 'number', description: 'Post or page ID' },
                find: { type: 'string', description: 'Text to find' },
                replace: { type: 'string', description: 'Text to replace with' },
                case_sensitive: { type: 'boolean', description: 'Case-sensitive search (default: true)' },
            },
            required: ['post_id', 'find', 'replace'],
        },
    });

    // ============ POST LISTING & COUNTS ============
    tools.push({
        name: 'list_posts',
        description: 'List WordPress posts/pages with filtering by type, status, and pagination. Use this to browse content, not search_content (which requires a keyword).',
        inputSchema: {
            type: 'object',
            properties: {
                post_type: { type: 'string', description: 'Post type: post, page, or any custom type (default: post)' },
                status: { type: 'string', enum: ['any', 'publish', 'draft', 'private', 'pending', 'future'], description: 'Filter by status (default: any)' },
                per_page: { type: 'number', description: 'Results per page (default: 20, max: 100)' },
                page: { type: 'number', description: 'Page number for pagination (default: 1)' },
                orderby: { type: 'string', enum: ['date', 'title', 'modified'], description: 'Sort by field (default: date)' },
                order: { type: 'string', enum: ['ASC', 'DESC'], description: 'Sort order (default: DESC)' },
            },
        },
    });

    tools.push({
        name: 'get_post_counts',
        description: 'Get total count of posts/pages grouped by status (publish, draft, private, pending, future, trash). Use this to quickly see how many posts exist without listing them all.',
        inputSchema: {
            type: 'object',
            properties: {
                post_type: { type: 'string', description: 'Post type to count: post, page, or any custom type (default: post)' },
            },
        },
    });

    // ============ RANK MATH SEO ============
    tools.push({
        name: 'get_seo_data',
        description: 'Get Rank Math SEO data for a post/page: SEO title, meta description, focus keyword, score, robots meta, Open Graph, and more.',
        inputSchema: {
            type: 'object',
            properties: {
                post_id: { type: 'number', description: 'Post or page ID' },
            },
            required: ['post_id'],
        },
    });

    tools.push({
        name: 'update_seo_data',
        description: 'Update Rank Math SEO data: SEO title, meta description, focus keyword, canonical URL, robots meta, Open Graph, and pillar content flag.',
        inputSchema: {
            type: 'object',
            properties: {
                post_id: { type: 'number', description: 'Post or page ID' },
                seo_title: { type: 'string', description: 'SEO title (appears in search results)' },
                seo_description: { type: 'string', description: 'Meta description (appears in search results, 150-160 chars recommended)' },
                focus_keyword: { type: 'string', description: 'Focus keyword for SEO scoring (comma-separated for multiple)' },
                canonical_url: { type: 'string', description: 'Canonical URL' },
                robots: { type: 'array', items: { type: 'string' }, description: 'Robots meta: ["index", "follow"] or ["noindex", "nofollow"]' },
                og_title: { type: 'string', description: 'Open Graph title (for social sharing)' },
                og_description: { type: 'string', description: 'Open Graph description (for social sharing)' },
                pillar_content: { type: 'boolean', description: 'Mark as pillar/cornerstone content' },
            },
            required: ['post_id'],
        },
    });

    tools.push({
        name: 'get_seo_status',
        description: 'Check if Rank Math SEO is active and get overall SEO stats (posts with scores, posts with focus keywords).',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    });

    console.error(`[MCP] Returning ${tools.length} tools with inputSchema defined`);
    return { tools };
});

// Tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    console.error(`[MCP] CallTool: ${name}`);
    console.error(`[MCP] Arguments: ${JSON.stringify(args)}`);

    try {
        switch (name) {
            // PAGE MANAGEMENT
            case 'create_page': {
                const { title, status = 'draft' } = args;
                const result = await wpRequest('/pages', 'POST', { title, status });
                return {
                    content: [{
                        type: 'text',
                        text: result.success
                            ? `✅ Page created!\n\nPage ID: ${result.page_id}\nEdit: ${result.edit_url}\nPreview: ${result.preview_url}`
                            : `❌ Error: ${result.message}`
                    }]
                };
            }

            case 'get_pages': {
                const { status = 'any', limit = 20 } = args || {};
                const result = await wpRequest(`/pages?status=${status}&limit=${limit}`);
                const pageList = result.pages.map(p =>
                    `• [${p.id}] ${p.title} (${p.status})`
                ).join('\n');
                return {
                    content: [{
                        type: 'text',
                        text: `Found ${result.count} pages:\n\n${pageList || 'No pages found.'}`
                    }]
                };
            }

            case 'get_page': {
                const { page_id } = args;
                const result = await wpRequest(`/pages/${page_id}`);
                return {
                    content: [{
                        type: 'text',
                        text: `Page: ${result.title}\nID: ${result.id}\nStatus: ${result.status}\nSections: ${result.section_count}\nURL: ${result.url}`
                    }]
                };
            }

            case 'delete_page': {
                const { page_id } = args;
                const result = await wpRequest(`/pages/${page_id}`, 'DELETE');
                return {
                    content: [{
                        type: 'text',
                        text: result.success ? `✅ Page ${page_id} deleted` : `❌ ${result.message}`
                    }]
                };
            }

            // STYLE PRESETS
            case 'list_style_presets': {
                const result = await wpRequest('/presets');
                const presetList = result.presets.map(p =>
                    `**${p.id}**: ${p.name}\n  ${p.description}`
                ).join('\n\n');
                return {
                    content: [{
                        type: 'text',
                        text: `Available Presets:\n\n${presetList}\n\n${result.active ? `Active: ${result.active}` : 'No preset active - apply one!'}`
                    }]
                };
            }

            case 'apply_style_preset': {
                const { preset_id } = args;
                const result = await wpRequest(`/presets/${preset_id}/apply`, 'POST');
                return {
                    content: [{
                        type: 'text',
                        text: result.success
                            ? `✅ Applied "${result.preset_name}" preset!\n\nAll sections will now use this design system.`
                            : `❌ ${result.message}`
                    }]
                };
            }

            case 'detect_style_preset': {
                const { description } = args;
                const result = await wpRequest('/presets/detect', 'POST', { description });
                return {
                    content: [{
                        type: 'text',
                        text: `Detected: **${result.preset_name}** (${result.detected_preset})\n\n${result.description}\n\nUse apply_style_preset to apply it.`
                    }]
                };
            }

            case 'get_active_preset': {
                const result = await wpRequest('/presets/active');
                return {
                    content: [{
                        type: 'text',
                        text: result.active
                            ? `Active: **${result.preset_name}**\nPrimary: ${result.preset.colors.primary}`
                            : 'No preset active. Use list_style_presets and apply_style_preset.'
                    }]
                };
            }

            case 'get_style_settings': {
                const result = await wpRequest('/style-settings');
                const colors = result.colors || {};
                const design = result.design || {};
                const spacing = result.spacing || {};
                return {
                    content: [{
                        type: 'text',
                        text: `**Current Style Settings**\n(Source of truth for section generation)\n\n` +
                            `**Colors:**\n` +
                            `• Primary: ${colors.primary || 'not set'}\n` +
                            `• Secondary: ${colors.secondary || 'not set'}\n` +
                            `• Background: ${colors.background || 'not set'}\n` +
                            `• Text: ${colors.text || 'not set'}\n` +
                            `• Accent: ${colors.accent || 'not set'}\n\n` +
                            `**Design:**\n` +
                            `• Border Radius: ${design.border_radius || 0}px\n` +
                            `• Shadow: ${design.shadow || 'none'}\n\n` +
                            `**Spacing:**\n` +
                            `• Section Padding: ${spacing.section_padding || 'default'}\n\n` +
                            `**Active Preset:** ${result.active_preset || 'none (custom)'}\n\n` +
                            `_Tip: Use apply_style_preset to change these values, or they can be customized in WordPress admin._`
                    }]
                };
            }

            // SECTIONS
            case 'add_hero': {
                const result = await wpRequest(`/pages/${args.page_id}/hero`, 'POST', args);
                return {
                    content: [{
                        type: 'text',
                        text: result.success
                            ? `✅ Hero section added!\nPreview: ${result.preview_url}`
                            : `❌ ${result.message}`
                    }]
                };
            }

            case 'add_features': {
                const result = await wpRequest(`/pages/${args.page_id}/features`, 'POST', args);
                const layoutType = args.layout ? ` (${args.layout} layout)` : '';
                return {
                    content: [{
                        type: 'text',
                        text: result.success
                            ? `✅ Features section added${layoutType} with ${args.features?.length || 0} features!\nPreview: ${result.preview_url}`
                            : `❌ ${result.message}`
                    }]
                };
            }

            case 'add_testimonial': {
                const result = await wpRequest(`/pages/${args.page_id}/testimonial`, 'POST', args);
                return {
                    content: [{
                        type: 'text',
                        text: result.success
                            ? `✅ Testimonial section added!\nPreview: ${result.preview_url}`
                            : `❌ ${result.message}`
                    }]
                };
            }

            case 'add_cta': {
                const result = await wpRequest(`/pages/${args.page_id}/cta`, 'POST', args);
                return {
                    content: [{
                        type: 'text',
                        text: result.success
                            ? `✅ CTA section added!\nPreview: ${result.preview_url}`
                            : `❌ ${result.message}`
                    }]
                };
            }

            case 'add_faq': {
                const result = await wpRequest(`/pages/${args.page_id}/faq`, 'POST', args);
                return {
                    content: [{
                        type: 'text',
                        text: result.success
                            ? `✅ FAQ section added (${args.faqs?.length || 0} items)!\nPreview: ${result.preview_url}`
                            : `❌ ${result.message}`
                    }]
                };
            }

            case 'add_pricing': {
                const result = await wpRequest(`/pages/${args.page_id}/pricing`, 'POST', args);
                return {
                    content: [{
                        type: 'text',
                        text: result.success
                            ? `✅ Pricing section added (${args.tiers?.length || 0} tiers)!\nPreview: ${result.preview_url}`
                            : `❌ ${result.message}`
                    }]
                };
            }

            case 'add_team': {
                const result = await wpRequest(`/pages/${args.page_id}/team`, 'POST', args);
                return {
                    content: [{
                        type: 'text',
                        text: result.success
                            ? `✅ Team section added (${args.members?.length || 0} members)!\nPreview: ${result.preview_url}`
                            : `❌ ${result.message}`
                    }]
                };
            }

            case 'add_contact': {
                const result = await wpRequest(`/pages/${args.page_id}/contact`, 'POST', args);
                return {
                    content: [{
                        type: 'text',
                        text: result.success
                            ? `✅ Contact section added!\nPreview: ${result.preview_url}`
                            : `❌ ${result.message}`
                    }]
                };
            }

            case 'add_gallery': {
                const result = await wpRequest(`/pages/${args.page_id}/gallery`, 'POST', args);
                return {
                    content: [{
                        type: 'text',
                        text: result.success
                            ? `✅ Gallery section added (${args.images?.length || 0} images)!\nPreview: ${result.preview_url}`
                            : `❌ ${result.message}`
                    }]
                };
            }

            case 'insert_element': {
                const result = await wpRequest(`/pages/${args.page_id}/elements/insert`, 'POST', args);
                return {
                    content: [{
                        type: 'text',
                        text: result.success
                            ? `✅ ${args.widget_type} widget inserted!\nElement ID: ${result.element_id}\nPreview: ${result.preview_url}`
                            : `❌ ${result.message}`
                    }]
                };
            }

            // TEMPLATES
            case 'list_templates': {
                const { category } = args || {};
                const endpoint = category ? `/templates?category=${category}` : '/templates';
                const result = await wpRequest(endpoint);
                const list = result.templates.map(t => `• ${t.id}: ${t.name}`).join('\n');
                return {
                    content: [{
                        type: 'text',
                        text: `Templates:\n\n${list || 'None found.'}`
                    }]
                };
            }

            case 'list_patterns': {
                const { category } = args || {};
                const endpoint = category ? `/patterns?category=${category}` : '/patterns';
                const result = await wpRequest(endpoint);
                const list = result.patterns.map(p => `• ${p.id}: ${p.name}`).join('\n');
                return {
                    content: [{
                        type: 'text',
                        text: `Patterns:\n\n${list || 'None found.'}`
                    }]
                };
            }

            // PAGE INSPECTION
            case 'get_page_structure': {
                const { page_id } = args;
                const result = await wpRequest(`/pages/${page_id}/structure`);
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify(result, null, 2)
                    }]
                };
            }

            case 'get_elementor_elements':
            case 'get_elementor_data': {
                const { page_id } = args;
                const result = await wpRequest(`/pages/${page_id}/elements`);
                const elements = result.elements || [];
                const summary = elements.map(e =>
                    `• [${e.id}] ${e.elType}${e.widgetType ? ` (${e.widgetType})` : ''}`
                ).join('\n');
                return {
                    content: [{
                        type: 'text',
                        text: `Found ${elements.length} elements:\n\n${summary || 'No elements'}`
                    }]
                };
            }

            case 'update_element':
            case 'update_elementor_widget': {
                const { page_id, element_id, settings } = args;
                const result = await wpRequest(`/pages/${page_id}/elements/${element_id}`, 'PATCH', { settings });
                return {
                    content: [{
                        type: 'text',
                        text: result.success
                            ? `✅ Element ${element_id} updated`
                            : `❌ ${result.message}`
                    }]
                };
            }

            case 'delete_element':
            case 'delete_elementor_element': {
                const { page_id, element_id } = args;
                const result = await wpRequest(`/pages/${page_id}/elements/${element_id}`, 'DELETE');
                return {
                    content: [{
                        type: 'text',
                        text: result.success
                            ? `✅ Element ${element_id} deleted`
                            : `❌ ${result.message}`
                    }]
                };
            }

            // UTILITIES
            case 'health_check': {
                const result = await wpRequest('/health');
                return {
                    content: [{
                        type: 'text',
                        text: `Status: ${result.status}\nPlugin: ${result.plugin} v${result.version}\nElementor: ${result.elementor}`
                    }]
                };
            }

            case 'preview_page': {
                const { page_id } = args;
                return {
                    content: [{
                        type: 'text',
                        text: `Preview: ${CONFIG.wordpressUrl}/?page_id=${page_id}&preview=true`
                    }]
                };
            }

            // GUTENBERG / CONTENT EDITING
            case 'search_content': {
                const result = await wpRequest(`/content/search?query=${encodeURIComponent(args.query)}&post_type=${args.post_type || 'any'}&per_page=${args.per_page || 10}`);
                if (result.results && result.results.length > 0) {
                    const list = result.results.map(p =>
                        `- [${p.id}] ${p.title} (${p.type}, ${p.status})\n  URL: ${p.url}\n  ${p.excerpt}`
                    ).join('\n\n');
                    return { content: [{ type: 'text', text: `Found ${result.count} results:\n\n${list}` }] };
                }
                return { content: [{ type: 'text', text: 'No results found.' }] };
            }

            case 'get_post_content': {
                const result = await wpRequest(`/content/${args.post_id}`);
                const p = result.post;
                return {
                    content: [{
                        type: 'text',
                        text: `Post: ${p.title} (ID: ${p.id})\nType: ${p.type} | Status: ${p.status} | Editor: ${p.editor}\nURL: ${p.url}\nWords: ${p.word_count} | Links: ${p.link_count}\nAuthor: ${p.author} | Modified: ${p.modified}\n\n--- Content ---\n${p.content_raw}`
                    }]
                };
            }

            case 'update_post': {
                const body = {};
                if (args.title) body.title = args.title;
                if (args.content) body.content = args.content;
                if (args.excerpt) body.excerpt = args.excerpt;
                if (args.status) body.status = args.status;
                if (args.slug) body.slug = args.slug;
                const result = await wpRequest(`/content/${args.post_id}`, 'POST', body);
                return { content: [{ type: 'text', text: result.message + ` | URL: ${result.url}` }] };
            }

            case 'find_links': {
                const result = await wpRequest(`/content/${args.post_id}/links`);
                let text = `Links in "${result.post_title}" (${result.total_links} total):\n`;
                text += `Internal: ${result.internal_count} | External: ${result.external_count}\n\n`;
                if (result.internal_links.length > 0) {
                    text += '--- Internal Links ---\n';
                    text += result.internal_links.map(l => `- "${l.text}" → ${l.url}`).join('\n');
                    text += '\n\n';
                }
                if (result.external_links.length > 0) {
                    text += '--- External Links ---\n';
                    text += result.external_links.map(l => `- "${l.text}" → ${l.url}`).join('\n');
                }
                return { content: [{ type: 'text', text }] };
            }

            case 'update_link': {
                const result = await wpRequest(`/content/${args.post_id}/links`, 'POST', {
                    old_url: args.old_url,
                    new_url: args.new_url,
                });
                return { content: [{ type: 'text', text: result.message }] };
            }

            case 'find_and_replace': {
                const result = await wpRequest(`/content/${args.post_id}/replace`, 'POST', {
                    find: args.find,
                    replace: args.replace,
                    case_sensitive: args.case_sensitive ?? true,
                });
                return { content: [{ type: 'text', text: result.message + '\nDetails: ' + result.details.join(', ') }] };
            }

            // POST LISTING & COUNTS
            case 'list_posts': {
                const params = new URLSearchParams();
                if (args.post_type) params.set('post_type', args.post_type);
                if (args.status) params.set('status', args.status);
                if (args.per_page) params.set('per_page', args.per_page);
                if (args.page) params.set('page', args.page);
                if (args.orderby) params.set('orderby', args.orderby);
                if (args.order) params.set('order', args.order);
                const result = await wpRequest(`/content/list?${params.toString()}`);
                const postList = result.posts.map(p =>
                    `- [${p.id}] ${p.title} (${p.status}) - ${p.date?.split(' ')[0] || ''} - ${p.word_count} words`
                ).join('\n');
                return {
                    content: [{
                        type: 'text',
                        text: `${result.post_type} posts (${result.status_filter}): ${result.count} of ${result.total} total (page ${result.current_page}/${result.pages})\n\n${postList || 'No posts found.'}`
                    }]
                };
            }

            case 'get_post_counts': {
                const params = new URLSearchParams();
                if (args.post_type) params.set('post_type', args.post_type);
                const result = await wpRequest(`/content/counts?${params.toString()}`);
                const countLines = Object.entries(result.counts).map(([status, count]) =>
                    `- ${status}: ${count}`
                ).join('\n');
                return {
                    content: [{
                        type: 'text',
                        text: `Post counts for "${result.post_type}":\n\nTotal (excl. trash): ${result.total}\n\n${countLines}`
                    }]
                };
            }

            // RANK MATH SEO
            case 'get_seo_data': {
                const result = await wpRequest(`/seo/${args.post_id}`);
                const s = result.seo;
                const social = result.social;
                let text = `SEO Data for "${result.post_title}" (ID: ${result.post_id})\n`;
                text += `URL: ${result.post_url}\n\n`;
                text += `--- SEO ---\n`;
                text += `Title: ${s.title}\n`;
                text += `Description: ${s.description}\n`;
                text += `Focus Keyword: ${s.focus_keyword}\n`;
                text += `Score: ${s.score !== null ? s.score + '/100 (' + s.score_label + ')' : 'Not scored'}\n`;
                text += `Robots: ${Array.isArray(s.robots) ? s.robots.join(', ') : s.robots}\n`;
                text += `Canonical: ${s.canonical_url}\n`;
                text += `Pillar Content: ${s.pillar_content ? 'Yes' : 'No'}\n`;
                text += `Schema: ${s.schema_type}\n\n`;
                text += `--- Social ---\n`;
                text += `OG Title: ${social.og_title || '(using SEO title)'}\n`;
                text += `OG Description: ${social.og_description || '(using meta description)'}\n`;
                return { content: [{ type: 'text', text }] };
            }

            case 'update_seo_data': {
                const body = {};
                if (args.seo_title) body.seo_title = args.seo_title;
                if (args.seo_description) body.seo_description = args.seo_description;
                if (args.focus_keyword) body.focus_keyword = args.focus_keyword;
                if (args.canonical_url) body.canonical_url = args.canonical_url;
                if (args.robots) body.robots = args.robots;
                if (args.og_title) body.og_title = args.og_title;
                if (args.og_description) body.og_description = args.og_description;
                if (args.pillar_content !== undefined) body.pillar_content = args.pillar_content;
                const result = await wpRequest(`/seo/${args.post_id}`, 'POST', body);
                return { content: [{ type: 'text', text: result.message }] };
            }

            case 'get_seo_status': {
                const result = await wpRequest('/seo/status');
                let text = `Rank Math: ${result.rank_math_active ? 'Active' : 'Not Active'}`;
                if (result.version) text += ` (v${result.version})`;
                if (result.stats) {
                    text += `\nPosts with SEO score: ${result.stats.posts_with_score}`;
                    text += `\nPosts with focus keyword: ${result.stats.posts_with_focus_keyword}`;
                }
                return { content: [{ type: 'text', text }] };
            }

            default:
                throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
    } catch (error) {
        console.error(`[MCP] Error: ${error.message}`);
        return {
            content: [{
                type: 'text',
                text: `Error: ${error.message}`
            }],
            isError: true
        };
    }
});

// Start server
async function main() {
    if (!CONFIG.username || !CONFIG.applicationPassword) {
        console.error('⚠️ Warning: WP_USER and WP_APP_PASSWORD not set');
    }

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('NVB MCP Server v1.7.3 running');
}

main().catch(console.error);
