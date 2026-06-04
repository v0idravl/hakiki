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
| [dorksearch.com](https://dorksearch.com/) | Pre-built Google dork templates |
| [PortSwigger Web Security Academy](https://portswigger.net/web-security) | Web attack labs with explanations — best free web security training |
| [CryptoHack Courses](https://cryptohack.org/courses/) | Cryptography fundamentals and applied crypto practice — useful for CTF crypto, reversing context, and understanding real protocol mistakes |
| [hakiki x86-64 / AMD64](x86_64/amd64_main.md) | Local syscall reference with prototypes, register mapping, and pseudocode for argv/envp, ORW, sockets |
| [Shell-Storm x86-64 Syscall Table](https://shell-storm.org/shellcode/files/linux-4.7-syscalls-x64.html) | Fast Linux syscall-number lookup; pair with `man 2` or the local AMD64 page for argument meaning |
| [WADComs](https://wadcoms.github.io/) | AD commands filtered by what you have |


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
# AD / Windows
pip3 install netexec       # replaces crackmapexec
pip3 install certipy-ad    # ADCS attacks
pip3 install bloodyAD      # ACL abuse from Linux
pip3 install coercer       # NTLM coercion (PetitPotam, DFSCoerce, etc.)
pip3 install mitm6         # IPv6 DNS poisoning
pip3 install impacket      # latest (Kali version sometimes behind)

# Web
pip3 install jwt_tool      # JWT attacks (or: git clone https://github.com/ticarpi/jwt_tool)
pip3 install trufflehog3   # secrets in git repos (or: brew/apt)
pip3 install gitleaks      # secrets scanner (binary release preferred)
pip3 install clairvoyance  # GraphQL schema reconstruction without introspection
python3 -m pip install tplmap  # SSTI auto-exploit

# Exploit dev
pip3 install pwntools      # CTF/pwn toolkit
gem install one_gadget     # single-gadget shell finder
pip3 install ropper        # ROP gadget finder
sudo apt install -y patchelf  # modify binary interpreter/RPATH

# Recon
pip3 install sherlock      # username enumeration
pip3 install subfinder     # passive subdomain discovery
```

```bash
# Binary releases (download from GitHub releases)
# ligolo-ng — best pivoting: https://github.com/nicocha30/ligolo-ng/releases
# GodPotato — SeImpersonate→SYSTEM: https://github.com/BeichenDream/GodPotato/releases
# kerbrute — Kerberos user enum: https://github.com/ropnop/kerbrute/releases
# linPEAS / winPEAS: https://github.com/peass-ng/PEASS-ng/releases
# pspy — rootless process monitor: https://github.com/DominicBreuker/pspy/releases
# BloodHound CE: https://github.com/SpecterOps/BloodHound
# SharpHound: https://github.com/BloodHoundAD/SharpHound/releases
# smuggler.py — HTTP request smuggling: https://github.com/defparam/smuggler
# interactsh — OOB callback server: https://github.com/projectdiscovery/interactsh
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

## Practice Platforms

| Resource | Notes |
|---|---|
| [linuxzoo.net](https://linuxzoo.net/) | Browser-based Linux practice environments — good for command drilling without a VM |
| [cmdchallenge.com](https://cmdchallenge.com/) | One-liner command challenges — useful for shell fluency |

## Linux / Shell References

| Resource | Notes |
|---|---|
| [Unix Shell: The Art of IO Redirection](https://web.archive.org/web/20220629044814/http://bencane.com:80/2012/04/16/unix-shell-the-art-of-io-redirection/) | Clear breakdown of stdin/stdout/stderr redirection, fd semantics |
| [Pipes, Forks & Dups](https://www.rozmichelle.com/pipes-forks-dups/) | How pipes, fork(), and dup2() interact — essential for understanding shell internals and C reverse shell construction |

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
