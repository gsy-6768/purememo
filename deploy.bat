@echo off
setlocal
cd /d D:\deepseek\wenjian\PureMemo

:: Create a temporary git repo with only dist content
rmdir /S /Q __ghpages 2>nul
mkdir __ghpages
xcopy /E /I /Y dist\* __ghpages\ >nul

:: Init a separate repo and push to gh-pages branch
cd __ghpages
git init
git add -A
git commit -m "Deploy PureMemo"
git remote add origin https://github.com/gsy-6768/purememo.git
git branch -m main
git push --force origin main:gh-pages

:: Cleanup
cd ..
rmdir /S /Q __ghpages

echo Done!
