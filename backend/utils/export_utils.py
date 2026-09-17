"""CSV / JSON export helpers."""

import csv
import io
import json
from typing import Any


def dicts_to_csv(rows: list[dict[str, Any]]) -> str:
    if not rows:
        return ""
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    return output.getvalue()


def to_json(data: Any, pretty: bool = True) -> str:
    if pretty:
        return json.dumps(data, indent=2, default=str)
    return json.dumps(data, default=str)


def flatten_report_for_csv(report_data: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for section, value in (report_data or {}).items():
        if isinstance(value, list):
            for item in value:
                if isinstance(item, dict):
                    row = {"section": section, **item}
                    rows.append(row)
                else:
                    rows.append({"section": section, "value": item})
        elif isinstance(value, dict):
            for k, v in value.items():
                rows.append({"section": section, "key": k, "value": v})
        else:
            rows.append({"section": section, "value": value})
    return rows
