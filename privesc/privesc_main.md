# Privesc - [Back To Main](../README.md)

## Shell Stabilization

```bash
python -c 'import pty;pty.spawn("/bin/bash")' 
```

Tab Completion
```
Ctrl+z
stty raw -echo
fg + [Enter x 2]
```
Clear Screen
```bash
echo $TERM # on LHOST
export TERM=<> # on RHOST
reset
```
History
```bash
export SHELL=bash
```
Screen issues such as overlap
```bash
stty size # on LHOST
stty rows <num> cols <num> # on RHOST
```

## File overwite

 *Always append, never overwrite. Keep original as backup, avoids disruptions!*
```bash
echo '<content>' | tee -a <file> 
```

## Resources

- https://blog.g0tmi1k.com/2011/08/basic-linux-privilege-escalation/
- https://fuzzysecurity.com/tutorials/16.html