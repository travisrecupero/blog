const fs = require('fs');
const https = require('https');

// Configuration
const CONFIG = {
    GITHUB_REPO: process.env.OBSIDIAN_REPO || 'your-username/your-obsidian-vault',
    GITHUB_API_BASE: 'https://api.github.com/repos',
    MAX_EXCERPT_LENGTH: 200
};

const token = process.env.GITHUB_TOKEN;
if (!token) {
    console.error('GITHUB_TOKEN environment variable is required');
    process.exit(1);
}


const headers = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Blog-Static-Generator'
};

async function fetchAllMarkdownFiles(path = '') {
    try {
        const url = `${CONFIG.GITHUB_API_BASE}/${CONFIG.GITHUB_REPO}/contents/${path}`;
        const contents = await makeRequest(url, headers);
        let markdownFiles = [];

        for (const item of contents) {
            if (item.type === 'file' && item.name.endsWith('.md') && !item.name.startsWith('.')) {
                markdownFiles.push({
                    ...item,
                    path: path ? `${path}/${item.name}` : item.name
                });
            } else if (item.type === 'dir' && !item.name.startsWith('.')) {
                const subdirFiles = await fetchAllMarkdownFiles(item.path);
                markdownFiles = markdownFiles.concat(subdirFiles);
            }
        }

        return markdownFiles;
    } catch (error) {
        console.error(`Error fetching ${path}:`, error.message);
        return [];
    }
}

async function parseNote(file) {
    try {
        const apiUrl = `${CONFIG.GITHUB_API_BASE}/${CONFIG.GITHUB_REPO}/contents/${encodeURIComponent(file.path)}`;
        const fileData = await makeRequest(apiUrl, headers);

        // Decode base64 content
        const base64Content = fileData.content.replace(/\s/g, '');
        const binaryString = Buffer.from(base64Content, 'base64').toString('utf-8');
        const content = binaryString;
        const lines = content.split('\n');

        // Extract title
        let title = lines.find(line => line.startsWith('# '))?.replace('# ', '') ||
                   file.name.replace('.md', '').replace(/-/g, ' ');

        // Extract content without frontmatter
        const cleanContent = content.replace(/^---[\s\S]*?---/, '').trim();

        // Extract excerpt
        const excerpt = cleanContent
            .replace(/!\[.*?\]\(.*?\)/g, '')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/[#*`_~]/g, '')
            .replace(/\n+/g, ' ')
            .trim()
            .substring(0, CONFIG.MAX_EXCERPT_LENGTH) + '...';

        // Extract tags
        const tags = [];
        const hashtagMatches = content.match(/#[\w-]+/g);
        if (hashtagMatches) {
            hashtagMatches.forEach(tag => tags.push(tag.replace('#', '')));
        }

        // Determine category
        const pathLower = file.path.toLowerCase();
        let category = 'note';
        if (pathLower.includes('computing')) category = 'computing';
        else if (pathLower.includes('math')) category = 'math';
        else if (pathLower.includes('philosophy')) category = 'philosophy';
        else if (pathLower.includes('misc')) category = 'misc';

        return {
            title,
            excerpt,
            content: cleanContent,
            tags,
            category,
            path: file.path,
            filename: file.name,
            lastModified: new Date().toISOString(),
            url: `https://github.com/${CONFIG.GITHUB_REPO}/blob/main/${encodeURIComponent(file.path)}`
        };

    } catch (error) {
        console.error(`Error parsing ${file.name}:`, error.message);
        return null;
    }
}

function shouldPublishNote(note) {
    // Simple filtering - exclude private or draft content
    const excludeTags = ['private', 'draft', 'personal', 'hide'];
    const excludePatterns = [/private/i, /draft/i, /\.private\./i];

    // Exclude by tags
    if (excludeTags.some(tag => note.tags.includes(tag))) {
        return false;
    }

    // Exclude by filename patterns
    if (excludePatterns.some(pattern => pattern.test(note.filename) || pattern.test(note.path))) {
        return false;
    }

    // Check minimum content length
    if (note.content.length < 50) {
        return false;
    }

    return true;
}

function makeRequest(url, headers) {
    return new Promise((resolve, reject) => {
        const request = https.request(url, { headers }, (response) => {
            let data = '';

            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                if (response.statusCode >= 200 && response.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (error) {
                        reject(new Error(`Invalid JSON response: ${error.message}`));
                    }
                } else {
                    reject(new Error(`HTTP ${response.statusCode}: ${data}`));
                }
            });
        });

        request.on('error', (error) => {
            reject(error);
        });

        request.end();
    });
}

async function main() {
    try {
        const allFiles = await fetchAllMarkdownFiles('');

        if (allFiles.length === 0) {
            throw new Error('No markdown files found in repository');
        }

        const parsedNotes = [];

        for (let i = 0; i < allFiles.length; i++) {
            const file = allFiles[i];

            const note = await parseNote(file);
            if (note) {
                parsedNotes.push(note);
            }

            // Rate limiting
            if (i % 10 === 0 && i > 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        const validNotes = parsedNotes.filter(note => note !== null);

        // Apply filtering
        const publishableNotes = validNotes.filter(note => shouldPublishNote(note));

        if (publishableNotes.length === 0) {
            throw new Error(`No notes passed filtering criteria. Found ${validNotes.length} valid notes but all were filtered out.`);
        }

        // Write notes data to JSON file
        const notesData = {
            notes: publishableNotes,
            generatedAt: new Date().toISOString(),
            totalNotes: publishableNotes.length
        };

        fs.writeFileSync('notes-data.json', JSON.stringify(notesData, null, 2));
console.log(`Successfully processed ${publishableNotes.length} notes`);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();