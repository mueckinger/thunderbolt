# Release Process

This document outlines the process for releasing new versions of Thunderbolt.

## Overview

We use a release candidate (RC) workflow to ensure stable releases. The process involves:
1. Creating a release candidate tag
2. Running the build process
3. Creating a final release tag if the build succeeds

## Prerequisites

Before starting a release:
- Ensure all tests are passing locally
- Update the version number in `package.json` and `src-tauri/tauri.conf.json`

## Release Steps

### 1. Create a Release Candidate

When you're ready to release a new version:

```bash
# Create a release candidate tag
git tag v1.0.0-rc1
git push origin v1.0.0-rc1
```

This will trigger the release workflow which:
- Builds the application for all platforms
- Creates a draft release in CrabNebula Cloud
- Uploads the build artifacts to CrabNebula Cloud

### 2. Monitor the Build

The GitHub Actions workflow will:
- Build for all supported platforms (Windows, macOS, Linux)
- Create a draft release in CrabNebula Cloud
- Upload the build artifacts

You can monitor the progress in the GitHub Actions tab.

### 3. Handle Build Results

#### If the build succeeds:
- Review the draft release in CrabNebula Cloud
- If everything looks good, create the final release tag:
  ```bash
  git tag v1.0.0
  git push origin v1.0.0
  ```
- Publish the release in CrabNebula Cloud

#### If the build fails:
1. Fix the issues in your code
2. Create a new release candidate with an incremented number:
   ```bash
   git tag v1.0.0-rc2
   git push origin v1.0.0-rc2
   ```
3. Repeat until the build succeeds

## Versioning

We follow semantic versioning (MAJOR.MINOR.PATCH):
- MAJOR: Breaking changes
- MINOR: New features, no breaking changes
- PATCH: Bug fixes, no breaking changes

### Version Update Locations

When updating the version number, make sure to update it in:
- `package.json`
- `src-tauri/tauri.conf.json`
- Any other version-specific configuration files

## Manual Trigger

If needed, you can manually trigger the release workflow:
1. Go to the GitHub Actions tab
2. Select the "Tauri v2 Release Process" workflow
3. Click "Run workflow"
4. Select the release candidate tag to build

## Notes

- Release candidate tags follow the format: `vX.Y.Z-rcN` (e.g., `v1.0.0-rc1`)
- Final release tags follow the format: `vX.Y.Z` (e.g., `v1.0.0`)
- The workflow will only run on tags matching the pattern `v*-rc*`
- All builds must succeed before creating the final release tag
- Always test the release candidate locally before creating the tag 