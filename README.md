# Digital Garden Blog

A modern, responsive blog website that automatically syncs with your Obsidian vault to create a beautiful digital garden of interconnected thoughts and notes.

## 🌱 Features

- **Automatic Obsidian Integration**: Fetches notes directly from your GitHub-hosted Obsidian vault
- **Beautiful Design**: Modern, clean interface with smooth animations and responsive design
- **Smart Categorization**: Automatically categorizes notes (Daily, Projects, Ideas, etc.)
- **Search & Filter**: Full-text search and category filtering
- **Tag System**: Extracts and displays tags from your notes
- **Connection Tracking**: Shows internal links between notes
- **Performance Optimized**: Caching, lazy loading, and optimized rendering
- **Mobile Responsive**: Works perfectly on all devices
- **Dark Mode Ready**: Supports system dark mode preference

## 🚀 Quick Start

### Prerequisites

- A GitHub repository containing your Obsidian vault (markdown files)
- Basic web hosting (GitHub Pages, Netlify, Vercel, etc.)

### Setup

1. **Clone or download this repository**
   ```bash
   git clone https://github.com/yourusername/blog.git
   cd blog
   ```

2. **Configure your Obsidian vault**
   - Open `script.js`
   - Update the `CONFIG` object with your repository details:
   ```javascript
   const CONFIG = {
       GITHUB_REPO: 'your-username/your-obsidian-repo',
       // ... other settings
   };
   ```

3. **Customize your site**
   - Update the title and description in `index.html`
   - Modify the hero section with your personal information
   - Adjust colors and styling in `styles.css`

4. **Setup GitHub Actions Deployment**
   - Go to your repository Settings → Secrets and variables → Actions
   - Add a new repository secret: `OBSIDIAN_GITHUB_TOKEN` with your GitHub token
   - (Optional) Add `OBSIDIAN_REPO` secret with your vault repo (defaults to 'your-username/your-obsidian-repo')
   - Enable GitHub Pages in Settings → Pages → Source: "GitHub Actions"
   - Push to main branch to trigger automated deployment

### Configuration Options

In `script.js`, you can customize:

- `GITHUB_REPO`: Your Obsidian vault repository
- `CACHE_DURATION`: How long to cache notes (default: 5 minutes)
- `MAX_EXCERPT_LENGTH`: Length of note excerpts (default: 200 characters)
- `ITEMS_PER_PAGE`: Notes per page for pagination (default: 12)

## 📁 File Structure

```
blog/
├── index.html          # Main HTML structure
├── styles.css          # CSS styling and responsive design
├── script.js           # JavaScript functionality
├── README.md           # This file
└── LICENSE            # License information
```

## 🎨 Customization

### Colors and Branding

The CSS uses CSS custom properties (variables) for easy customization:

```css
:root {
    --primary-color: #2563eb;    /* Main accent color */
    --secondary-color: #f8fafc;  /* Background variations */
    --accent-color: #10b981;     /* Success/highlight color */
    /* ... more variables */
}
```

### Categories

The system automatically categorizes notes based on:

- **Daily Notes**: Files with date patterns (YYYY-MM-DD) or "daily" in the title
- **Projects**: Notes tagged with "project" or containing "project status"
- **Ideas**: Notes tagged with "idea" or containing "brainstorm"
- **General Notes**: Everything else

You can customize this logic in the `determineCategory` function.

### Markdown Processing

The system processes:

- **Frontmatter**: YAML metadata at the top of files
- **Tags**: Both frontmatter tags and #hashtags in content
- **Internal Links**: [[Obsidian-style links]]
- **Basic Markdown**: Headings, links, formatting

## 🔧 Advanced Features

### Search Functionality

- Real-time search across titles, content, and tags
- Debounced input for performance
- Highlights matching terms

### Caching System

- Automatic caching of API responses
- Configurable cache duration
- Graceful fallback when cache expires

### Performance Optimization

- Lazy loading of note content
- Infinite scroll pagination
- Optimized rendering with CSS animations
- Efficient DOM manipulation

## 🌐 Hosting Options

### GitHub Pages with Actions (Recommended)

This repository is configured for automated GitHub Actions deployment:

1. **Setup Repository Secrets**:
   - Go to Settings → Secrets and variables → Actions
   - Add `OBSIDIAN_GITHUB_TOKEN`: Your GitHub Personal Access Token
   - Add `OBSIDIAN_REPO`: Your Obsidian vault repository (optional)

2. **Enable GitHub Pages**:
   - Go to Settings → Pages
   - Source: "GitHub Actions"
   - Save settings

3. **Deploy**: Push to main branch and GitHub Actions will:
   - Fetch your notes securely using your token
   - Generate a static `notes-data.json` file
   - Deploy your site to GitHub Pages
   - Your site will be available at `https://username.github.io/repository-name`

### Manual GitHub Pages (Alternative)

1. Push your code to a GitHub repository
2. Go to Settings > Pages
3. Select source branch (main)
4. Your site will be available at `https://username.github.io/repository-name`

### Netlify (Free)

1. Connect your GitHub repository
2. Deploy automatically on every push
3. Custom domain support available

### Vercel (Free)

1. Import your GitHub repository
2. Zero-config deployment
3. Automatic HTTPS and global CDN

## 🔒 Privacy & Security

### GitHub Actions Deployment (Secure)
- **Token Protection**: GitHub token stored securely in repository secrets
- **Build-time Processing**: Notes fetched during build, not exposed to clients
- **Static Output**: No tokens or sensitive data in deployed site
- **Private Repository Support**: Works with private repositories

### Local Development
- Token stored locally in `config-secure.js` (gitignored)
- Fallback API fetching for development
- No personal data collection
- Cache stored only in browser localStorage

## 🐛 Troubleshooting

### Notes not loading

- Check that your repository is public
- Verify the repository name in `CONFIG.GITHUB_REPO`
- Ensure your Obsidian vault contains `.md` files
- Check browser console for errors

### Performance issues

- Reduce `ITEMS_PER_PAGE` if you have many notes
- Increase `CACHE_DURATION` to reduce API calls
- Consider using a CDN for faster asset delivery

### Styling issues

- Clear browser cache
- Check for CSS conflicts
- Verify all CSS files are loading correctly

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
