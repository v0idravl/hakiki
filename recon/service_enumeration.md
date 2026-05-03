# Service Scanning - [Back to Recon](recon_main.md)

## [Web Enumeration](web_enumeration.md)

## nmap (General)

```bash
# Limited Full TCP if -sS taking too long
nmap -sT -p- --min-rate 5000 -oA "$OUTPUT_DIR/limited_tcp$IP" --max-retries 1 "$IP"
```

### Scripts


```bash
locate scripts/citrix
nmap --script <script name> -p <port> $IP
```

Banner Grabbing
```bash
nmap -sV --script=banner $IP
```

## 21 - FTP

```bash
nmap --script ftp-* -p $IP
ftp anonymous@$IP
# Error with Passive Mode? add:
-A
```

-Is version vulnerable?

```bash
hydra -L <user.txt> -P <wordlist.txt> $IP ftp
# Common cred bruteforce
hydra -C /usr/share/wordlists/seclists/Passwords/Default-Credentials/ftp-betterdefaultpasslist.txt ftp://192.168.195.183
```
- Able to write to web server? or other path upload to execution?

FTP COMMANDS
```bash
cd
ls
get
```

## 22 - SSH

- 22, and 2222 most common.
- Check for SFTP share
```bash
hydra -L <user.txt -P <wordlist.txt> $IP ssh
```
## 161,162 - SNMP

**UDP**

Default community strings of `public` and `private` often unchaned. Encryption and authent only added in version 3. 

```bash
snmpwalk -v 2c -c public <target>
snmpwalk -v 2c -c private <target>
onesixtyone -c <wordlist> <target> # bruteforce community string names
```

## 445 - SMB

```bash
nmap --script smb-os-discovery.nse -p 445 <target>
nmap -v -sS -p 445,139 -Pn --script smb-vuln* --script-args=unsafe=1 -oA smb_vuln_scan_<target> 192.168.0.1
# -N supress password prompt
smbclient -N -L \\\\<target> 
smbclient \\\\<target>\\<sharename>
# List shares as guest
smbclient -U guest -L <target> 
# Propts for password
smbclient -U <user> \\\\<target>
# Download all files recursively
smbclient '\\server\share' -N -c 'prompt OFF;recurse ON;cd 'path\to\directory\';lcd '~/path/to/download/to/';mget *'

# example
smbclient \\\\<target>\\Data -U John -c 'prompt OFF;recurse ON;cd '\Users\test\';lcd '/tmp/test';mget *'
```

```bash
# List Streams
smbclient \\\\192.168.0.1\\Data -U John -c 'allinfo "\Users\John\file.txt"'

# Download stream by name
get "\Users\John\file.txt:SECRET:$DATA"

```

SMB COMMANDS
```bash
cd
ls
get <file> # download
```
## NFS

```bash
showmount -e <target>
# Mount Drive
mount -t nfs -o <target>:/backup mpt/

```
