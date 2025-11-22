# Setup Instructions

## For Local Development

1. **Copy the configuration template:**
   ```bash
   cp config-secure.js.example config-secure.js
   ```

2. **Edit `config-secure.js`:**
   - Add your GitHub Personal Access Token
   - Customize filtering criteria if needed

3. **Update repository references:**
   - Edit `script.js` line 3: Update `GITHUB_REPO` to your Obsidian vault repository
   - Edit `.github/scripts/fetch-notes.js` line 6: Update default repository

## For GitHub Pages Deployment

1. **Add Repository Secrets:**
   - Go to your repository Settings → Secrets and variables → Actions
   - Add `OBSIDIAN_GITHUB_TOKEN`: Your GitHub Personal Access Token
   - Add `OBSIDIAN_REPO`: Your Obsidian vault repository (e.g., 'username/vault-repo')

2. **Enable GitHub Pages:**
   - Go to Settings → Pages
   - Source: "GitHub Actions"

3. **Customize the site:**
   - Update `index.html` with your personal information
   - Modify `styles.css` for custom styling
   - Update repository references in the code

## Security Notes

- Never commit `config-secure.js` - it's in `.gitignore`
- Use GitHub repository secrets for production deployment
- Your token needs read access to your Obsidian vault repository