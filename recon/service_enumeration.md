# Service Scanning - [Back to Recon](recon_main.md)

## [Web Enumeration](web_enumeration.md)

## nmap (General)

```bash
# Fast Initial TCP
nmap -v -sS -sV -Pn --top-ports 1000 -oA fast<target> <target>
# Full TCP
nmap -v -sS -Pn -sV -p 0-65535 -oA full_tcp<target> <target>
# Limited Full TCP
nmap -sT -p- --min-rate 5000 --max-retries 1 <target>
# Top 100 UDP
nmap -v -sU -T4 -Pn --top-ports 100 -oA top_100_udp<target> <target>
# Full Vuln
nmap -v -sS  -Pn --script vuln --script-args=unsafe=1 -oA full_vuln<target> <target>

```

### Scripts


```bash
locate scripts/citrix
nmap --script <script name> -p <port> <host>
```

Banner Grabbing
```bash
nmap -sV --script=banner <target>
```

## 21 - FTP

```bash
ftp -p <target>
```

FTP COMMANDS
```bash
cd
ls
get
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