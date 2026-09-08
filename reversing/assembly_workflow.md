# RE Assembly Workflow — [Back to Main](../README.md)

A practical workflow for turning assembly/decompiler output into understanding. This is not an instruction syntax guide; use it as a checklist for what to label, what to rename, and how to translate common patterns into pseudocode.

---

## First pass: label intent, not instructions

When looking at a function in Ghidra/pwndbg, identify:

| Evidence | Meaning |
|---|---|
| `cmp` followed by conditional jump | branch condition / validation gate |
| call to `strcmp`, `strncmp`, `memcmp` | direct input comparison |
| call to `strlen`, loop over bytes | length gate or string transform |
| `xor`, `add`, `sub`, `rol`, `ror` inside byte loop | encoding/decoding/checksum transform |
| table lookup with `movzx reg, byte ptr [base+index]` | alphabet/substitution table |
| `read`, `fgets`, `scanf`, `gets` | input source |
| `open`, `read`, `write`, `execve` syscalls | direct Linux syscall behavior; map via registers |
| stack local like `[rbp-0x40]` | local buffer/variable |

Rename variables/functions around intent:

```text
FUN_00101234      -> validate_input
local_48          -> input_buf
local_c           -> i
DAT_00102040      -> xor_key / alphabet / expected_bytes
```

---

## Function argument recovery on amd64

At a normal function call:

```text
arg1=rdi, arg2=rsi, arg3=rdx, arg4=rcx, arg5=r8, arg6=r9
return=rax
```

At a Linux syscall:

```text
rax=syscall_number, arg1=rdi, arg2=rsi, arg3=rdx, arg4=r10, arg5=r8, arg6=r9
```

Example:

```asm
lea rdi, [rip+0x200b]     ; "/bin/sh"
xor esi, esi              ; argv = NULL or zeroed arg2
xor edx, edx              ; envp = NULL
mov eax, 59               ; execve
syscall
```

Pseudocode:

```c
execve("/bin/sh", NULL, NULL);
```

For complete syscall prototypes and pointer layouts, use [x86-64 / AMD64](../exploit_dev/amd64_main.md).

---

## Common compare patterns

### Direct string compare

```asm
lea rdi, [rbp-0x40]       ; user input
lea rsi, [rip+expected]   ; expected string
call strcmp
-test eax, eax
jne fail
```

Pseudocode:

```c
if (strcmp(input, expected) != 0) fail();
```

GDB shortcut:

```gdb
b strcmp
run
x/s $rdi
x/s $rsi
```

### Byte loop compare

```asm
movzx eax, byte ptr [rbp+rax-0x40]   ; input[i]
xor eax, 0x37
cmp al, byte ptr [rip+expected+rdx]
jne fail
```

Pseudocode:

```c
for (i = 0; i < n; i++) {
    if ((input[i] ^ 0x37) != expected[i]) fail();
}
```

Solving direction:

```python
expected = bytes([...])
print(bytes(b ^ 0x37 for b in expected))
```

---

## Loop shape recognition

### Counted loop

```c
for (i = 0; i < len; i++) {
    body;
}
```

Assembly clues:

```text
mov dword ptr [rbp-4], 0     ; i = 0
...
add dword ptr [rbp-4], 1     ; i++
cmp [rbp-4], eax             ; i < len?
jl loop_start
```

### Pointer walk

```c
while (*p != '\0') {
    body(*p);
    p++;
}
```

Assembly clues:

```text
movzx eax, byte ptr [rax]
test al, al
jne loop_start
```

---

## Useful Ghidra actions during RE

| Action | Why |
|---|---|
| Rename functions/vars (`L`) | Makes decompiler output readable. |
| Retype vars (`Ctrl+L` / type edit depending keymap) | Convert `undefined8` into `char *`, `int`, arrays. |
| Show XREFs (`X`) | Find who calls validation or where strings are used. |
| Patch conditional branch | Confirm hypothesis without solving fully. |
| Search strings | Find success/failure paths, keys, alphabets, file paths. |
| Create array from bytes | Make encoded blobs easier to copy. |

---

## Patching decision checks

Patch to confirm logic, not as the final explanation.

```text
JZ/JE  = jump if zero/equal
JNZ/JNE = jump if not zero/not equal
JL/JG/JLE/JGE = signed comparisons
JB/JA/JBE/JAE = unsigned comparisons
```

If validation is:

```c
if (validate(input) == 0) fail();
win();
```

Then either:

- force return value: set `rax=1` after `validate`, or
- patch the conditional branch to fall through to win.

GDB runtime patch examples:

```gdb
set $rax = 1
set $rip = 0x4012ab
set {byte}0x401286 = 0x90
set {short}0x401286 = 0x9090
```

---

## References

- [x86-64 / AMD64](../exploit_dev/amd64_main.md) — syscall prototypes, register mapping, `execve`/ORW/socket pseudocode.
- [Felix Cloutier x86 Reference](https://www.felixcloutier.com/x86/) — instruction-level reference.
- `man 2 <syscall>` — exact syscall prototypes and semantics.
