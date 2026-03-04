@echo off
echo Копирование шрифтов МТС...

if not exist "fonts" mkdir fonts

copy "C:\Windows\Fonts\MTSText-Regular.otf" "fonts\" /Y
copy "C:\Windows\Fonts\MTSText-Medium.otf" "fonts\" /Y
copy "C:\Windows\Fonts\MTSText-Bold.otf" "fonts\" /Y
copy "C:\Windows\Fonts\MTSSans-Regular.otf" "fonts\" /Y
copy "C:\Windows\Fonts\MTSSans-Medium.otf" "fonts\" /Y
copy "C:\Windows\Fonts\MTSSans-Bold.otf" "fonts\" /Y

echo.
echo Шрифты скопированы в папку fonts
pause

