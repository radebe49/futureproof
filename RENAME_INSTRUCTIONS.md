# Repository Rename Instructions: futureproof → lockdrop

## Step 1: Rename Repository on GitHub (Manual)

1. Go to https://github.com/radebe49/futureproof
2. Click the **"Settings"** tab
3. Scroll down to the **"Repository name"** section
4. Change `futureproof` to `lockdrop`
5. Click **"Rename"** button
6. GitHub will show a warning about redirects - click **"I understand, rename my repository"**

**Note:** GitHub will automatically redirect `futureproof` URLs to `lockdrop` for a while, but it's best to update all references.

---

## Step 2: Run the Rename Script (Automated)

After renaming on GitHub, run this command in your terminal:

```bash
./scripts/rename-to-lockdrop.sh
```

This script will automatically:
- ✅ Update `package.json` and `package-lock.json`
- ✅ Update all documentation files
- ✅ Update GitHub workflow files
- ✅ Update utility and source files
- ✅ Update git remote URL
- ✅ Replace all instances of "futureproof" with "lockdrop"

---

## Step 3: Verify Changes

Check what was changed:

```bash
git status
```

Review the changes:

```bash
git diff
```

Test that the app still works:

```bash
npm run dev
```

Visit http://localhost:3000 and verify everything works.

---

## Step 4: Commit and Push

Commit the changes:

```bash
git add -A
git commit -m "refactor: rename from futureproof to lockdrop"
```

Push to the renamed repository:

```bash
git push origin main
```

---

## What Gets Updated

### Package Files
- `package.json` - name field
- `package-lock.json` - name field

### Documentation
- `CHANGELOG.md`
- `CONTRIBUTING.md`
- `LICENSE`
- `WALLET_SETUP_GUIDE.md`
- `WALLET_TROUBLESHOOTING.md`
- `CI_CD_GUIDE.md`
- `POLKADOT_ECOSYSTEM_EXPLAINED.md`

### GitHub Files
- `.github/QUICK_START.md`
- `.github/DEPLOYMENT_CHECKLIST.md`
- `.github/workflows/ci.yml`
- `.github/ISSUE_TEMPLATE/bug_report.md`

### Source Code
- `utils/edgeCaseValidation.ts` - web3Enable app name
- `utils/errorHandling.ts` - error messages
- Various README files

### Git Configuration
- Remote URL: `https://github.com/radebe49/lockdrop.git`

---

## Troubleshooting

### If the script fails

Run individual replacements manually:

```bash
# Update package.json
sed -i '' 's/futureproof-app/lockdrop-app/g' package.json

# Update git remote
git remote set-url origin https://github.com/radebe49/lockdrop.git

# Check remote
git remote -v
```

### If you need to rollback

Before running the script, create a backup:

```bash
git stash
```

To restore:

```bash
git stash pop
```

---

## After Rename Checklist

- [ ] Repository renamed on GitHub
- [ ] Script executed successfully
- [ ] Changes reviewed with `git status`
- [ ] App tested locally with `npm run dev`
- [ ] Changes committed
- [ ] Changes pushed to GitHub
- [ ] Verify GitHub repository shows new name
- [ ] Update any external links (Vercel, documentation sites, etc.)
- [ ] Update README badges if any
- [ ] Notify team members of new repository URL

---

## External Services to Update (if applicable)

If you have these services connected, update them too:

### Vercel
1. Go to Vercel dashboard
2. Select your project
3. Settings → General → Project Name
4. Update to "lockdrop"

### Environment Variables
No changes needed - `.env.local` doesn't reference the repo name

### CI/CD
The script updates `.github/workflows/ci.yml` automatically

---

## Questions?

If you encounter any issues:
1. Check the script output for errors
2. Review `git status` to see what changed
3. Test locally before pushing
4. Create a backup branch if unsure: `git checkout -b backup-before-rename`

---

**Ready to proceed?**

1. ✅ Rename on GitHub
2. ✅ Run `./scripts/rename-to-lockdrop.sh`
3. ✅ Test locally
4. ✅ Commit and push
