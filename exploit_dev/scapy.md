# Scapy Boilerplate — [Back to Main](../README.md)

Packet crafting and protocol probing templates. Use in labs, CTFs, and authorized test networks only.

---

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install scapy
sudo -E python3 script.py   # raw sockets usually need root
```

Inside scripts:

```python
from scapy.all import *
conf.verb = 0
```

---

## Packet anatomy quick reference

```python
pkt = Ether()/IP(dst='192.0.2.10')/TCP(dport=80, flags='S')
pkt.show()
hexdump(pkt)
raw(pkt)
```

Layer access:

```python
pkt[IP].src
pkt[TCP].dport
pkt.haslayer(DNS)
```

---

## Send and receive patterns

Layer 3 send/receive:

```python
ans = sr1(IP(dst=target)/ICMP(), timeout=2)
if ans:
    ans.summary()
```

Layer 2 send/receive:

```python
ans, unans = srp(Ether(dst='ff:ff:ff:ff:ff:ff')/ARP(pdst='192.0.2.0/24'), timeout=2)
for sent, received in ans:
    print(received.psrc, received.hwsrc)
```

Send without waiting:

```python
send(IP(dst=target)/UDP(dport=53)/b'data')
sendp(Ether()/ARP(pdst=target))
```

---

## TCP SYN probe

```python
#!/usr/bin/env python3
from scapy.all import *

conf.verb = 0

target = '192.0.2.10'
ports = [22, 80, 443, 445]

for port in ports:
    pkt = IP(dst=target)/TCP(dport=port, flags='S')
    resp = sr1(pkt, timeout=1)
    if resp is None:
        state = 'filtered/no response'
    elif resp.haslayer(TCP) and resp[TCP].flags & 0x12 == 0x12:  # SYN/ACK
        state = 'open'
        send(IP(dst=target)/TCP(dport=port, sport=resp[TCP].dport, flags='R'))
    elif resp.haslayer(TCP) and resp[TCP].flags & 0x14 == 0x14:  # RST/ACK
        state = 'closed'
    else:
        state = resp.summary()
    print(f'{port}: {state}')
```

---

## UDP probe

```python
from scapy.all import *
conf.verb = 0

target = '192.0.2.10'
port = 161

pkt = IP(dst=target)/UDP(dport=port)/b'\x30\x26\x02\x01\x01'
resp = sr1(pkt, timeout=2)

if resp is None:
    print('open|filtered or no response')
elif resp.haslayer(ICMP) and resp[ICMP].type == 3:
    print(f'closed/filtered ICMP code={resp[ICMP].code}')
else:
    resp.show()
```

UDP absence is not proof of open. Treat no response as `open|filtered` unless the protocol gives a positive reply.

---

## DNS query template

```python
from scapy.all import *
conf.verb = 0

dns_server = '192.0.2.53'
name = 'example.com'

pkt = IP(dst=dns_server)/UDP(dport=53)/DNS(
    rd=1,
    qd=DNSQR(qname=name, qtype='A')
)
resp = sr1(pkt, timeout=2)

if resp and resp.haslayer(DNS):
    for i in range(resp[DNS].ancount):
        rr = resp[DNS].an[i]
        print(rr.rrname.decode(errors='ignore'), rr.rdata)
```

---

## Sniff with filter and callback

```python
from scapy.all import *

def handle(pkt):
    if pkt.haslayer(IP):
        print(pkt[IP].src, '->', pkt[IP].dst, pkt.summary())

sniff(
    iface='eth0',
    filter='tcp port 80 or udp port 53',
    prn=handle,
    store=False,
)
```

Useful BPF filters:

```text
host 192.0.2.10
tcp port 80
udp port 53
icmp
net 192.0.2.0/24
```

---

## ARP sweep

```python
#!/usr/bin/env python3
from scapy.all import *
conf.verb = 0

network = '192.0.2.0/24'
packet = Ether(dst='ff:ff:ff:ff:ff:ff')/ARP(pdst=network)
ans, _ = srp(packet, timeout=2)

for _, r in ans:
    print(f'{r.psrc:15} {r.hwsrc}')
```

---

## PCAP read/write

```python
pkts = rdpcap('capture.pcap')
for pkt in pkts:
    if pkt.haslayer(TCP):
        print(pkt[IP].src, pkt[TCP].sport, '->', pkt[IP].dst, pkt[TCP].dport)

wrpcap('filtered.pcap', [p for p in pkts if p.haslayer(DNS)])
```

---

## Minimal custom protocol probe

```python
#!/usr/bin/env python3
from scapy.all import *
conf.verb = 0

target = '192.0.2.10'
port = 31337
payload = b'HELLO\x00'

pkt = IP(dst=target)/TCP(dport=port, flags='S')
synack = sr1(pkt, timeout=2)
if not synack or not synack.haslayer(TCP) or synack[TCP].flags & 0x12 != 0x12:
    raise SystemExit('no SYN/ACK')

sport = synack[TCP].dport
seq = synack[TCP].ack
ack = synack[TCP].seq + 1

send(IP(dst=target)/TCP(sport=sport, dport=port, flags='A', seq=seq, ack=ack))
resp = sr1(IP(dst=target)/TCP(sport=sport, dport=port, flags='PA', seq=seq, ack=ack)/payload, timeout=2)
if resp:
    resp.show()
```

For normal TCP application interaction, Python `socket` is usually cleaner. Use Scapy when you need malformed packets, unusual flags, or protocol fields normal sockets hide.

---

## Field references to remember

| Layer | Fields that matter often |
|---|---|
| `Ether` | `src`, `dst`, `type` |
| `ARP` | `op`, `psrc`, `pdst`, `hwsrc`, `hwdst` |
| `IP` | `src`, `dst`, `ttl`, `id`, `flags`, `frag`, `proto` |
| `TCP` | `sport`, `dport`, `flags`, `seq`, `ack`, `window`, `options` |
| `UDP` | `sport`, `dport`, `len` |
| `ICMP` | `type`, `code`, `id`, `seq` |
| `DNS` | `qd`, `an`, `rcode`, `ancount` |

---

## Notes that prevent wasted time

- Use `sr1` for one expected response; use `sr`/`srp` for many.
- Use `sendp`/`srp` when you craft `Ether()` or need layer-2 behavior.
- Set `conf.verb = 0` to silence Scapy noise.
- Raw packets often need root; normal TCP streams usually do not.
- A missing UDP reply does not prove the port is open.
- For application-layer TCP protocols, start with `socket`; switch to Scapy only for packet-level control.
