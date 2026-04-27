# Web Enumeration [Back to Recon](recon_main.md)

- Check default creds on any login.
- Fuzz api endpoints with gobuster.
- Search version of webserver for exploits.
- `wpscan` WordPress and search for plugin vuln.
- Check for file uploads (put/webdav)
    - brutefoce WebDav creds
    - Upload files to rest of found folders as you may not have permissions to other folders.
- Try SQL injection (see cheatsheets) on logins
- add `[], ]], [[` in cookie and parameter values to cause error
- Different HTTP Verbs like PATCH, DEBUG, or something wrong like FAKE
- If `page=x` found try path traversal and lf. 
    - If windows machine try a RFI with PTH attack.
- Review certificates.
    - Test for SSL vuln with [testssl](https://github.com/drwetter/testssl.ssl)
        - Confirm vulns with `a2sv`
- Review source code.
    - Check for comments that may be "spaced" off page. 
    - Links to other files inside CSS files
- After initial directory busting, bust for  for backups of all the executable files (“.php”, “.aspx”…). 
    - Common variations for naming a backup are: file.ext~, #file.ext#, ~file.ext, file.ext.bak, file.ext.tmp, file.ext.old, file.bak, file.tmp and file.old.
    - Be aware of any subdomain or link that is related with some S3 bucket. 
    - `.env` info such as api keys, dbs passwords and other info.
    - `.git` info can be extracted
    - `Javascript` - Deobfuscation tools, vulnerability scanners (?)
- crawling with [gospider](https://github.com/jaeles-project/gospider)
- Tools like `arjun, parameth, x8 and Param Miner` to discover hidden paramaters. Try hidden params on each executable web file.

If server is running Windows, or find login asking for creds and domain name, information disclosure and automated with `http-ntlm-info.nse`

- HHTP Redirect (CTF)
- [HackTricks Web Guide](https://hacktricks.wiki/en/network-services-pentesting/pentesting-web/index.html)
- [HackTricks Web Methodology](https://hacktricks.wiki/en/pentesting-web/web-vulnerabilities-methodology.html)

*see EyeWitness tool*

### Wordlists
- Custom wordlist generation via crawling site. [Cewl](https://github.com/digininja/CeWL). 
- Consider other recommended dictionaries when bruteforcing.