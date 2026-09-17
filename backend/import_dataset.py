"""Import an event CSV into Risk Radar through its event analysis API."""

from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path
from typing import Any

import httpx


METADATA_FIELDS = {
    "user_avg_amount",
    "payment_failures",
    "failed_login_count",
    "impossible_travel",
    "password_reset_count",
    "api_request_volume",
    "api_error_rate",
    "burst_score",
    "location_change",
    "device_change",
    "ip_repetition",
    "users_from_ip",
    "event_velocity",
    "user_history_deviation",
    "new_device",
    "unusual_location",
    "account_change_after_risky_login",
}
BOOLEAN_FIELDS = {
    "impossible_travel",
    "location_change",
    "device_change",
    "new_device",
    "unusual_location",
    "account_change_after_risky_login",
}
BASE_FIELDS = {
    "event_type",
    "user_id",
    "timestamp",
    "ip_address",
    "location",
    "device",
    "amount",
    "status",
    "metadata_json",
}


def _optional_float(value: str | None) -> float | None:
    if value is None or not value.strip():
        return None
    return float(value)


def _metadata_value(name: str, value: str) -> Any:
    if name in BOOLEAN_FIELDS:
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes", "y"}:
            return True
        if normalized in {"false", "0", "no", "n"}:
            return False
        raise ValueError(f"{name} must be true/false, 1/0, or yes/no")
    return float(value)


def row_to_event(row: dict[str, str | None], line_number: int) -> dict[str, Any]:
    event_type = (row.get("event_type") or "").strip()
    user_id = (row.get("user_id") or "").strip()
    if not event_type or not user_id:
        raise ValueError("event_type and user_id are required")

    metadata: dict[str, Any] = {}
    encoded_metadata = (row.get("metadata_json") or "").strip()
    if encoded_metadata:
        metadata = json.loads(encoded_metadata)
        if not isinstance(metadata, dict):
            raise ValueError("metadata_json must contain a JSON object")

    for key in METADATA_FIELDS:
        value = (row.get(key) or "").strip()
        if value:
            metadata[key] = _metadata_value(key, value)

    event: dict[str, Any] = {
        "event_type": event_type,
        "user_id": user_id,
        "ip_address": (row.get("ip_address") or "0.0.0.0").strip(),
        "location": (row.get("location") or "Unknown").strip(),
        "device": (row.get("device") or "Unknown").strip(),
        "status": (row.get("status") or "success").strip(),
        "metadata_json": metadata,
    }
    amount = _optional_float(row.get("amount"))
    if amount is not None:
        event["amount"] = amount
    timestamp = (row.get("timestamp") or "").strip()
    if timestamp:
        event["timestamp"] = timestamp
    return event


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv_file", type=Path, help="Path to the input CSV")
    parser.add_argument(
        "--api-url",
        default="http://127.0.0.1:8800/api/events/analyze",
        help="Event analysis endpoint (default: %(default)s)",
    )
    parser.add_argument("--limit", type=int, help="Import at most this many rows")
    args = parser.parse_args()

    if args.limit is not None and args.limit < 1:
        parser.error("--limit must be greater than zero")
    if not args.csv_file.is_file():
        parser.error(f"CSV file not found: {args.csv_file}")

    succeeded = 0
    failed = 0
    with args.csv_file.open("r", encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        headers = set(reader.fieldnames or [])
        required = {"event_type", "user_id"}
        missing = required - headers
        if missing:
            parser.error("CSV is missing required columns: " + ", ".join(sorted(missing)))
        unknown = headers - BASE_FIELDS - METADATA_FIELDS
        if unknown:
            print(
                "Ignoring columns not used by this importer: " + ", ".join(sorted(unknown)),
                file=sys.stderr,
            )

        with httpx.Client(timeout=30.0) as client:
            for line_number, row in enumerate(reader, start=2):
                if args.limit is not None and succeeded + failed >= args.limit:
                    break
                try:
                    payload = row_to_event(row, line_number)
                    response = client.post(args.api_url, json=payload)
                    response.raise_for_status()
                    succeeded += 1
                except (ValueError, json.JSONDecodeError, httpx.HTTPError) as exc:
                    failed += 1
                    print(f"Row {line_number} failed: {exc}", file=sys.stderr)
                if (succeeded + failed) % 100 == 0:
                    print(f"Processed {succeeded + failed} rows ({succeeded} imported, {failed} failed)")

    print(f"Import complete: {succeeded} imported, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
