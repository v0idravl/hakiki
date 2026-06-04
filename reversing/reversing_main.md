# Reverse Engineering — [Back to Main](../README.md)

> Triage first, decompile second. Most CTF reversing challenges yield to `file` + `strings` + `ltrace` before you ever open Ghidra.

Related pages:

- [RE Assembly Workflow](assembly_workflow.md) — assembly-to-pseudocode workflow and argument recovery.
- [x86-64 / AMD64](../x86_64/amd64_main.md) — syscall prototypes, register mapping, `execve` and ORW pseudocode.
- [pwntools Boilerplate](../python_tools/pwntools.md) — automation and exploit scripting templates.

---

## Methodology

Run every step before moving to the next. Stop when you have the flag.

```
Step 1 — Identify          file, strings, checksec, xxd magic bytes
Step 2 — Trace live        ltrace / strace with real or dummy input
Step 3 — Packed?           binwalk -E, upx -t → unpack if needed
Step 4 — Decompile         Ghidra or Cutter → find validation logic
Step 5 — Debug             GDB + pwndbg → inspect registers, patch jumps
Step 6 — Automate          pwntools script or angr for input-space search
```

**Stop at the step that gives you the flag.** The majority of beginner CTF challenges die at Step 2 (ltrace catches the strcmp) or Step 4 (decompile reveals XOR loop).

---

## Step 1 — Triage

```bash
file <binary>           # ELF/PE/Mach-O, 32/64-bit, stripped, dynamically linked
strings <binary>        # printable strings — flags, keys, URLs, error messages
strings -n 8 <binary>  # raise minimum length to cut noise
strings -e l <binary>  # wide (UTF-16LE) strings — common in Windows PE files

checksec --file=<binary>   # PIE, NX, RELRO, canary, FORTIFY

xxd <binary> | head -4     # check magic bytes manually
binwalk <binary>           # signature scan — finds embedded files, packed sections
binwalk -E <binary>        # entropy plot — high entropy = packed/encrypted
```

**Magic bytes quick reference:**

| Header bytes | Type |
|---|---|
| `7f 45 4c 46` | ELF (Linux binary) |
| `4d 5a` (MZ) | PE (Windows binary) |
| `50 4b 03 04` | ZIP / APK / JAR |
| `ca fe ba be` | Java class file |
| `55 50 58 21` (UPX!) | UPX packed ELF |

**What triage tells you:**

| Finding | What to do |
|---|---|
| `stripped` in file output | No function names — rely on decompiler heuristics |
| `dynamically linked` | ltrace works; statically linked binaries need strace only |
| Flag-like string in `strings` output | You're done |
| High entropy section | Packed — go to Step 3 before decompiling |
| `UPX` in strings or binwalk | `upx -d <binary>` then restart from Step 1 |

---

## Step 2 — Dynamic Tracing (No Debugger Needed)

**Do this before opening a decompiler.** ltrace catches strcmp-style flag checks instantly.

```bash
# ltrace — library calls (strcmp, malloc, printf, etc.)
ltrace ./<binary>
ltrace -s 200 ./<binary>               # full strings in calls (default truncates)
echo "AAAA" | ltrace -s 200 ./<binary> # pipe dummy input

# The win: ltrace output when binary checks strcmp(input, secret):
# strcmp("AAAA", "CTF{real_flag_here}") = -1
# → the second argument is the real value — you're done

# strace — syscalls (open, read, write, mmap, execve)
strace ./<binary>
strace -e trace=read,write,open ./<binary>   # filter to file I/O only
strace -s 200 ./<binary>                     # increase string lengths

# Run with a likely correct-format input too
echo "CTF{test}" | ltrace -s 200 ./<binary>
```

---

## Step 3 — Packed / Obfuscated Binaries

```bash
# Detect UPX
strings <binary> | grep -i upx
upx -t <binary>

# Unpack UPX
upx -d <binary> -o <binary>_unpacked
file <binary>_unpacked    # verify, then restart from Step 1

# Custom packer — let it unpack itself, then dump from memory
gdb ./<binary>
(gdb) b _start
(gdb) r
# Single-step until the code stops unpacking itself (OEP — original entry point)
# Check vmmap in pwndbg for the rx segment, then:
(gdb) dump binary memory unpacked.bin 0x400000 0x500000
```

---

## Step 4 — Static Analysis & Decompilation

### Quick CLI static analysis

```bash
nm <binary>               # symbol table (function names — needs non-stripped)
nm -D <binary>            # dynamic symbols only (works on stripped)
readelf -s <binary>       # symbols with more detail
readelf -S <binary>       # section headers (.text, .data, .rodata)
readelf -d <binary>       # dynamic section — linked libraries
ldd <binary>              # shared library dependencies

objdump -d -M intel <binary>               # full Intel-syntax disassembly
objdump -d -M intel <binary> | grep -A 30 '<main>'

rabin2 -z <binary>        # strings + addresses
rabin2 -i <binary>        # imports
rabin2 -s <binary>        # symbols
```

### Ghidra (recommended)

```bash
ghidra    # GUI
# New Project → Import binary → CodeBrowser → auto-analyze (accept defaults)
# Symbol Tree → Functions → main → decompiler pane on right
```

Key hotkeys:
```
L          rename symbol
T          retype variable
;          add comment
G          go to address
Ctrl+F     search
Ctrl+L     go to label/address
Ctrl+E     open decompiler
X          show cross-references (XREF) to selected symbol
```

### Cutter / Rizin (lighter, open source)

```bash
cutter <binary>     # GUI

rizin <binary>      # CLI
[0x00401000]> aaa              # full analysis
[0x00401000]> afl              # list functions
[0x00401000]> pdf @ main       # print disassembly of main
[0x00401000]> pdg @ main       # decompiled C (r2ghidra plugin)
[0x00401000]> iz               # strings with addresses
```

---

## Step 5 — GDB + pwndbg

```bash
gdb ./<binary>

# pwndbg install: pip install pwndbg  or  apt install pwndbg
```

**Core commands:**

```bash
(gdb) info functions          # list all known functions
(gdb) disas main              # disassemble main
(gdb) b main                  # breakpoint at main
(gdb) b *0x401234             # breakpoint at address
(gdb) b strcmp                # break on library call — inspect args when hit
(gdb) r                       # run
(gdb) r AAAA                  # run with argv[1]
(gdb) r < input.txt           # run with stdin
(gdb) c                       # continue to next breakpoint
(gdb) ni                      # next instruction (step over calls)
(gdb) si                      # step into calls

# Inspect state
(gdb) info registers
(gdb) p $rdi                  # arg1 (x86-64 calling convention)
(gdb) p $rsi                  # arg2
(gdb) x/s $rdi                # print string at arg1 address
(gdb) x/32wx $rsp             # 32 words from stack
(gdb) telescope $rsp 20       # pwndbg annotated stack

# Patch at runtime (bypass checks without recompiling)
(gdb) set $rip = 0x401234     # jump to address
(gdb) set $rax = 1            # force return value to 1 (= success)
(gdb) set {byte}0x401234 = 0x90   # NOP one byte
(gdb) set {short}0x401234 = 0x9090  # NOP two bytes

# pwndbg extras
(gdb) context                 # registers + stack + disasm in one view
(gdb) vmmap                   # memory map with rwx permissions
(gdb) got                     # GOT table
(gdb) search-pattern AAAA     # find bytes in mapped memory
```

**Breaking on strcmp to catch flag comparisons:**

```bash
(gdb) b strcmp
(gdb) r
# When it breaks:
(gdb) x/s $rdi    # first argument
(gdb) x/s $rsi    # second argument — one of these is the secret
```

---

## Step 6 — Automation

### pwntools — interact and extract

```bash
pip install pwntools
```

```python
from pwn import *
import re

p = process('./<binary>')
p.sendline(b'test_input')
data = p.recvall(timeout=2)

flag = re.search(rb'CTF\{[^}]+\}', data)
if flag:
    print(flag.group())
```

### angr — symbolic execution (when brute force is too slow)

Use when the check involves arithmetic or multiple comparisons and you can't easily reverse it manually.

```bash
pip install angr
```

```python
import angr

proj = angr.Project('./<binary>', auto_load_libs=False)

# Get these addresses from Ghidra or objdump
FIND  = 0x401234   # address where "Correct!" / win path is printed
AVOID = 0x401260   # address where "Wrong!"  / fail path is printed

state = proj.factory.entry_state()
sm = proj.factory.simulation_manager(state)
sm.explore(find=FIND, avoid=AVOID)

if sm.found:
    solution = sm.found[0]
    print(solution.posix.dumps(0))   # stdin that reaches the win address
```

---

## Common CTF Patterns

### XOR Encoding

```python
# Brute single-byte XOR — try all 256 keys
data = bytes([0x2a, 0x1f, 0x3c, ...])   # from Ghidra .rodata / xxd
for key in range(256):
    result = bytes(b ^ key for b in data)
    if b'CTF{' in result or b'flag' in result.lower():
        print(f"key=0x{key:02x}: {result}")

# Repeating-key XOR (key length visible as string in Ghidra)
key = b"sekr3t"
data = bytes([...])
print(bytes(data[i] ^ key[i % len(key)] for i in range(len(data))))
```

### Encoded Strings

```bash
# Base64 candidates in strings output
strings <binary> | grep -E '^[A-Za-z0-9+/]{16,}={0,2}$' | while read l; do
    echo "$l" | base64 -d 2>/dev/null && echo
done

# ROT13 all strings
strings <binary> | tr 'A-Za-z' 'N-ZA-Mn-za-m'

# Raw hex strings
strings <binary> | grep -E '^[0-9a-fA-F]{16,}$' | while read l; do
    echo "$l" | xxd -r -p
done
```

### Patching a Check (Always-Win)

When the binary does `if (validate(input)) { win; } else { fail; }`:

```bash
# In Ghidra: right-click the conditional jump → Patch Instruction
# Change JNE → JE, or JE → NOP+NOP (2 bytes: 0x90 0x90)

# In GDB at runtime:
(gdb) b *0xADDRESS_OF_JUMP
(gdb) r
(gdb) set $rip = 0xADDRESS_OF_WIN_BLOCK   # skip the bad branch
```

### Custom Alphabet Base-N

If Ghidra shows a 64-char alphabet string in `.rodata` used during decoding:

```python
import base64, string

CUSTOM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+/"
STD    = string.ascii_uppercase + string.ascii_lowercase + string.digits + "+/"
table  = str.maketrans(CUSTOM, STD)

encoded = "SomeEncodedString"
print(base64.b64decode(encoded.translate(table) + "=="))
```

---

## x86 / Assembly References

| Resource | Notes |
|---|---|
| [hakiki x86-64 / AMD64](../x86_64/amd64_main.md) | Local reference with Linux syscall prototypes, register mapping, `execve` argv/envp layouts, ORW and socket pseudocode |
| [hakiki RE Assembly Workflow](assembly_workflow.md) | Local workflow for translating assembly patterns into pseudocode |
| [Felix Cloutier x86 Reference](https://www.felixcloutier.com/x86/) | Unofficial but detailed — instruction encoding, flags, operand behaviour |
| [x86 Prefix & Escape Opcode Flowchart](https://soc.me/interfaces/x86-prefixes-and-escape-opcodes-flowchart) | Visual map of x86 prefix bytes and opcode escape sequences |
| [Reverse Engineering Tutorial](https://github.com/mytechnotalent/Reverse-Engineering-Tutorial) | Multi-part ARM + x86 RE series — concepts, tools, worked examples |
| [x86-64 CPU Registers](https://wiki.osdev.org/CPU_Registers_x86-64) | OSDev wiki — register layout, segment registers, control registers, MSRs |

---

## Non-Native Formats

### Java / JVM / APK

```bash
jar tf <file>.jar               # list contents
jar xf <file>.jar               # extract
javap -c -p com/example/Main.class   # bytecode (built-in)

jadx <file>.jar                 # best decompiler — outputs readable Java
jadx-gui <file>.jar             # GUI with search + XREF
jadx-gui <app>.apk              # APK — same tool
apktool d <app>.apk -o out/     # resources + smali bytecode
```

### Python Bytecode (.pyc)

```bash
file <file>        # "Python bytecode 3.x"

pycdc <file>.pyc   # decompile → Python source (pycdc is most compatible)
uncompyle6 <file>.pyc  # alternative for older versions

# If magic bytes are wrong (header mismatch):
xxd <file>.pyc | head -1   # first 4 bytes = version magic
# Fix: prepend correct magic + 8 null bytes, then retry
```

### .NET / Mono

```bash
file <binary>    # "PE32... Mono/.Net assembly"
strings <binary> | grep -i flag   # still worth it

ilspy <file>.exe    # ILSpy — best open-source .NET decompiler
# dnSpy (Windows) — decompile + debug in one tool
```
