# ADR-0003: Python 3.14 Free-Threading pentru Workers

**Status:** Accepted  
**Data:** 2026-01-15  
**Deciders:** Alex (1-Person-Team)

## Context

Workers-ii pentru AI/ML și data processing sunt CPU-bound și necesită true parallelism. Python tradițional cu GIL nu poate utiliza eficient multiple cores.

## Decizie

Utilizăm **Python 3.14.2 Free-Threading** (no-GIL) pentru toți workers-ii Python.

## Consecințe

### Pozitive

- **True parallelism** pentru workloads CPU-bound
- **~4x speedup** pentru multi-threaded workloads
- Overhead single-threaded redus la **5-10%** (vs 40% în 3.13)
- PEP 779 Final - suport oficial

### Negative

- Lock-uri explicite OBLIGATORII (GIL nu mai oferă protecție implicită)
- Binary separat: `python3.14t`
- Unele C extensions pot necesita rebuild

### Configurație

```bash
# Environment variable
PYTHON_GIL=0

# Verificare la runtime
import sys
if sys.version_info >= (3, 13):
    is_gil_disabled = not sys._is_gil_enabled()
```

```python
# Thread safety pattern OBLIGATORIU
import threading

_lock = threading.Lock()

def update_shared_state(key: str, value: Any) -> None:
    with _lock:
        shared_dict[key] = value
```

### Restricții Anti-Halucinare

- **TOATE** structurile shared TREBUIE protejate cu lock
- **NU** asuma thread-safety implicită
- **FOLOSEȘTE** `queue.Queue` pentru comunicare inter-thread
