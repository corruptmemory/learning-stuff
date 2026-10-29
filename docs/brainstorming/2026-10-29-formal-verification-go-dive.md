# Formal verification for a Go program: what the options really are

**Origin:** chat conversation of 2026-10-29, prompted by Burc Sahinoglu's LinkedIn post summarizing Anthropic's formal-verification work (published 2026-10-22, per his post). No Plaud note.
**Written:** 2026-10-29.

## Sources actually read

Primary (landed; read in Jim's browser via marksnip):
- Anthropic, "LLMs are making formal software verification feasible at a much larger scale" (with Theorem). https://www.anthropic.com/research/formal-verification. The clip did not capture the footnotes or the appendix PDF.

Local (landed):
- `~/projects/jai-wayland/docs/plans/2026-10-29-entire-graph-jai-support.md`, the note on `entire graph` and Jai.
- `~/projects/tree-sitter-jai/parser-status-report.md`, the tree-sitter-jai status report.

Secondary (page extracts returned by Perplexity search, not opened in the browser):
- Gobra tool paper (Wolf et al., "Gobra: Modular Specification and Verification of Go Programs", 2021) and the Gobra VS Code extension page.
- Pereira et al., "Protocols to Code: Formal Verification of a Secure Next-Generation Internet Router", CCS 2025 (VerifiedSCION); the VerifiedSCION README; Telschow's ETH master's report on the router's I/O behaviour.
- Perennial SOSP 2019 paper; the Goose README (pkg.go.dev v0.10.0) and GitHub org page; Zhang, "Verification of Go Channels", MIT MEng thesis, 2025.
- AWS Open Source blog, "Lean Into Verified Software Development" (2024-04-08); "How We Built Cedar: A Verification-Guided Approach" (FSE 2024, arXiv 2407.01688); the `kairos-cedar` README.
- LeanPort write-up on dev.to (2026-10-21); `yamafaktory/formal` README; Dafny docs on the Go target.
- An X post by Arnav Gupta quoting Boris Cherny's "formally verified the Claude Agent SDK using Lean" post (2026-09-22/23), seen only as a search snippet.

From memory, not checked this session: TLA+ and its model checkers.

**Provenance note.** The quote "could make any theorem provable by rewriting the program into one that trivially never crashes" comes from Burc's post. It is presumably the post's footnote 6, which the clip did not capture.

## 0. The question

> I'm building a program in Go, of course there will be some tests, but what about formal verification? Loosely speaking what I imagine is putting Lean (or some other language) in the doc comments saying what the go functions/methods are supposed to do and verifying that the claims are in-fact true. Then step-wise building a correctness proof for an entire program.

Verdict: the structure is right. Per-function contracts, with the whole-program proof assembled from them, is modular verification (Hoare logic), and it is how real Go verification has been done (§3.1). The missing piece is that **Lean cannot read Go.** Something has to give the Go code a meaning inside the prover. Every option below is defined by what does that job, and that is also where the trust goes.

## 1. What Anthropic and Theorem actually did

- **A generic spec, not a hand-written one.** "This existing fuzz test never crashes, for any input under 64 MB." It was applied to OSS-Fuzz entry points, where a crash means an AddressSanitizer memory error or a failed assertion.
- **Proved on the binary.** Each library and its fuzz test were compiled to RISC-V. Theorem's formal semantics of RISC-V and of a Linux process turn the binary plus the no-crash property into a theorem. Claude writes the proof in Rocq, and the Rocq kernel checks it. The source language never enters into it.
- **Scale.** 239 entry points across 123 libraries, about 180 million lines of Rocq, a typical proof about 600,000 lines, binaries with a median of 18,000 RISC-V instructions. For comparison, seL4 took 2 person-years to implement and 20 to verify.
- **What you trust:** the RISC-V and Linux models, the exact theorem statements, and the Rocq checker. You do not trust the proof itself, which is why "virtually none of it needs to be manually reviewed".
- **Bugs that fuzzing missed.** Fuzzers usually cap inputs at 1 MB. Examples:
  - a counter underflow causing an out-of-bounds write, only on about 20 MB inputs with one rare layout
  - an out-of-bounds read needing a 64 MB input and over 2 GB of memory
  - a rediscovery of CVE-2026-56132 in libexpat
  - a logic bug: a file-loading restriction that "isn't always enforced"
- **Properties beyond memory safety come free when the test asserts them.** The LZO fuzz test checks that compress-then-decompress returns the input, so "never crashes" means the round trip is proved. Proving cpp-httplib also meant proving, on machine code, that libc++'s red-black tree keeps its depth logarithmic, because recursion depth in a destructor depended on it.
- **Other experiments.**
  - A Claude-written spec of RFC 1950 (zlib), with the Linux kernel's zlib proved against it on x86, using Claude-generated x86 semantics.
  - A Python interpreter in Rust proved with Verus against a paper's CPython semantics; it agreed with CPython on 99.95% of 1.7 million random programs.
  - A PDF reader in which "we found as many security bugs in one week as are typically reported in a year".
- **Cost is falling.**
  - Opus 5.5 proves half of 36 benchmark tasks with about 40% fewer tokens than Opus 5.
  - Agents sharing a proof workspace used 17% fewer tokens.
  - At scale, most of a proof covers code every program contains (C runtime start-up, ASan), so teams copied finished proofs and adapted them.
- **Stated limits.**
  - The proofs cover only single-threaded static RISC-V binaries linked against musl.
  - ASan doesn't catch every memory bug, and not every entry point was proved.
  - Callers can still misuse a library.
  - "'Formally verified' does not mean 'bug-free.'"

**Does it transfer to Go?** Not today, my guess: a Go binary carries its own runtime, which starts threads for the garbage collector and scheduler. That would need a formal model before this machinery could say anything about it. No one doing this for Go turned up.

## 2. The missing bridge

There are only a few ways to connect a proof to Go code:

1. **A verifier that understands Go directly.** Its encoding of Go semantics is trusted.
2. **A translator from Go into a prover's logic.** The translator is trusted.
3. **A proof about the compiled binary.** The machine model is trusted (Anthropic's route).
4. **No formal bridge.** Prove a model, then test that the code agrees with it. The bridge is statistical.
5. **Make the verified language the code.** Its compiler is trusted.

Writing Lean in doc comments without one of these is option 4 without the testing.

## 3. The options for Go

| Approach                          | Example                                  | What connects the proof to Go                 | Plausibility                            |
|-----------------------------------|------------------------------------------|-----------------------------------------------|-----------------------------------------|
| Annotate the Go itself            | Gobra (ETH Zurich)                       | Gobra's encoding of Go; Viper and Z3 prove it | real; proven at moderate scale          |
| Translate Go into a prover        | Goose to Rocq, Perennial (MIT)           | a trusted translator for a Go subset          | strongest guarantees, heaviest work     |
| Lean spec, Go tested against it   | Cedar (AWS)                              | differential random testing                   | most practical Lean route               |
| The verified language is the code | LeanPort (Lean to C to cgo), Dafny to Go | the compiler                                  | narrow; cgo costs the pure static build |
| Check the design, not the code    | TLA+ (from memory)                       | none; it checks the protocol                  | cheap, high value for concurrency       |

### 3.1 Gobra: the picture, minus Lean

- **Specs go in comments**, `//@ requires …`, `//@ ensures …`, loop invariants (or `/*@ … @*/`). The Go compiler ignores them.
- **Proving is automatic.** Gobra encodes the annotated program into Viper and the SMT solver (Z3) does the work. Errors are reported against the Go code.
- **Built-in properties.** It is built on a separation logic (implicit dynamic frames). Without any user spec it proves memory safety, crash freedom (no nil dereference, no index out of range), and freedom from data races. It handles goroutines, channels, and Go interfaces.
- **VerifiedSCION** (CCS 2025) verified the SCION border router as is: 4,700 lines of Go, 345 functions across 12 packages. They used three passes of progressively stronger specs:
  1. no crashes and no races
  2. functional correctness
  3. compliance with an I/O spec extracted from a verified protocol model

  This is Jim's step-wise plan, done at scale.
- **Costs.**
  - The Gobra paper reports 0.3 to 3.1 annotation lines per line of code. One master's report on the router measured 0.97 for memory safety alone and 1.57 with I/O.
  - Unsupported library packages (`fmt`, `hash`, `crypto`) have to be assumed.
  - Verification time can blow up on quantified assertions and on whole large packages. The router was verified one method at a time.
  - Some code had to be rewritten to verify in reasonable time, and the team added an "outline" annotation so a long function could be verified in pieces without refactoring it.

### 3.2 Goose and Perennial: Go into Rocq

- **Goose translates a subset of Go into Rocq.** It uses Go's own `go/ast` and `go/types` to reduce mismatch with the compiler, but the translator and its semantics are trusted.
- **Perennial**, built on the Iris concurrency logic, supplies the proof framework. It has been used for crash-safe concurrent storage: the Mailboat mail server, the GoJournal journaling system, and an NFS server.
- **The subset is restrictive.** The README of v0.10.0 says only bindings, not assignments, are supported. Channel support was a 2025 MIT thesis. The `goose-lang/goose` repo showed as archived in a 2026 search result; where development continues wasn't checked.
- **Proofs are expert work.**
- **A connection:** Nickolai Zeldovich, who advised that channel thesis at MIT, is an author on the Anthropic post.

### 3.3 Cedar's verification-guided development: the practical Lean route

- **The process.** Write an executable Lean model of each core component and prove properties about the model. Then implement production code separately, optimized for speed. Check that it matches the model with **differential random testing**: millions of random inputs, and both must agree. No release ships unless model, proofs, and differential tests are current.
- **AWS's figures.**
  - About 1,700 lines of Lean model and 5,700 lines of proof, against about 25,000 lines of Rust.
  - The hardest proof, validator soundness, was 4,686 lines and 18 person-days.
  - The Lean model runs at about 5 µs per test input, against 7 µs for Rust, so nightly runs of millions of tests are cheap.
- **It already covers Go.** `cedar-go` is a Go implementation of Cedar. Differential testing against the Lean spec (`kairos-cedar`) found 24 issues in cedar-go 1.6.0, 18 of them panics in the marshaller traced to one missing length check.
- **The honest caveat.** The model is proved, but the code is only tested against it, so its correctness is sampled, not guaranteed.

### 3.4 The verified language is the code

- **LeanPort** (October 2026): write decision logic and proofs in Lean; `leanport check` rejects `sorry`/`admit`; `leanport build` compiles Lean to C and generates a cgo wrapper and an ordinary Go package. The proved function is the one that runs. But it means cgo and a C toolchain, which costs a pure-Go static build.
- **Dafny** has a Go backend: `dafny build --target:go` emits Go 1.18 code plus a Dafny runtime library. Its docs describe Go support as "partial and growing".

### 3.5 TLA+: check the design (from memory)

Model the protocol between components, for example the goroutine actors and their command channels, and let the model checker explore every interleaving. There is no link to the code, but deadlocks and lost-update designs show up before any code exists. Boris Cherny's post says he combines Lean and TLA+ "to look for issues around data flow, concurrency, and state mgmt".

## 4. The trap in "Lean in the doc comments"

If an LLM writes a Lean version of each Go function and proves things about it, the proof is about the Lean version. Arnav Gupta tried the same thing on Go code after Boris Cherny's post. He reported that one of the five issues Opus "found" and "fixed" "was badly translated go -> lean". The `yamafaktory/formal` README states the limit plainly: "the theorem concerns a Lean model of the code, and nothing certifies that the model is faithful". Without a mechanical bridge (§2), only differential testing (§3.3) turns that model into evidence about the code.

## 5. Fit for Jim's Go stack (my guess)

- **Pure core logic:** Cedar-style. An executable Lean model with proofs, and Go fuzzing comparing the code with the model.
- **The actor and channel protocol:** TLA+.
- **A small core that must not fail** (a lexer, a byte-slice walker): Gobra, at least the first pass, no panics and no races.
- **Binary-level proof:** not available for Go yet.

## 6. Framings (mine, not the sources')

- **Statistical vs systematic error.** A proof drives statistical error to zero: it covers every input, not a sample. It leaves systematic error untouched: a wrong spec, or a wrong model of the machine. The post's "formally verified does not mean bug-free" section is this point, and it is why the trusted base is listed explicitly.
- **The proof checker is the "nearly perfect verifier"** from the research-loops note (`2026-10-29-autonomous-research-loops-dive.md`), and the reward hack is the predicted one. Claude "could make any theorem provable by rewriting the program into one that trivially never crashes". The defence was to penalize patches and audit them, the same move as the frozen evaluator plus monitor.
- **Your fuzz tests are already specs.** Go's `func FuzzX(f *testing.F)` has the same single-entry-point shape as an OSS-Fuzz target, so "this fuzz test never fails, for any input" is a well-formed theorem about a Go program. What is missing is the machine-level model of the Go runtime, not the spec.

## 7. Upcoming application: a Jai parser in Go for `entire graph` (not started)

**Status:** an idea Jim is contemplating (2026-10-29), parked while contract work may need the time.

**Why it's needed**, from the jai-wayland note:
- `entire graph` (v0.6.0) indexes no `.jai` files and says nothing about it in `health`. Its languages are compiled-in Go maps, with no plug-in point.
- A fork drops in, because the CLI runs the first `entire-graph` on `PATH`.
- tree-sitter is out. tree-sitter-jai stalled at 18,448 parser states and 69 of 80 `how_to` files. Jai's braceless control-flow bodies need ambiguity that LR parsing resolves statically and wrongly, and two files hit the 65,535-entry action-table limit.

**Direction already decided there:**
- Register `.jai` as inventory-only first.
- Then a structural declaration scanner in Go, on the model of `entire-graph`'s Groovy scanner.
- Then a full recursive-descent parser as the target.
- The parser must cover **the language over time**: a corpus per compiler release, with deprecated syntax flagged rather than rejected.

**Why it is a good practice problem for this note** (my mapping):
- **The no-crash spec, Go edition.** A parser fed arbitrary bytes must never panic and must always terminate. That is Anthropic's generic spec, checkable today with Go's native fuzzing. Panics are exactly what Gobra's first pass rules out, and a lexer or mask pass (nested `/* */`, strings, `#string END … END` here-strings) is small, slice-heavy, self-contained code, Gobra's sweet spot.
- **Round-trip properties.** Printing a parsed file and reparsing it gives the same tree, the LZO pattern applied to a parser.
- **A Lean reference model** of the mask pass or the declaration classifier, differentially tested against the Go code. This is the Cedar pattern at small scale.
- **The compiler as oracle.** The jai-wayland note's option C (a metaprogram reading `Message_Typechecked`, where every `Code_Ident` carries `resolved_declaration`) can emit the true declarations for a corpus. Comparing the parser's declarations against them is Carlini's GCC-as-oracle move.
- **The corpus per compiler release** is both the regression suite and, in the research-loops sense, the frozen score. The share of corpus files whose extracted declarations match the compiler's facts is a number an autonomous loop could climb overnight.

## 8. Open threads

- When the Jai parser starts:
  - pick the first verified piece (likely the mask pass)
  - decide Gobra versus Lean-plus-differential-testing for it
  - write the fuzz targets on day one
- Read the post's appendix PDF and footnotes, which this clip missed.
- Check where Goose development lives now, and Gobra's current support for generics and the standard library.
- Try TLA+ on one goroutine-actor protocol from an existing Go project.
