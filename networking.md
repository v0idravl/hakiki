# Networking — [Back to Main](README.md)

## Interface / Routing

```bash
ip -4 a                         # all IPv4 addresses
ip -4 a show tun0               # VPN/tunnel address
ip route show                   # routing table
sudo netstat -rn                # routing table (legacy)
ss -tulnp                       # listening ports + PIDs
```

## Common Ports Quick Reference

| Port | Service |
|---|---|
| 21 | FTP |
| 22 | SSH |
| 25 | SMTP |
| 53 | DNS |
| 80/443 | HTTP/HTTPS |
| 88 | Kerberos |
| 110 | POP3 |
| 111 | RPCBind |
| 135 | MSRPC |
| 139/445 | SMB |
| 161/162 UDP | SNMP |
| 389/636 | LDAP/LDAPS |
| 873 | Rsync |
| 1433 | MSSQL |
| 1521 | Oracle |
| 2049 | NFS |
| 3268 | LDAP Global Catalog (AD) |
| 3306 | MySQL |
| 3389 | RDP |
| 5432 | PostgreSQL |
| 5985/5986 | WinRM |
| 6379 | Redis |
| 8080/8443 | HTTP Alt / Tomcat |
| 27017 | MongoDB |

## Host Discovery (Internal Network)

```bash
# Ping sweep
nmap -sn 192.168.1.0/24 -oG - | grep "Up" | awk '{print $2}'

# ARP scan (faster on local LAN)
arp-scan --localnet
netdiscover -r 192.168.1.0/24

# From a Linux pivot (no nmap)
for i in $(seq 1 254); do ping -c1 -W1 192.168.1.$i &>/dev/null && echo "UP: 192.168.1.$i"; done &
```

## Packet Capture

```bash
tcpdump -i eth0 -w capture.pcap
tcpdump -i eth0 port 445 -A              # SMB traffic readable
tcpdump -i tun0 host $IP -w capture.pcap
```

## Port Forwarding / Tunneling

See [Pivoting](pivoting/pivoting_main.md) for full tunneling workflow.

```bash
# Quick SSH local forward
ssh -L 8080:127.0.0.1:80 user@$IP -N

# Quick SOCKS proxy via SSH
ssh -D 1080 user@$IP -N
```
