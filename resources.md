# Resources — [Back to Main](README.md)

## Essential References (keep these open during work)

| Resource | Use |
|---|---|
| [GTFOBins](https://gtfobins.github.io/) | SUID/sudo/capability/shell abuse — Linux |
| [LOLBAS](https://lolbas-project.github.io/) | Living-off-the-land binaries — Windows |
| [PayloadsAllTheThings](https://swisskyrepo.github.io/PayloadsAllTheThings/) | Web payloads, AD techniques, every attack type |
| [revshells.com](https://www.revshells.com/) | Reverse shell generator — all languages, URL encode, base64 |
| [CyberChef](https://gchq.github.io/CyberChef/) | Encode, decode, transform, convert anything |
| [HackTricks](https://hacktricks.wiki/) | Deep-dive technique reference when you need more detail |
| [Exploit-DB](https://www.exploit-db.com/) | Public exploits — same DB as searchsploit |
| [Sploitus](https://sploitus.com/) | Aggregated exploit + GitHub PoC search |


## Wordlists

| Wordlist | Use |
|---|---|
| `/usr/share/wordlists/rockyou.txt` | General password cracking |
| `/usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt` | Directory busting |
| `/usr/share/seclists/Discovery/Web-Content/raft-medium-words.txt` | File + extension fuzzing |
| `/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt` | Subdomain / vhost enum |
| `/usr/share/seclists/Usernames/xato-net-10-million-usernames.txt` | Username enumeration |
| `/usr/share/seclists/Passwords/Common-Credentials/10k-most-common.txt` | Fast password spray |
| [SecLists GitHub](https://github.com/danielmiessler/SecLists) | Source and latest additions |

## Tools Not in Default Kali (Install These)

```bash
# netexec — replaces crackmapexec (maintained fork)
pip3 install netexec

# certipy — ADCS attack tool
pip3 install certipy-ad

# bloodyAD — ACL abuse from Linux
pip3 install bloodyAD

# coercer — NTLM coercion methods
pip3 install coercer

# mitm6 — IPv6 DNS poisoning
pip3 install mitm6

# impacket (latest) — in case Kali version is behind
pip3 install impacket
```

```bash
# ligolo-ng — best pivoting tool (binary release)
# https://github.com/nicocha30/ligolo-ng/releases
# Download proxy (LHOST) + agent (RHOST)

# GodPotato — SeImpersonate → SYSTEM
# https://github.com/BeichenDream/GodPotato/releases

# kerbrute — Kerberos user enum + spray
# https://github.com/ropnop/kerbrute/releases

# linPEAS / winPEAS
# https://github.com/peass-ng/PEASS-ng/releases

# pspy — process monitor without root
# https://github.com/DominicBreuker/pspy/releases

# BloodHound CE
# https://github.com/SpecterOps/BloodHound
```

## AD-Specific References

| Resource | Notes |
|---|---|
| [adsecurity.org](https://adsecurity.org/) | AD attack/defense deep dives by Sean Metcalf |
| [The Hacker Recipes](https://www.thehacker.recipes/) | Structured AD attack reference |
| [WADComs](https://wadcoms.github.io/) | Interactive AD command cheatsheet — filter by situation |
| [Certipy Wiki](https://github.com/ly4k/Certipy) | ADCS attack reference |

## Cheat Sheets

| Resource | Notes |
|---|---|
| [Pentest Monkey RevShells](https://pentestmonkey.net/cheat-sheet/shells/reverse-shell-cheat-sheet) | Classic reverse shell reference |
| [SANS Posters](https://www.sans.org/blog/the-ultimate-list-of-sans-cheat-sheets/) | Quick command reference PDFs |
| [WADComs](https://wadcoms.github.io/) | AD-specific commands filtered by what you have |

## Exploit Dev / Binary Exploitation

| Resource | Notes |
|---|---|
| [The Systems Hacking Handbook](https://ike.mahaloz.re/1_introduction/introduction.html) | Structured systems exploitation reference — from binary basics to advanced techniques |
| [Architecture 1001: x86-64 Assembly](https://ost2.fyi/Arch1001) | OpenSecurityTraining2 — free course, Intel syntax, exploitation-focused |

## Reporting

| Tool | Notes |
|---|---|
| [pwndoc](https://github.com/pwndoc/pwndoc) | Self-hosted pentest report generator |
| [SysReptor](https://github.com/Syslifters/sysreptor) | Modern report generator with templates |
