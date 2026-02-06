#!/bin/bash

# Configuration
USER="soursop"
HOST="s0.serv00.com" # Change s0 to your actual server number if different
DOMAIN="soursop.serv00.net"
PROJECT_PATH="domains/$DOMAIN/public_nodejs"

echo "🚀 Starting deployment to $DOMAIN..."

# 1. Push code to the git remote
echo "📦 Pushing code to Serv00 git..."
git push origin master

# 2. Run remote commands via SSH
echo "⚙️  Installing dependencies and restarting server..."
ssh $USER@$HOST << EOF
    cd $PROJECT_PATH
    
    # If this is the first time, we might need to pull or checkout
    # Assuming you are using a git clone in the public_nodejs folder:
    # git pull origin master 

    # Install production dependencies
    npm install --production
    
    # Restart the website
    devil www restart $DOMAIN
EOF

echo "✅ Deployment complete! Visit https://$DOMAIN"
