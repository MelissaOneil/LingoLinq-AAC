# LingoLinq Ember 3.12 → 3.16 Upgrade Plan

## Safe Upgrade Strategy for Nested Directory Structure

**Document Version:** 1.0  
**Created:** November 28, 2025  
**Project:** LingoLinq AAC  
**Current State:** Ember 3.12.0 in `app/frontend/` subdirectory of Rails project  
**Target State:** Ember 3.16.0 (LTS)

---

## Executive Summary

This plan addresses the **critical file deletion issue** experienced in the previous upgrade attempt. The root cause was a documented bug in `ember-cli-update` that affects projects where the Ember app lives in a subdirectory of a larger git repository (monorepo pattern).

**Key Safety Measure:** We'll use an **isolated patch-based approach** that runs ember-cli-update in a temporary directory, completely separated from the main repository, then applies changes via git patch.

---

## Pre-Upgrade Checklist

### 1. Environment Verification

```bash
# Verify Node.js version (must be 12+ for Ember 3.16, you have 18/20)
node --version
# Expected: v18.x.x or v20.x.x ✓

# Verify npm version
npm --version

# Verify current Ember version
cd app/frontend
cat package.json | grep -A2 '"ember-source"'
# Expected: "ember-source": "~3.12.0"
```

### 2. Document Current State

```bash
# From project root
cd /path/to/LingoLinq-AAC

# Count files that should NOT change (for verification later)
echo "=== Files to verify after upgrade ===" > ~/pre-upgrade-inventory.txt
echo "Rails controllers:" >> ~/pre-upgrade-inventory.txt
ls -la app/controllers/*.rb >> ~/pre-upgrade-inventory.txt 2>/dev/null || echo "None found" >> ~/pre-upgrade-inventory.txt

echo "Root config files:" >> ~/pre-upgrade-inventory.txt
ls -la .gitignore .ruby-version Gemfile README.md >> ~/pre-upgrade-inventory.txt 2>/dev/null

echo "DevContainer files:" >> ~/pre-upgrade-inventory.txt
ls -la .devcontainer/ >> ~/pre-upgrade-inventory.txt 2>/dev/null || echo "None found" >> ~/pre-upgrade-inventory.txt

echo "Environment files:" >> ~/pre-upgrade-inventory.txt
ls -la .env* >> ~/pre-upgrade-inventory.txt 2>/dev/null || echo "None found" >> ~/pre-upgrade-inventory.txt

cat ~/pre-upgrade-inventory.txt
```

### 3. Check for Existing Deprecations

Before upgrading, document any deprecation warnings in the current version:

```bash
cd app/frontend

# Start dev server and check browser console
ember serve
# Open http://localhost:4200 (or your configured port)
# Check browser Developer Tools > Console for deprecation warnings
# Document any found in ~/pre-upgrade-deprecations.txt

# Run tests and capture deprecation output
ember test 2>&1 | tee ~/ember-test-output.txt
grep -i "deprecat" ~/ember-test-output.txt > ~/pre-upgrade-deprecations.txt
```

### 4. Create Multiple Backup Layers

**Layer 1: Git Branch**

```bash
cd /path/to/LingoLinq-AAC
git checkout main  # or your primary branch
git pull origin main
git checkout -b upgrade/ember-3-16-safe-attempt
```

**Layer 2: Full Directory Backup**

```bash
# Create complete backup outside the project
cd ..
cp -r LingoLinq-AAC LingoLinq-AAC-backup-$(date +%Y%m%d-%H%M%S)
echo "Backup created at: LingoLinq-AAC-backup-$(date +%Y%m%d-%H%M%S)"
```

**Layer 3: Git Bundle (portable backup)**

```bash
cd LingoLinq-AAC
git bundle create ../lingolinq-backup-$(date +%Y%m%d).bundle --all
```

### 5. Ensure Absolutely Clean Git State

```bash
# Check for ANY uncommitted or untracked files
git status --porcelain

# This MUST return completely empty output
# If it shows anything, address it:

# For modified files:
git stash push -m "pre-ember-upgrade-stash"

# For untracked files you want to keep:
git add <file> && git commit -m "chore: commit untracked files before upgrade"

# For untracked files you don't need:
git clean -fd  # WARNING: This deletes untracked files permanently

# Verify clean state again
git status --porcelain
# Must be empty!
```

---

## Phase 1: Preview Changes (No Risk)

Before making any changes, preview what ember-cli-update would do:

```bash
cd app/frontend

# Install ember-cli-update globally for consistent behavior
npm install -g ember-cli-update

# Preview changes without applying them
npx ember-cli-update compare --from 3.12.0 --to 3.16.0

# This shows a diff of what would change
# Review carefully - should only affect:
# - package.json
# - ember-cli-build.js
# - config/environment.js
# - config/targets.js
# - possibly testem.js
```

**Decision Point:** Review the output. If it looks reasonable, proceed to Phase 2.

---

## Phase 2: Isolated Upgrade (Safe Method)

This approach runs ember-cli-update in a completely isolated environment, then applies changes via patch.

### Step 1: Create Isolated Environment

```bash
# Create temporary directory
TEMP_DIR=$(mktemp -d)
echo "Working in: $TEMP_DIR"

# Copy Ember app to temp directory (excluding large/generated folders)
rsync -av \
  --exclude='node_modules' \
  --exclude='tmp' \
  --exclude='dist' \
  --exclude='.git' \
  app/frontend/ "$TEMP_DIR/"

# Verify copy
ls -la "$TEMP_DIR"
```

### Step 2: Initialize Isolated Git Repository

```bash
cd "$TEMP_DIR"

# Initialize fresh git repo (this is key - no parent repo)
git init
git add .
git commit -m "Initial commit - Ember 3.12 state"

# Verify we're in the temp directory, not the real project
pwd
# Should show /tmp/tmp.XXXXXX or similar, NOT your project path
```

### Step 3: Run Upgrade in Isolation

```bash
# Still in $TEMP_DIR
pwd  # Verify location!

# Run the upgrade
npx ember-cli-update --to 3.16.0

# If prompted about merge conflicts, choose to resolve them
# Review each change carefully during the interactive process
```

### Step 4: Handle Any Merge Conflicts

If merge conflicts occur:

```bash
# List conflicted files
git diff --name-only --diff-filter=U

# For each conflicted file, open and resolve manually
# Look for <<<<<<< ======= >>>>>>> markers

# After resolving each file:
git add <resolved-file>

# When all conflicts resolved:
git commit -m "Resolved merge conflicts for Ember 3.16 upgrade"
```

### Step 5: Generate Patch File

```bash
# Still in $TEMP_DIR

# Stage all changes
git add .

# Generate patch of all changes
git diff --cached > ~/ember-3.16-upgrade.patch

# Also create a summary of what changed
git diff --cached --stat > ~/ember-3.16-upgrade-summary.txt

# Review the summary
cat ~/ember-3.16-upgrade-summary.txt
```

### Step 6: Review Patch Before Applying

```bash
# Review the full patch
cat ~/ember-3.16-upgrade.patch

# Or use less for easier navigation
less ~/ember-3.16-upgrade.patch

# Check patch can be applied (dry run)
cd /path/to/LingoLinq-AAC
git apply --directory=app/frontend --check ~/ember-3.16-upgrade.patch
```

**Decision Point:** If the check passes with no errors, proceed. If errors occur, review and adjust.

### Step 7: Apply Patch to Real Project

```bash
cd /path/to/LingoLinq-AAC

# Verify we're in the right place
pwd
ls app/frontend/package.json  # Should exist

# Apply the patch
git apply --directory=app/frontend ~/ember-3.16-upgrade.patch

# Verify what changed
git status
git diff --stat
```

### Step 8: Critical Safety Verification

**STOP and verify before proceeding:**

```bash
# Check ONLY app/frontend files were modified
git status --porcelain | grep -v "^.. app/frontend/"

# This should return NOTHING
# If it shows files outside app/frontend/, STOP and investigate

# Verify critical files still exist
ls -la app/controllers/*.rb 2>/dev/null | head -5
ls -la .gitignore README.md Gemfile
ls -la .devcontainer/ 2>/dev/null

# Compare with pre-upgrade inventory
diff ~/pre-upgrade-inventory.txt <(
  echo "=== Files to verify after upgrade ==="
  echo "Rails controllers:"
  ls -la app/controllers/*.rb 2>/dev/null || echo "None found"
  echo "Root config files:"
  ls -la .gitignore .ruby-version Gemfile README.md 2>/dev/null
  echo "DevContainer files:"
  ls -la .devcontainer/ 2>/dev/null || echo "None found"
  echo "Environment files:"
  ls -la .env* 2>/dev/null || echo "None found"
)

# Should show no differences (or only expected ones)
```

**If anything unexpected changed or was deleted:**

```bash
# ABORT - Restore from backup
git checkout -f main
# And verify backup directory is intact
```

---

## Phase 3: Install Dependencies and Run Codemods

### Step 1: Install Updated Dependencies

```bash
cd app/frontend

# Remove old node_modules and lock file for clean install
rm -rf node_modules
rm -f package-lock.json  # or yarn.lock if using yarn

# Fresh install
npm install

# Check for peer dependency warnings
# Address any critical ones before proceeding
```

### Step 2: Run Codemods (Automated Code Updates)

```bash
cd app/frontend

# Run codemods to update syntax to newer patterns
npx ember-cli-update --run-codemods

# Review codemod changes
git diff

# If changes look good, stage them
git add .
```

---

## Phase 4: Verification Testing

### Step 1: Build Test

```bash
cd app/frontend

# Development build
ember build

# Production build (more strict)
ember build --environment=production

# Check for build warnings/errors
```

### Step 2: Development Server Test

```bash
# Start Ember dev server
ember serve

# In browser, navigate to http://localhost:4200 (or configured port)
# Check:
# - [ ] App loads without blank screen
# - [ ] No JavaScript errors in console
# - [ ] No critical deprecation warnings
# - [ ] Basic navigation works

# Document any deprecation warnings
# These are OK to have, but should be tracked for future cleanup
```

### Step 3: Test Suite

```bash
cd app/frontend

# Run full test suite
ember test

# Run tests in browser for more detail
ember test --server
# Open http://localhost:7357 to see test runner

# All tests should pass
# Document any failures for investigation
```

### Step 4: Rails Integration Test

```bash
# Return to project root
cd /path/to/LingoLinq-AAC

# Start Rails server (if applicable)
bundle exec rails server

# Verify Ember app loads through Rails
# Navigate to your app's URL
# Test:
# - [ ] Ember app loads via Rails
# - [ ] API calls from Ember to Rails work
# - [ ] Authentication flows work (if applicable)
```

### Step 5: Run Rails Test Suite

```bash
cd /path/to/LingoLinq-AAC

# Run Rails specs
bundle exec rspec

# All specs should still pass
# Ember upgrade should not affect Rails tests
```

---

## Phase 5: Commit and Document

### If All Tests Pass

```bash
cd /path/to/LingoLinq-AAC

# Stage Ember changes
git add app/frontend/

# Commit with descriptive message
git commit -m "chore: upgrade Ember from 3.12 to 3.16 (LTS)

- Upgraded ember-source from 3.12.0 to 3.16.0
- Upgraded ember-cli and related packages
- Ran codemods for updated syntax patterns
- All tests passing

This is an LTS release providing:
- Security updates
- Performance improvements
- Foundation for future Octane migration

Known deprecations to address in future PRs:
- [List any deprecation warnings observed]
"

# Push branch
git push origin upgrade/ember-3-16-safe-attempt
```

### Create Pull Request

Create PR with:

- Description of changes
- Test results
- Any deprecation warnings to track
- Link to Ember 3.16 release notes

---

## Rollback Procedures

### If Issues During Upgrade

```bash
# Discard all uncommitted changes
cd /path/to/LingoLinq-AAC
git checkout -f .
git clean -fd

# Return to main branch
git checkout main
```

### If Issues After Commit (But Before Merge)

```bash
# Delete the branch and start fresh
git checkout main
git branch -D upgrade/ember-3-16-safe-attempt
```

### If Critical Files Were Deleted

```bash
# Restore from directory backup
cd ..
rm -rf LingoLinq-AAC
cp -r LingoLinq-AAC-backup-YYYYMMDD-HHMMSS LingoLinq-AAC
cd LingoLinq-AAC
git status  # Verify restored state
```

### If Git History Is Corrupted

```bash
# Restore from bundle
cd ..
rm -rf LingoLinq-AAC
git clone lingolinq-backup-YYYYMMDD.bundle LingoLinq-AAC
cd LingoLinq-AAC
git remote set-url origin https://github.com/swahlquist/LingoLinq-AAC.git
```

---

## Cleanup

After successful upgrade and merge:

```bash
# Remove backup directory (after verifying prod is stable)
rm -rf ../LingoLinq-AAC-backup-*

# Remove bundle file
rm -f ../lingolinq-backup-*.bundle

# Remove temporary files
rm -f ~/ember-3.16-upgrade.patch
rm -f ~/ember-3.16-upgrade-summary.txt
rm -f ~/pre-upgrade-inventory.txt
rm -f ~/pre-upgrade-deprecations.txt
rm -f ~/ember-test-output.txt

# Clean up temp directory (should auto-cleanup, but verify)
rm -rf /tmp/tmp.*  # Only if you're sure which ones are yours
```

---

## Post-Upgrade: Next Steps

### Immediate (This Sprint)

- [ ] Monitor production for any issues
- [ ] Track deprecation warnings in issue tracker

### Short-Term (Next 2-4 Weeks)

- [ ] Address critical deprecation warnings
- [ ] Update any addons that have newer versions
- [ ] Consider Ember 3.20 upgrade (next LTS in sequence)

### Medium-Term (Next Quarter)

- [ ] Plan Ember 3.24 upgrade
- [ ] Begin evaluating Octane patterns for new components
- [ ] Assess React migration timeline vs continued Ember upgrades

---

## Reference: Version Compatibility

| Ember Version | Node.js Support | LTS Status | Key Features |
|---------------|-----------------|------------|--------------|
| 3.12 (current) | 8, 10, 12 | LTS | Last pre-Octane LTS |
| 3.16 (target) | 10, 12+ | LTS | First post-Octane LTS, Octane available |
| 3.20 | 10, 12+ | LTS | Octane defaults |
| 3.24 | 12+ | LTS | Modern baseline |
| 3.28 | 14+ | LTS | Final 3.x LTS |

---

## Reference: Key Files Changed in Upgrade

Typical files modified by ember-cli-update 3.12 → 3.16:

```
app/frontend/
├── package.json              # Version bumps
├── package-lock.json         # Regenerated
├── ember-cli-build.js        # Possible config updates
├── config/
│   ├── environment.js        # Possible new options
│   └── targets.js            # Browser targets
├── testem.js                 # Test runner config
├── .ember-cli                # CLI config
├── .eslintrc.js              # Linting rules
└── .template-lintrc.js       # Template linting
```

Files that should **NOT** change:

- Anything outside `app/frontend/`
- Rails files (`app/controllers/`, `app/models/`, etc.)
- Root config files (`.gitignore`, `Gemfile`, etc.)
- DevContainer configuration
- Environment files (`.env*`)

---

## Appendix: Troubleshooting

### "You must start with a clean working directory"

```bash
git status --porcelain
# Must be completely empty
git stash --include-untracked
# Then retry
```

### Merge Conflicts During Upgrade

```bash
# List conflicted files
git diff --name-only --diff-filter=U

# Open each file, find conflict markers, resolve manually
# Then: git add <file>
# Finally: git commit
```

### ember-cli-update Creates Files in Wrong Location

This is the known bug with nested directories. The isolated patch approach in this plan avoids this entirely.

### npm Install Fails After Upgrade

```bash
# Clear npm cache
npm cache clean --force

# Remove and reinstall
rm -rf node_modules package-lock.json
npm install

# If still failing, check for peer dependency conflicts
npm ls 2>&1 | grep "UNMET PEER"
```

### Build Fails After Upgrade

```bash
# Check for specific error messages
ember build 2>&1 | tee build-errors.txt

# Common issues:
# - Addon incompatibility: Check addon versions, update as needed
# - Deprecated imports: Follow error messages to update import paths
# - Template syntax: Run template codemods
```

---

*Document created based on official Ember documentation, ember-cli-update GitHub issues, and community best practices.*
