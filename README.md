---
layout: default
title: hakiki
permalink: /
---

# hakiki

Quick reference for CTF and professional penetration testing. Fast navigation, commands over long explanations, and phase-oriented pages built around Kali/Linux tooling.

> `PT ONLY` = pentest/CTF only — auto-exploitation, noisy, or engagement-restricted.

---

## Fast paths

| Need | Open |
|---|---|
| Enumerate a target from zero | [Recon](recon/recon_main.md) → [Service Enumeration](recon/service_enumeration.md) |
| Web app testing | [Web Enumeration](recon/web_enumeration.md) → [Web Exploitation](web/web_exploitation.md) |
| Passwords, hashes, spraying | [Credentials](credentials/index.md) |
| Public exploit, payload, shell | [Exploit Helpers](exploit_dev/exploit_main.md) |
| Binary/pwn/rev adjacent work | [Exploit Development](exploit_dev/index.md) + [Reverse Engineering](reversing/reversing_main.md) |
| Syscall args / argv layouts | [x86-64 / AMD64](exploit_dev/amd64_main.md) |
| Privilege escalation | [Linux PrivEsc](privesc/privesc_main.md) / [Windows PrivEsc](privesc/windows_privesc.md) |
| AD attack chain | [Active Directory](active_directory/ad_main.md) + [ADCS & ACL Abuse](active_directory/adcs.md) |
| After initial access | [Post-Exploitation](post_exploitation/index.md) |
| Cross-cutting lookups | [Reference](reference/index.md) |

---

## Sections

| Category | What's inside |
|---|---|
| [Recon](recon/recon_main.md) | nmap/rustscan workflow, service enumeration, web enum, passive discovery, evidence collection. |
| [Web Exploitation](web/web_exploitation.md) | SQLi, LFI, upload, SSRF, XXE, SSTI, XSS, JWT, OAuth, GraphQL, IDOR, request smuggling. |
| [Credentials](credentials/index.md) | hashcat/john, credential spraying, Responder, cracking workflow. |
| [Exploit Development](exploit_dev/index.md) | public exploit adaptation, msfvenom, Linux pwn, x86-64 syscalls, pwntools, pwndbg, Windows BOF, Scapy. |
| [Reverse Engineering](reversing/reversing_main.md) | file/strings/checksec triage, GDB/pwndbg, Ghidra, ltrace, UPX, angr, assembly workflow. |
| [Privilege Escalation](privesc/privesc_main.md) | Linux/Windows privesc plus high-value CVE privesc references. |
| [Active Directory](active_directory/ad_main.md) | enum → spray → relay → Kerberoast → ACL abuse → DCSync, GPO abuse, delegation, ADCS. |
| [Post-Exploitation](post_exploitation/index.md) | shell stabilization, file transfer, pivoting, evasion, persistence notes. |
| [Reference](reference/index.md) | resources, install notes, wordlists, networking/port references. |

---

## Structure rule

- Phase/category hub pages live at `category/index.md`.
- Large references stay one click below the hub.
- Keep pages command-first and searchable; avoid duplicating syntax-guide content that belongs in `man`, official docs, or local help.
