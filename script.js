// Simple, clean blog application - no modules, no debug noise
const CONFIG = {
    GITHUB_REPO: 'travisrecupero/obsidian_notes',
    GITHUB_API_BASE: 'https://api.github.com/repos',
    MAX_EXCERPT_LENGTH: 200
};

let notes = [];
let filteredNotes = [];
let currentFilter = 'all';

// DOM elements - will be set after DOM loads
let elements = {};

document.addEventListener('DOMContentLoaded', init);

async function init() {
    // Initialize DOM elements after DOM is ready
    elements = {
        notesGrid: document.getElementById('notes-grid'),
        loading: document.getElementById('loading'),
        searchInput: document.getElementById('search'),
        filterBtns: document.querySelectorAll('.filter-btn')
    };

    setupEventListeners();
    await loadNotes();
}

function setupEventListeners() {
    // Search
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', debounce(handleSearch, 300));
    }

    // Filters
    elements.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            filterAndRenderNotes();
        });
    });
}

async function loadNotes() {
    showLoading();

    try {
        // Try to load pre-built notes data first (for GitHub Pages deployment)
        try {
            const response = await fetch('notes-data.json');
            if (response.ok) {
                const notesData = await response.json();
                notes = notesData.notes || [];

                // Ensure we have valid notes data
                if (!notes || notes.length === 0) {
                    throw new Error('Notes data is empty');
                }

                filterAndRenderNotes();
                hideLoading(); // Success - hide loading and return
                return;
            } else {
            }
        } catch (error) {
            // Don't throw here - fall through to API fallback
        }

        // Fallback to GitHub API (for local development only)
        const token = window.SECURE_CONFIG?.GITHUB_TOKEN;
        if (!token || token === 'your_token_here') {
            // For production: notes should come from pre-built data
            // For local dev: need config-secure.js
            const isLocalDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
            if (isLocalDev) {
                throw new Error('Local development requires config-secure.js with your GitHub token. Copy config-secure.js.example to config-secure.js and add your token.');
            } else {
                throw new Error('Notes data not available. This appears to be a deployment issue - the GitHub Actions build may have failed to generate notes-data.json');
            }
        }

        const headers = {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        };

        // Fetch all markdown files
        const allFiles = await fetchAllMarkdownFiles('', headers);

        if (allFiles.length === 0) {
            throw new Error('No markdown files found in repository');
        }

        // Parse notes with rate limiting to avoid GitHub API limits
        const parsedNotes = [];

        for (let i = 0; i < allFiles.length; i++) {
            const file = allFiles[i];

            const note = await parseNote(file, headers);
            if (note) {
                parsedNotes.push(note);
            }

            // Small delay to avoid rate limiting (GitHub allows 60 requests per hour for unauthenticated, 5000 for authenticated)
            if (i % 10 === 0 && i > 0) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        const validNotes = parsedNotes.filter(note => note !== null);

        // Apply filtering
        notes = validNotes.filter(note => shouldPublishNote(note));

        if (notes.length === 0) {
            throw new Error(`No notes passed filtering criteria. Found ${validNotes.length} valid notes but all were filtered out.`);
        }
        filterAndRenderNotes();

    } catch (error) {
        console.error('Error loading notes:', error);
        showError(error.message);
    } finally {
        hideLoading();
    }
}

async function fetchAllMarkdownFiles(path = '', headers) {
    try {
        const url = `${CONFIG.GITHUB_API_BASE}/${CONFIG.GITHUB_REPO}/contents/${path}`;
        const response = await fetch(url, { headers });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const contents = await response.json();
        let markdownFiles = [];

        for (const item of contents) {
            if (item.type === 'file' && item.name.endsWith('.md') && !item.name.startsWith('.')) {
                markdownFiles.push({
                    ...item,
                    path: path ? `${path}/${item.name}` : item.name
                });
            } else if (item.type === 'dir' && !item.name.startsWith('.')) {
                const subdirFiles = await fetchAllMarkdownFiles(item.path, headers);
                markdownFiles = markdownFiles.concat(subdirFiles);
            }
        }

        return markdownFiles;
    } catch (error) {
        return [];
    }
}

async function parseNote(file, headers) {
    try {
        // Use GitHub API to get file content instead of raw URL to avoid CORS
        const apiUrl = `${CONFIG.GITHUB_API_BASE}/${CONFIG.GITHUB_REPO}/contents/${encodeURIComponent(file.path)}`;
        const response = await fetch(apiUrl, { headers });

        if (!response.ok) {
            return null;
        }

        const fileData = await response.json();

        // GitHub API returns base64 encoded content - properly decode UTF-8
        const base64Content = fileData.content.replace(/\s/g, '');
        const binaryString = atob(base64Content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const content = new TextDecoder('utf-8').decode(bytes);
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
            lastModified: new Date(),
            url: `https://github.com/${CONFIG.GITHUB_REPO}/blob/main/${encodeURIComponent(file.path)}`
        };

    } catch (error) {
        return null;
    }
}

function shouldPublishNote(note) {
    const criteria = window.SECURE_CONFIG?.PUBLISH_CRITERIA;
    if (!criteria) return true;

    // Exclude by tags
    if (criteria.excludeTags?.some(tag => note.tags.includes(tag))) {
        return false;
    }

    // Exclude by filename patterns
    if (criteria.excludePatterns?.some(pattern => pattern.test(note.filename) || pattern.test(note.path))) {
        return false;
    }

    // Exclude specific files
    if (criteria.excludeFiles?.includes(note.filename)) {
        return false;
    }

    // Check minimum content length
    if (criteria.minContentLength && note.content.length < criteria.minContentLength) {
        return false;
    }

    return true;
}

function filterAndRenderNotes() {
    const searchTerm = elements.searchInput?.value.trim().toLowerCase() || '';

    filteredNotes = notes.filter(note => {
        // Category filter
        if (currentFilter !== 'all' && note.category !== currentFilter) {
            return false;
        }

        // Search filter
        if (searchTerm && !note.title.toLowerCase().includes(searchTerm) &&
            !note.excerpt.toLowerCase().includes(searchTerm)) {
            return false;
        }

        return true;
    });

    // Sort by title
    filteredNotes.sort((a, b) => a.title.localeCompare(b.title));

    renderNotes();
}

function renderNotes() {
    if (!elements.notesGrid) return;

    elements.notesGrid.innerHTML = '';

    if (filteredNotes.length === 0) {
        elements.notesGrid.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #666;">
                <p>No notes found. Try adjusting your search or filter.</p>
            </div>
        `;
        return;
    }

    filteredNotes.forEach(note => {
        const card = createNoteCard(note);
        elements.notesGrid.appendChild(card);
    });
}

function createNoteCard(note) {
    const card = document.createElement('div');
    card.className = 'note-card fade-in';
    card.setAttribute('data-category', note.category);
    card.onclick = (event) => openNoteReader(note, event.currentTarget);

    const categoryIcons = {
        computing: '[C]',
        math: '[M]',
        philosophy: '[P]',
        misc: '[N]',
        note: '[N]'
    };

    const tagsHtml = note.tags.slice(0, 3).map(tag =>
        `<span class="note-tag">${escapeHtml(tag)}</span>`
    ).join('');

    card.innerHTML = `
        <h3 class="note-title">
            <span class="category-indicator">${categoryIcons[note.category] || '[N]'}</span>
            ${escapeHtml(note.title)}
        </h3>
        <p class="note-excerpt">${escapeHtml(note.excerpt)}</p>
        <div class="note-meta">
            <span class="note-date">${formatDate(note.lastModified)}</span>
            <div class="note-tags">${tagsHtml}</div>
        </div>
    `;

    return card;
}


function showLoading() {
    if (elements.loading) elements.loading.classList.remove('hidden');
}

function hideLoading() {
    if (elements.loading) elements.loading.classList.add('hidden');
}

function showError(message) {
    if (elements.notesGrid) {
        elements.notesGrid.innerHTML = `
            <div style="text-align: center; padding: 2rem; background: #fee; border: 1px solid #fcc; border-radius: 8px; color: #c53030;">
                <h3>⚠️ Error Loading Notes</h3>
                <p>${message}</p>
                <button onclick="location.reload()" style="padding: 0.5rem 1rem; background: #3182ce; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 1rem;">
                    Retry
                </button>
            </div>
        `;
    }
}

function handleSearch() {
    filterAndRenderNotes();
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(date) {
    // Handle both Date objects and ISO strings
    const dateObj = date instanceof Date ? date : new Date(date);

    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
        return 'Unknown date';
    }

    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    }).format(dateObj);
}

// Note reader functionality
function openNoteReader(note, clickedCard = null) {
    const placeholder = document.querySelector('.note-reader-placeholder');
    const readerContent = document.getElementById('note-reader-content');
    const readerTitle = document.getElementById('reader-note-title');
    const readerBody = document.getElementById('reader-note-content');

    // Remove active class from all cards
    document.querySelectorAll('.note-card').forEach(card => {
        card.classList.remove('active');
    });

    // Add active class to clicked card
    if (clickedCard) {
        clickedCard.classList.add('active');
    }

    placeholder.style.display = 'none';
    readerContent.style.display = 'flex';

    readerTitle.textContent = note.title;
    readerBody.innerHTML = convertMarkdownToHTML(note.content);
}

function closeNoteReader() {
    const placeholder = document.querySelector('.note-reader-placeholder');
    const readerContent = document.getElementById('note-reader-content');

    placeholder.style.display = 'flex';
    readerContent.style.display = 'none';
}

function convertMarkdownToHTML(markdown) {
    return markdown
        // Headers
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')

        // Bold and italic
        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')

        // Code
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/```[\s\S]*?```/g, (match) => {
            const code = match.replace(/```/g, '').trim();
            return `<pre><code>${escapeHtml(code)}</code></pre>`;
        })

        // Links - handle both external and internal
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
        .replace(/\[\[([^\]]+)\]\]/g, '<a href="#" onclick="searchForNote(\'$1\')" style="background: #f0f0f0; padding: 0.2rem 0.4rem; border-radius: 4px; text-decoration: none;">$1</a>')

        // Lists
        .replace(/^\* (.*$)/gim, '<li>$1</li>')
        .replace(/^\- (.*$)/gim, '<li>$1</li>')
        .replace(/^(\d+)\. (.*$)/gim, '<li>$1. $2</li>')

        // Wrap consecutive list items in ul tags
        .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')

        // Blockquotes
        .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')

        // Line breaks
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')

        // Wrap in paragraphs
        .replace(/^/, '<p>')
        .replace(/$/, '</p>')

        // Clean up empty paragraphs
        .replace(/<p><\/p>/g, '')
        .replace(/<p><h/g, '<h')
        .replace(/<\/h([1-6])><\/p>/g, '</h$1>');
}

function searchForNote(noteName) {
    // Find note with matching title and open it
    const foundNote = notes.find(note =>
        note.title.toLowerCase().includes(noteName.toLowerCase()) ||
        note.filename.toLowerCase().includes(noteName.toLowerCase())
    );

    if (foundNote) {
        openNoteReader(foundNote);
    } else {
        // If not found, search for it in the search box
        const searchInput = document.getElementById('search');
        if (searchInput) {
            searchInput.value = noteName;
            handleSearch();
        }
    }
}

// Global refresh function
window.forceRefresh = () => {
    notes = [];
    filteredNotes = [];
    loadNotes();
};

// Make closeNoteReader globally accessible
window.closeNoteReader = closeNoteReader;