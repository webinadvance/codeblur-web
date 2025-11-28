#!/bin/bash

# CodeBlur.dev Deployment Script
# This script deploys the latest version of the site to the web server

set -e  # Exit on error

echo "🚀 Starting deployment for codeblur.dev..."

# Variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WEB_ROOT="/var/www/codeblur.dev"
BACKUP_DIR="/var/www/codeblur.dev.backup.$(date +%Y%m%d_%H%M%S)"

# Create backup of current site
if [ -d "$WEB_ROOT" ]; then
    echo "📦 Creating backup at $BACKUP_DIR..."
    cp -r "$WEB_ROOT" "$BACKUP_DIR"
fi

# Remove old files (except .git)
echo "🧹 Cleaning web root..."
find "$WEB_ROOT" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +

# Copy new files
echo "📂 Copying files to $WEB_ROOT..."
cp -r "$SCRIPT_DIR"/*.html "$WEB_ROOT/" 2>/dev/null || true
cp -r "$SCRIPT_DIR"/*.txt "$WEB_ROOT/" 2>/dev/null || true
cp -r "$SCRIPT_DIR"/*.xml "$WEB_ROOT/" 2>/dev/null || true
cp -r "$SCRIPT_DIR"/css "$WEB_ROOT/" 2>/dev/null || true
cp -r "$SCRIPT_DIR"/js "$WEB_ROOT/" 2>/dev/null || true

# Set proper permissions
echo "🔐 Setting permissions..."
chown -R www-data:www-data "$WEB_ROOT"
find "$WEB_ROOT" -type d -exec chmod 755 {} \;
find "$WEB_ROOT" -type f -exec chmod 644 {} \;

# Test nginx configuration
echo "🔧 Testing nginx configuration..."
nginx -t

# Reload nginx
echo "♻️  Reloading nginx..."
systemctl reload nginx

echo "✅ Deployment completed successfully!"
echo "🌐 Site is live at https://codeblur.dev"
echo "📦 Backup saved at $BACKUP_DIR"
