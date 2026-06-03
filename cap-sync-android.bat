@echo off
cd /d D:\deepseek\wenjian\PureMemo
echo Current dir: %cd%
echo Running: npx cap sync android
call npx.cmd cap sync android
echo Exit code: %errorlevel%
