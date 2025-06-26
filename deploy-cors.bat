@echo off
echo Deploying CORS configuration to Firebase Storage...
echo Make sure you have gsutil installed and are authenticated with gcloud
echo.

rem Set the storage bucket
set BUCKET=gs://messenging-app-b43da.appspot.com

rem Apply CORS configuration
gsutil cors set cors.json %BUCKET%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ CORS configuration deployed successfully!
    echo.
    echo Your Firebase Storage bucket now allows requests from:
    echo - https://messenger-sigma-two.vercel.app
    echo - http://localhost:3000
    echo - http://localhost:3001
) else (
    echo.
    echo ❌ Failed to deploy CORS configuration
    echo.
    echo Please make sure you have:
    echo 1. Google Cloud SDK installed (gcloud)
    echo 2. Authenticated with: gcloud auth login
    echo 3. Selected the correct project: gcloud config set project messenging-app-b43da
)
pause 