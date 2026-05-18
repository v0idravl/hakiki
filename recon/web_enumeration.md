# Web Enumeration — [Back to Recon](recon_main.md)

See [Web Exploitation](../web/web_exploitation.md) for attack techniques.

## Fingerprinting

```bash
whatweb $IP                          # quick tech stack ID
curl -I http://$IP                   # headers: server, X-Powered-By, cookies
nmap --script http-headers -p 80 $IP

# Check for NTLM info disclosure (Windows auth prompts)
nmap --script http-ntlm-info -p 80,443 $IP
```

## Directory / File Fuzzing

```bash
# Standard dir bust
ffuf -u http://$IP/FUZZ -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -fc 404

# Include file extensions
ffuf -u http://$IP/FUZZ -w /usr/share/seclists/Discovery/Web-Content/raft-medium-words.txt \
  -e .php,.txt,.html,.bak,.zip,.old -fc 404

# Recurse into found directories
feroxbuster -u http://$IP -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt \
  -x php,txt,html -n    # -n = no recursion (add recursion with -d 2)

# Backup file hunt (after finding executables)
ffuf -u http://$IP/FUZZ -w /usr/share/seclists/Discovery/Web-Content/raft-medium-words.txt \
  -e .php~,.bak,.tmp,.old,.orig -fc 404
```

## Vhost / Subdomain Enumeration

```bash
# Vhost fuzzing (add $IP to /etc/hosts first if needed)
ffuf -u http://$IP -H "Host: FUZZ.$DOMAIN" \
  -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt \
  -fs <default_response_size>   # filter by size of baseline response

# DNS brute force
dnsrecon -d $DOMAIN -t brt -D /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt
```

## Parameter Discovery

```bash
# Hidden parameter fuzzing on a known endpoint
ffuf -u "http://$IP/page.php?FUZZ=test" \
  -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt \
  -fs <baseline_size>

# arjun — smarter param discovery (tries GET, POST, JSON)
arjun -u http://$IP/api/endpoint
```

## Vulnerability Scanning

```bash
nikto -h http://$IP -C all          # general vuln scan

# WordPress
wpscan --url http://$IP --enumerate p,u,t   # plugins, users, themes
wpscan --url http://$IP -P /usr/share/wordlists/rockyou.txt -U admin

# SSL/TLS
testssl.sh https://$IP
```

## Crawling

```bash
# Crawl site and collect URLs, forms, JS files
gospider -s http://$IP -o output/ -c 10 -d 3
```

## Manual Checklist

- Default creds on any login page (admin:admin, admin:password, system:manager etc.)
- `/robots.txt`, `/sitemap.xml`, `/.well-known/`
- Source code: comments, hardcoded creds, links to hidden endpoints, JS API keys
- `.git/` exposed? → `git-dumper http://$IP/.git/ ./git-output`
- `.env` exposed? → DB creds, API keys
- Check cookies: JWT? base64? deserializable?
- HTTP verbs: OPTIONS, PUT, PATCH, TRACE — may expose upload or debug
- Error pages: leak stack traces, framework versions, paths
- API endpoints: fuzz with `/api/FUZZ`, `/v1/FUZZ`, `/api/v2/FUZZ`
- S3 bucket references in HTML/JS → check if public
- WebDAV enabled? `davtest -url http://$IP/webdav/`

## Wordlists

| Use | Path |
|---|---|
| Directories | `/usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt` |
| Words + extensions | `/usr/share/seclists/Discovery/Web-Content/raft-medium-words.txt` |
| API paths | `/usr/share/seclists/Discovery/Web-Content/api/objects.txt` |
| Parameters | `/usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt` |
| Subdomains | `/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt` |
| Custom (site-specific) | `cewl http://$IP -m 4 -w cewl.txt` |
