@echo off
set ANDROID_HOME=C:\Users\26582\AppData\Local\Android\Sdk
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.7.6-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%
cd /d D:\deepseek\wenjian\PureMemo\android
echo Cleaning...
call gradlew clean
echo Compiling APK...
call gradlew assembleDebug
echo Exit code: %errorlevel%
