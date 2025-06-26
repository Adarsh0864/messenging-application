#!/bin/bash

# Deploy CORS configuration to Firebase Storage
echo "Deploying CORS configuration to Firebase Storage..."
echo "Make sure you have gsutil installed and are authenticated with gcloud"
echo ""

# Set the storage bucket
BUCKET="gs://messenging-app-b43da.appspot.com"

# Apply CORS configuration
gsutil cors set cors.json $BUCKET

if [ $? -eq 0 ]; then
    echo "✅ CORS configuration deployed successfully!"
    echo ""
    echo "Your Firebase Storage bucket now allows requests from:"
    echo "- https://messenger-sigma-two.vercel.app"
    echo "- http://localhost:3000"
    echo "- http://localhost:3001"
else
    echo "❌ Failed to deploy CORS configuration"
    echo ""
    echo "Please make sure you have:"
    echo "1. Google Cloud SDK installed (gcloud)"
    echo "2. Authenticated with: gcloud auth login"
    echo "3. Selected the correct project: gcloud config set project messenging-app-b43da"
fi 