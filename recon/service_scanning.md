# Service Scanning - [Back to Recon](recon_main.md)

## [Web Enumeration](web_enumeration.md)

## nmap (General)

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
smbclient -N -L \\\\<target> # -N suppresses password prompt
smbclient \\\\<target>\\<sharename>
smbclient -U <user> \\\\<target> # prompts for password
```

SMB COMMANDS
```bash
cd
ls
get <file> # download
```
