# Web Enumeration [Back to Recon](recon_main.md)

```bash
gobuster dir -u <target> -w <wordlist>
gobuster vhost
curl -IL <target> # banner grab
whatweb <target>
whatweb --no-errors <target>

curl -s <target>.xml | xmllint --format - # Cleaner XML
```

*see EyeWitness tool*

Check SSL certificates, `robots.txt` disallows, source code, 

Custom wordlist generation via crawling site. [Cewl](https://github.com/digininja/CeWL)

