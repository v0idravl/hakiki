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
mkdir -p ~/targets/$IP && cd ~/targets/$IP
```
