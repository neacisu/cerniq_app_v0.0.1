#!/usr/bin/env python3
"""Teste unitare pentru funcții pure din scripturile infra observability (fără rețea)."""
from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]


def _load_module(rel_script: str, as_name: str) -> Any:
    path = ROOT / rel_script
    spec = importlib.util.spec_from_file_location(as_name, path)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    sys.modules[as_name] = mod
    spec.loader.exec_module(mod)
    return mod


# Module dinamic: Pyright nu poate infera atributele; `Any` evită fals pozitive la `__getattr__`.
_smoke: Any = _load_module("infra/scripts/build_http_trace_smoke_matrix.py", "_cerniq_smoke_matrix")
_parity: Any = _load_module("infra/scripts/compare_route_manifest_openapi.py", "_cerniq_route_parity")


class TestTemplateToSamplePath(unittest.TestCase):
    def test_uuid_like_id_param(self):
        self.assertEqual(
            _smoke.template_to_sample_path("/api/v1/users/:id"),
            "/api/v1/users/00000000-0000-4000-8000-000000000001",
        )

    def test_batch_id_param(self):
        self.assertIn(
            "00000000",
            _smoke.template_to_sample_path("/batches/:batchId"),
        )

    def test_generic_param_becomes_smoke(self):
        self.assertEqual(
            _smoke.template_to_sample_path("/items/:slug"),
            "/items/smoke",
        )

    def test_leading_slash_preserved(self):
        self.assertTrue(_smoke.template_to_sample_path("/a").startswith("/"))


class TestPickRepresentative(unittest.TestCase):
    def test_prefers_get(self):
        rep = _smoke.pick_representative(
            [
                {"method": "POST", "path": "/z/longer"},
                {"method": "GET", "path": "/a/short"},
            ]
        )
        self.assertEqual(rep["method"], "GET")

    def test_shorter_path_wins_same_method(self):
        rep = _smoke.pick_representative(
            [
                {"method": "GET", "path": "/api/v1/very/long/path"},
                {"method": "GET", "path": "/api/x"},
            ]
        )
        self.assertEqual(rep["path"], "/api/x")


class TestBuildRouteGroups(unittest.TestCase):
    def test_one_representative_per_prefix_prefers_get(self):
        routes = [
            {"prefix": "/api/v1/a", "method": "POST", "path": "/api/v1/a/longer", "sourceFile": "f.ts"},
            {"prefix": "/api/v1/a", "method": "GET", "path": "/api/v1/a/x", "sourceFile": "f.ts"},
        ]
        groups = _smoke.build_route_groups(routes)
        self.assertIn("/api/v1/a", groups)
        self.assertEqual(groups["/api/v1/a"]["method"], "GET")
        self.assertEqual(groups["/api/v1/a"]["routeTemplate"], "/api/v1/a/x")


class TestFastifyPathToOpenapi(unittest.TestCase):
    def test_colon_to_brace(self):
        self.assertEqual(
            _parity.fastify_path_to_openapi("/api/:tenantId/items/:id"),
            "/api/{tenantId}/items/{id}",
        )

    def test_underscore_in_param(self):
        self.assertEqual(
            _parity.fastify_path_to_openapi("/x/:foo_bar"),
            "/x/{foo_bar}",
        )


class TestCompareRouteManifestDrift(unittest.TestCase):
    def test_strict_exits_one_when_manifest_only_filtered(self):
        with tempfile.TemporaryDirectory() as td:
            tdir = Path(td)
            manifest = {
                "routes": [{"method": "GET", "path": "/api/v1/only-manifest", "prefix": "/api/v1"}],
            }
            openapi = {"paths": {"/api/v1/other": ["get"]}}
            mp = tdir / "manifest.json"
            op = tdir / "openapi.json"
            mp.write_text(json.dumps(manifest), encoding="utf-8")
            op.write_text(json.dumps(openapi), encoding="utf-8")
            import subprocess

            r = subprocess.run(
                [
                    sys.executable,
                    str(ROOT / "infra/scripts/compare_route_manifest_openapi.py"),
                    "--manifest",
                    str(mp),
                    "--openapi-inventory",
                    str(op),
                    "--strict",
                ],
                cwd=str(ROOT),
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(r.returncode, 1, r.stderr + r.stdout)


if __name__ == "__main__":
    unittest.main()
