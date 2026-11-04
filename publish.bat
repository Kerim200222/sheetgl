@echo off
setlocal enabledelayedexpansion

pushd "%~dp0."

echo ============================================================================
echo   sheetgl - NPM Publish ve Canli Sunucu Deploy Araci
echo ============================================================================

for /f "delims=" %%v in ('node -p "require('./package.json').version"') do set "CURRENT_VER=%%v"
echo Mevcut surum: v%CURRENT_VER%
echo.

if /i "%~1"=="--check" (
    echo [OK] publish.bat sozdizimi ve surum okuma testi basarili: v%CURRENT_VER%
    popd
    exit /b 0
)

REM 1. NPM oturum kontrolu
echo [1/6] NPM oturumu kontrol ediliyor...
call npm whoami >nul 2>&1
if not errorlevel 1 goto npm_logged_in

echo [!] NPM oturumu acik degil. Lutfen giris yapin:
call npm login
if errorlevel 1 (
    echo [HATA] NPM girisi basarisiz oldu.
    popd
    pause
    exit /b 1
)

:npm_logged_in
for /f "delims=" %%u in ('call npm whoami') do set "NPM_USER=%%u"
echo [OK] NPM kullanicisi: %NPM_USER%
echo.

REM 2. Surum artis islemi (10 patch'te minor, 10 minor'de major otomatik artar)
set "BUMP_PARAM=%~1"

if /i "%BUMP_PARAM%"=="deploy" (
    set "NEW_VER=%CURRENT_VER%"
    goto deploy_remote
)
if /i "%BUMP_PARAM%"=="none" (
    set "NEW_VER=%CURRENT_VER%"
    goto keep_version
)

if "%BUMP_PARAM%"=="" goto calc_auto_ver
if /i "%BUMP_PARAM%"=="patch" goto calc_auto_ver

REM Ozel veya standart parametre (minor, major veya 2.1.0 vb.)
set "TARGET_VER=%BUMP_PARAM%"
goto apply_version

:calc_auto_ver
for /f "delims=" %%v in ('node -e "const [M,m,p]=require('./package.json').version.split('.').map(Number); let np=p+1,nm=m,nM=M; if(Math.floor(np/10)!==0){np=0;nm++;} if(Math.floor(nm/10)!==0){nm=0;nM++;} console.log([nM,nm,np].join('.'));"') do set "TARGET_VER=%%v"

:apply_version
echo [2/6] Surum guncelleniyor: v%CURRENT_VER% -^> v%TARGET_VER% ...
call npm version %TARGET_VER% --no-git-tag-version
if errorlevel 1 (
    echo [HATA] Surum numarasi guncellenemedi.
    popd
    pause
    exit /b 1
)
goto version_ready

:keep_version
echo [2/6] Mevcut surum korunuyor: v%CURRENT_VER% ...

:version_ready
for /f "delims=" %%v in ('node -p "require('./package.json').version"') do set "NEW_VER=%%v"
node -e "const fs=require('fs'),v=require('./package.json').version;if(fs.existsSync('README.md')){let r=fs.readFileSync('README.md','utf8');r=r.replace(/SheetGL v\d+\.\d+\.\d+/g,'SheetGL v'+v).replace(/in v\d+\.\d+\.\d+/g,'in v'+v).replace(/version-\d+\.\d+\.\d+-/g,'version-'+v+'-');fs.writeFileSync('README.md',r);}"
echo [OK] Yeni surum: v%NEW_VER% (onceki: v%CURRENT_VER%)
echo.

REM 3. Uretim derlemesi (Demo + Lib)
echo [3/6] Demo ve kutuphane paketleri derleniyor: npm run build ...
call npm run build
if errorlevel 1 (
    echo [HATA] Derleme sirasinda hata olustu! Yayinlama iptal edildi.
    popd
    pause
    exit /b 1
)
echo [OK] Derleme basariyla tamamlandi.
echo.

REM 4. NPM Publish
echo [4/6] Paket NPM uzerinde yayinlaniyor: sheetgl@%NEW_VER% ...
call npm publish --access public
if errorlevel 1 (
    echo [HATA] npm publish basarisiz oldu!
    popd
    pause
    exit /b 1
)
echo [OK] sheetgl@%NEW_VER% basariyla NPM'de yayinlandi!
echo.

REM 5. Git Commit, Tag ve Push
echo [5/6] Git commit, etiket [v%NEW_VER%] ve origin push islemi yapiliyor...
git add package.json README.md
if exist package-lock.json git add package-lock.json
git diff --cached --quiet
if errorlevel 1 git commit -m "chore: release v%NEW_VER%"
git tag -f "v%NEW_VER%"
git push origin main --tags
echo.

:deploy_remote
REM 6. Uzak Sunucu Deploy (truncgil_ubuntu -> sheetgl.truncgil.com)
echo [6/6] sheetgl.truncgil.com sunucusuna SSH ile baglanip canli deploy yapiliyor...
ssh truncgil_ubuntu "/home/truncgil/web/sheetgl.truncgil.com/deploy.sh"
if errorlevel 1 (
    echo [HATA] sheetgl.truncgil.com uzaktan deploy islemi basarisiz oldu!
    popd
    pause
    exit /b 1
)
echo [OK] sheetgl.truncgil.com basariyla guncellendi!

echo.
echo ============================================================================
echo   TAMAMLANDI: sheetgl@%NEW_VER% yayinlandi ve canliya alindi!
echo   Canli : https://sheetgl.truncgil.com
echo   NPM   : https://www.npmjs.com/package/sheetgl
echo   GitHub: https://github.com/umitunc/sheetgl
echo ============================================================================
popd
pause
endlocal
