# Obsidian Blog

A static website generator that creates a clean, searchable blog from your Obsidian vault stored on GitHub.

## How It Works

This tool automatically fetches markdown files from your Obsidian vault repository and generates a static website with:
- Searchable note index
- Category filtering
- Tag extraction
- Note reader interface

## Setup

### 1. Prepare Your Obsidian Vault

**Repository Structure:**
Your Obsidian vault should be a public GitHub repository with `.md` files organized however you prefer.

**Supported Markdown Features:**
- Headers (`# Title`)
- Tags (`#tag` or in frontmatter)
- Internal links (`[[Note Name]]`)
- Basic formatting (bold, italic, code)

**Automatic Categorization:**
Notes are categorized based on folder names:
- Files in `computing/` folder → Computing category
- Files in `math/` folder → Math category
- Files in `philosophy/` folder → Philosophy category
- Files in `misc/` folder → Misc category
- All other files → Note category

**Filtering Options:**
Notes with these tags/patterns are excluded:
- Tags: `private`, `draft`, `personal`, `hide`
- Filenames containing: `private`, `draft`, `.private.`
- Files under 50 characters

### 2. Deploy Your Blog

**Fork and Configure:**
1. Fork this repository to your GitHub account
2. In your forked blog repository, update `script.js` line 3: Set `GITHUB_REPO` to `yourusername/your-obsidian-vault-repo`
3. In your forked blog repository, go to Settings → Secrets and variables → Actions
4. Add repository secret `OBSIDIAN_GITHUB_TOKEN`: Your GitHub Personal Access Token with read access to your Obsidian vault repository

**Enable GitHub Pages:**
1. In your forked blog repository, go to Settings → Pages
2. Source: "Deploy from a branch"
3. Branch: "gh-pages"
4. Push to main branch to deploy

Your blog will be live at `https://yourusername.github.io/repository-name`

## Local Development

1. In your local blog repository, copy `config-secure.js.example` to `config-secure.js`
2. Add your GitHub Personal Access Token to the `GITHUB_TOKEN` field in `config-secure.js`
3. Update the `GITHUB_REPO` field to point to your Obsidian vault repository
4. Serve with any local server (e.g., `python -m http.server`)

## Customization

**Site Information:**
- Edit `index.html`: Update title, description, and hero text
- Edit `styles.css`: Customize colors and styling

**Content Filtering:**
- Edit `.github/scripts/fetch-notes.js`: Modify the `shouldPublishNote` function

**Categories:**
- Add new folder-based categories in the `parseNote` function
- Update filter buttons in `index.html`

## Technical Details

**Build Process:**
1. GitHub Actions runs on push to main
2. Fetches notes from your Obsidian vault using your token
3. Processes markdown and generates `notes-data.json`
4. Deploys static site to gh-pages branch

**Security:**
- Tokens stored securely in GitHub repository secrets
- No sensitive data in deployed code
- Static site with no server dependencies