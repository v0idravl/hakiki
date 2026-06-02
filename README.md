---
layout: default
title: hakiki
permalink: /
---

# hakiki

Quick reference for OSCP, CTF, and professional penetration testing. Commands over explanation — best tool per job. Built around Kali Linux tooling.

> `OSCP` = exam-legal &nbsp;·&nbsp; `PT ONLY` = pentest/CTF only (auto-exploitation or exam-restricted)

---

## Sections

| Section | What's Inside |
|---|---|
| [Recon](recon/recon_main.md) | nmap/rustscan workflow, Google dorks, Shodan, passive subdomain/ASN discovery, crt.sh, breach/credential lookup, GitHub recon, evidence collection |
| [Service Enumeration](recon/service_enumeration.md) | FTP, SSH, SMB, MSSQL, Redis, WinRM, VNC, Elasticsearch, AJP/Ghostcat, Memcached — all major services |
| [Web Enumeration](recon/web_enumeration.md) | ffuf, feroxbuster, vhost fuzzing, parameter discovery, header analysis, code repository recon |
| [Web Exploitation](web/web_exploitation.md) | SQLi (DB-specific), LFI, file upload, SSRF, XXE, SSTI, XSS, request smuggling, race conditions, JWT, OAuth, WAF bypass, deserialization, GraphQL, IDOR |
| [Passwords & Cracking](passwords/password_attacks.md) | hashcat modes, john, credential spraying, Responder |
| [Exploit](exploit/exploit_main.md) | searchsploit, msfvenom, rev shells, pwntools, ret2libc, AMD64 ABI, mitigation bypass matrix, format strings, GDB/pwndbg triage |
| [Buffer Overflow](bufferoverflow/bof_main.md) | Classic x86 Windows BOF — full 7-step workflow, SEH exploitation, egghunter |
| [Post-Exploit](post_exploit/post_exploit_main.md) | Shell stabilization, file transfer, Mimikatz, LSASS dump, persistence |
| [Pivoting](pivoting/pivoting_main.md) | ligolo-ng, chisel, SSH tunneling, double pivot |
| [PrivEsc — Linux](privesc/privesc_main.md) | linPEAS, sudo, SUID, cron, NFS, Docker, Python library hijacking |
| [PrivEsc — Windows](privesc/windows_privesc.md) | WinPEAS, GodPotato, service exploits, UAC bypass, cred hunting |
| [PrivEsc — CVEs](privesc/cve_privesc.md) | PwnKit, Dirty Pipe, PrintNightmare, HiveNightmare, EternalBlue |
| [Active Directory](active_directory/ad_main.md) | Full attack chain: enum → spray → relay → Kerberoast → ACL abuse → DCSync, GPO abuse, delegation |
| [ADCS & ACL Abuse](active_directory/adcs.md) | ESC1–ESC9, coercion (PetitPotam/DFSCoerce/ShadowCoerce), ACL edges, ZeroLogon, noPac |
| [Reverse Engineering](reversing/reversing_main.md) | file/strings/checksec triage, GDB/pwndbg, Ghidra, ltrace, UPX, angr, CTF patterns |
| [Evasion](evasion.md) | AMSI bypass, execution policy, Defender, fileless execution, LOLBAS, obfuscation |
| [Networking](networking.md) | Interface commands, port reference, host discovery |
| [Resources](resources.md) | GTFOBins, LOLBAS, PayloadsAllTheThings, tool install notes |
