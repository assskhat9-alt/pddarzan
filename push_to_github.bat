@echo off
chcp 65001 >nul
echo ====================================================
echo   PDD ARZAN - GITHUB PUSH СКРИПТI
echo ====================================================
echo.
set /p REPO=GitHub репозиторий сiлтемесiн енгiзiнiз: 
git branch -M main
git remote remove origin 2>nul
git remote add origin %REPO%
echo GitHub-ка жуктелуде...
git push -u origin main
echo.
echo Жуктелдi! Ендi Render.com сайтында New - Web Service аркылы коса аласыз.
pause
