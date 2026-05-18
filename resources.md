# Resources — [Back to Main](README.md)

## Active Reference (use during engagements)

| Resource | Use |
|---|---|
| [GTFOBins](https://gtfobins.github.io/) | SUID/sudo/capability abuse — Linux |
| [LOLBAS](https://lolbas-project.github.io/) | Living-off-the-land binaries — Windows |
| [PayloadsAllTheThings](https://swisskyrepo.github.io/PayloadsAllTheThings/) | Web exploit payloads, AD attacks |
| [HackTricks](https://hacktricks.wiki/) | Deep-dive technique reference |
| [revshells.com](https://www.revshells.com/) | Reverse shell generator (all languages, URL encode, base64) |
| [CyberChef](https://gchq.github.io/CyberChef/) | Encode/decode/transform anything |
| [Exploit-DB](https://www.exploit-db.com/) | Public exploits (same as searchsploit) |
| [Sploitus](https://sploitus.com/) | Aggregated exploit/PoC search |

## Wordlists

| Resource | Notes |
|---|---|
| `/usr/share/wordlists/rockyou.txt` | Best general password list |
| `/usr/share/seclists/` | Directory busting, usernames, passwords, fuzzing |
| [SecLists GitHub](https://github.com/danielmiessler/SecLists) | Source / latest |

## Learning / Practice

| Resource | Notes |
|---|---|
| [0xdf](https://0xdf.gitlab.io/) | HTB retired box walkthroughs — detailed methodology |
| [IppSec YouTube](https://www.youtube.com/@ippsec) | HTB box walkthroughs — watch technique application |
| [PortSwigger Web Academy](https://portswigger.net/web-security) | Best free web vuln labs |
| [HackTheBox](https://hackthebox.com) | Practice labs — OSCP-adjacent |
| [TryHackMe](https://tryhackme.com) | Guided labs — good for new techniques |
| [OverTheWire](https://overthewire.org) | Linux fundamentals (Bandit → Narnia) |

## Cheat Sheets

| Resource | Notes |
|---|---|
| [Pentest Monkey RevShells](https://pentestmonkey.net/cheat-sheet/shells/reverse-shell-cheat-sheet) | Classic reference |
| [Active Directory Security](https://adsecurity.org/) | AD attack/defense deep dives |
| [SANS Posters](https://www.sans.org/blog/the-ultimate-list-of-sans-cheat-sheets/) | Quick command refs |

## Tools Not on Kali (Worth Installing)

```bash
# netexec (nxc) — replaces crackmapexec
pip3 install netexec

# ligolo-ng — best pivoting tool
# https://github.com/nicocha30/ligolo-ng/releases

# BloodHound CE — AD attack path analysis
# https://github.com/SpecterOps/BloodHound

# GodPotato — token impersonation (Windows)
# https://github.com/BeichenDream/GodPotato

# kerbrute — Kerberos user enum + spray
# https://github.com/ropnop/kerbrute/releases
```
