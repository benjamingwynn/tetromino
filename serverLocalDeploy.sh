#!/bin/bash
rm -rf .esdev .data dist
scp -r piweb.local:~/app/.data .
rsync -r --progress --exclude=.git --exclude=node_modules . piweb.local:~/app
# ssh piweb.local 'export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"; cd ~/app; pnpm i'
# ssh piweb.local 'touch ~/app/server/main.node.ts'