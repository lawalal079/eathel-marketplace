#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Aethel Marketplace Repo Splitter ===${NC}"

# Ensure GitHub repos are created!
echo "IMPORTANT: Make sure you have created these empty repositories on GitHub before continuing:"
echo "1. https://github.com/lawalal079/aethel-contracts"
echo "2. https://github.com/lawalal079/aethel-docs"
echo "3. https://github.com/lawalal079/aethel-engine"
echo "4. https://github.com/lawalal079/eathel-marketplace"
echo "Press ENTER to continue when you are ready..."
read -r

# 1. Publish aethel-contracts
echo -e "\n${GREEN}Publishing aethel-contracts...${NC}"
cd aethel-marketplace
rm -rf .git
git init
git add .
git commit -m "Initial commit for aethel-contracts"
git branch -M main
git remote add origin git@github.com:lawalal079/aethel-contracts.git
git push -u origin main
cd ..

# 2. Publish aethel-docs
echo -e "\n${GREEN}Publishing aethel-docs...${NC}"
cd src/app/docs
rm -rf .git
git init
git add .
git commit -m "Initial commit for aethel-docs"
git branch -M main
git remote add origin git@github.com:lawalal079/aethel-docs.git
git push -u origin main
cd ../../../

# 3. Publish aethel-engine
echo -e "\n${GREEN}Publishing aethel-engine...${NC}"
mkdir -p aethel-engine
cd aethel-engine
echo "# Aethel Engine" > README.md
echo "SMC logic, AI listener, and secret keys will go here." >> README.md
rm -rf .git
git init
git add .
git commit -m "Initial commit for aethel-engine"
git branch -M main
git remote add origin git@github.com:lawalal079/aethel-engine.git
git push -u origin main
cd ..

# 4. Clean up the unnecessary files from the root repo
echo -e "\n${GREEN}Cleaning up split folders from the frontend workspace...${NC}"
# Delete the folders we just pushed to other repos so they aren't duplicated in the frontend repo
rm -rf aethel-marketplace
rm -rf src/app/docs
rm -rf vendor-agent-template
rm -rf aethel-engine

# 5. Publish eathel-marketplace (Frontend)
echo -e "\n${GREEN}Publishing eathel-marketplace (Frontend)...${NC}"
rm -rf .git
git init
git add .
git commit -m "Initial commit for eathel-marketplace frontend"
git branch -M main
git remote add origin git@github.com:lawalal079/eathel-marketplace.git
git push -u origin main

echo -e "\n${BLUE}=== All done! Everything has been split, pushed, and cleaned up. ===${NC}"
