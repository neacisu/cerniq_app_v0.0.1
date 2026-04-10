#!/usr/bin/env python3
"""Linia JSON unică pe stdout pentru scripturi Python long-running / infra (F8–F10)."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from typing import Any, Mapping


def log_json(level: str, message: str, **extra: Any) -> None:
    payload: dict[str, Any] = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "level": level,
        "msg": message,
    }
    for k, v in extra.items():
        payload[k] = v
    sys.stdout.write(json.dumps(payload, default=str, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def log_info(message: str, **extra: Any) -> None:
    log_json("info", message, **extra)


def log_warn(message: str, **extra: Any) -> None:
    log_json("warn", message, **extra)


def log_error(message: str, **extra: Any) -> None:
    log_json("error", message, **extra)


def safe_extra_from_mapping(data: Mapping[str, Any], *keys: str) -> dict[str, Any]:
    """Evită logarea de valori mari sau PII: doar chei explicite."""
    return {k: data[k] for k in keys if k in data}
