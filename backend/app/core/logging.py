from __future__ import annotations

import logging
import time
from contextlib import contextmanager
from typing import Callable, Generator

LOGGER_NAME = "clipnotes"


def get_logger(name: str | None = None) -> logging.Logger:
    """Return a namespaced logger configured for structured output."""
    logger_name = f"{LOGGER_NAME}.{name}" if name else LOGGER_NAME
    logger = logging.getLogger(logger_name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S%z",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger


@contextmanager
def latency_timer(
    metric_name: str, *, logger: logging.Logger | None = None
) -> Generator[Callable[[], int], None, None]:
    """
    Context manager yielding a callable that returns the elapsed time in milliseconds.
    The elapsed time is logged automatically when the context exits.
    """

    start = time.perf_counter()
    duration_holder = {"value": 0}

    def get_duration() -> int:
        return duration_holder["value"]

    try:
        yield get_duration
    finally:
        duration_holder["value"] = int((time.perf_counter() - start) * 1000)
        log = logger or get_logger("latency")
        log.info(
            "latency",
            extra={"metric": metric_name, "latency_ms": duration_holder["value"]},
        )
