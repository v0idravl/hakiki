# Recon — [Back to Main](../README.md)

- [Service Enumeration](service_enumeration.md)
- [Web Enumeration](web_enumeration.md)

## Initial Scan Workflow

```bash
# Fast full-port discovery
rustscan -a $IP --ulimit 5000 -- -sV -sC -oA scan_$IP

# Full TCP — thorough with scripts
nmap -sC -sV -p- --min-rate 5000 -T4 -oA full_$IP $IP

# If scan is unreliable: lower rate and retries
nmap -sT -p- --min-rate 3000 --max-retries 1 -oA tcp_$IP $IP

# Top 1000 UDP (slow — run in background)
nmap -sU --top-ports 1000 -oA udp_$IP $IP

# Feed nmap XML into searchsploit
searchsploit --nmap full_$IP.xml
```

> **PT ONLY** — AutoRecon runs all of the above + per-service enumeration automatically:
> `autorecon $IP`

## Environment Setup (start of engagement)

```bash
export IP=10.10.10.10
export LHOST=10.10.14.1
export LPORT=4444
export DOMAIN=example.local
export DC_IP=10.10.10.10
mkdir -p ~/targets/$IP/{scans,loot,screenshots,exploits} && cd ~/targets/$IP
```

## Evidence Collection

Keep this consistent — OSCP report requires organized evidence.

```bash
# Screenshot every finding (Flameshot or scrot)
scrot -s ~/targets/$IP/screenshots/$(date +%H%M)_finding.png

# Hash every loot file on capture
sha256sum loot/* >> loot/hashes.txt

# Log commands with timestamps (add to ~/.bashrc for engagement)
export HISTTIMEFORMAT="%F %T "
script -a ~/targets/$IP/terminal.log   # record full session

# Directory structure per target
~/targets/$IP/
  scans/          ← nmap XML, rustscan output
  loot/           ← hashes, creds, files, screenshots
  exploits/       ← POC files, payloads
  notes.md        ← findings, credentials found, attack path
```

---

## Search Operators

### Google dorks

```
site:target.com                           # all indexed pages
site:target.com filetype:pdf              # PDFs
site:target.com filetype:xlsx OR filetype:csv  # spreadsheets
site:target.com inurl:admin               # admin paths
site:target.com intitle:"index of"        # directory listings
site:target.com "password" OR "passwd"    # credential exposure
site:target.com ext:conf OR ext:config OR ext:env OR ext:bak
"@target.com" filetype:xls               # emails in spreadsheets
inurl:"/wp-content/uploads/" site:target.com  # WordPress uploads
```

### Shodan operators

```bash
# Shodan CLI
shodan search hostname:target.com
shodan search org:"Target Corp"
shodan search ssl.cert.subject.cn:"target.com" port:443
shodan search http.title:"Dashboard" org:"Target Corp"
shodan search http.favicon.hash:<hash>    # find related infra by favicon

# Get favicon hash
curl -s https://target.com/favicon.ico | python3 -c "import sys,mmh3,codecs; print(mmh3.hash(codecs.encode(sys.stdin.buffer.read(),'base64').decode()))"
```

**References:** [dorksearch.com](https://dorksearch.com) (pre-built Google dork templates)

---

## Passive Subdomain & Infrastructure Discovery

```bash
# Certificate transparency — find subdomains from issued certs
curl -s "https://crt.sh/?q=%25.$DOMAIN&output=json" | jq -r '.[].name_value' | sort -u | tee crt_subs.txt

# Subfinder — passive multi-source enumeration
subfinder -d $DOMAIN -o subs.txt -all

# theHarvester — emails, subdomains, IPs from search engines
theHarvester -d $DOMAIN -b google,bing,linkedin,shodan -f harvest.xml

# ASN to IP range enumeration
# 1. Find ASN: https://bgp.he.net → search company name
# 2. Get IP ranges
whois -h whois.radb.net -- '-i origin AS12345' | grep -Eo '([0-9]{1,3}\.){3}[0-9]{1,3}/[0-9]+' | sort -u
# 3. Scan ranges
nmap -sn 203.0.113.0/24 -oG - | grep Up | awk '{print $2}'
```

---

## Credential & Breach Recon

```bash
# HIBP — check if domain appears in breaches (API key required)
curl -H "hibp-api-key: $HIBP_KEY" https://haveibeenpwned.com/api/v3/breachedaccount/user@target.com

# k-anonymity password check (no account needed)
# Hash password locally, send first 5 chars of SHA1 only
echo -n "Password123" | sha1sum | cut -c1-5 | xargs -I{} curl -s https://api.pwnedpasswords.com/range/{} | grep -i <remaining_hash>

# Dehashed — email/domain breach search (subscription)
curl "https://api.dehashed.com/search?query=email:@target.com" \
  -H "Authorization: Basic $(echo -n 'email:apikey' | base64)"

# IntelX — comprehensive leak search
# https://intelx.io → search @target.com
```

> Found credentials → build username list → password spray against AD, VPN, webmail.

---

## GitHub / Code Leak Recon

```bash
# GitHub search (browser — github.com/search)
org:targetorg filename:.env
org:targetorg "password" OR "secret" OR "api_key"
org:targetorg "BEGIN RSA PRIVATE KEY"
org:targetorg extension:sql

# Trufflehog — scan org for secrets
trufflehog github --org=targetorg --token=$GITHUB_TOKEN

# Gitleaks — scan specific repo
gitleaks detect --source ./repo/ --report-path leaks.json

# GitDorker — automated GitHub dork scanning
python3 GitDorker.py -t $GITHUB_TOKEN -q targetorg -d dorks.txt
```

> High-value finds: `.env` with DB creds, `config.php`, `application.yml`, AWS/GCP keys, private keys.

---

## Username Enumeration

```bash
# Sherlock — username pivot across platforms
sherlock <username> --output results.txt

# Maigret — deeper OSINT pivot from username
maigret <username> --html report.html

# theHarvester also collects emails → convert to usernames
# Strip @domain.com → common formats: firstname, firstname.lastname, flastname
```
