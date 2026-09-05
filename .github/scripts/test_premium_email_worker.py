import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import yaml


SCRIPT_PATH = Path(__file__).resolve()
SCRIPT_DIRECTORY = SCRIPT_PATH.parent
INSTALLED_WORKFLOW = SCRIPT_DIRECTORY.parent / "workflows" / "premium-email-worker.yaml"
INSTALLED_LAYOUT = SCRIPT_DIRECTORY.parent.name == ".github" and INSTALLED_WORKFLOW.is_file()
SOURCE_ROOT = SCRIPT_PATH.parents[1]
BASH_EXECUTABLE = next((str(path) for path in (Path("C:/Program Files/Git/bin/bash.exe"), Path("C:/Program Files/Git/usr/bin/bash.exe")) if path.is_file()), None)


def load_workflow(path):
    document = yaml.safe_load(path.read_text(encoding="utf-8"))
    if True in document:
        document["on"] = document.pop(True)
    return document


def load_workflow_from_text(text):
    document = yaml.safe_load(text)
    if True in document:
        document["on"] = document.pop(True)
    return document


def extract_shell(document):
    return document["jobs"]["premium-email-worker"]["steps"][0]["run"]


def approved_repository_for(document):
    site_url = document["jobs"]["premium-email-worker"]["env"]["SITE_URL"]
    if "https://franchisor.id" in site_url:
        return "cfpages-admtravelbos/Franchisor.id"
    if "https://franchisee.id" in site_url:
        return "cfpages-syamsulalam-net/Franchisee.id"
    raise AssertionError("workflow has no approved SITE_URL fallback")


def assert_workflow_contract(case, document, repository, allowed_repositories):
    expected = allowed_repositories[repository]
    job = document["jobs"]["premium-email-worker"]
    case.assertEqual(document["name"], "Premium email worker")
    case.assertEqual(document["permissions"], {"contents": "read"})
    case.assertEqual(job["runs-on"], "ubuntu-24.04")
    case.assertEqual(job["timeout-minutes"], 5)
    case.assertEqual(job["if"], "github.ref_type == 'branch' && github.ref_name == github.event.repository.default_branch")
    case.assertEqual(document["concurrency"], {"group": "premium-email-worker-" + expected["site_key"], "cancel-in-progress": False})
    case.assertEqual(job["env"]["SITE_URL"], "${{ vars." + expected["site_variable"] + " || '" + expected["expected_site_url"] + "' }}")
    case.assertEqual(job["env"]["PREMIUM_EMAIL_WORKER_SECRET"], "${{ secrets.PREMIUM_EMAIL_WORKER_SECRET }}")
    if expected["schedule"]:
        case.assertEqual([entry["cron"] for entry in document["on"]["schedule"]], expected["schedule"])
    else:
        case.assertNotIn("schedule", document["on"])
    shell = extract_shell(document)
    case.assertIn("set -euo pipefail", shell)
    case.assertIn("--connect-timeout 10", shell)
    case.assertIn("--max-time 60", shell)
    case.assertIn("--fail-with-body", shell)
    case.assertNotIn("--retry", shell)
    case.assertNotIn("uses:", shell)


def run_shell(shell, *, site_url, secret, curl_status="204", curl_exit=0):
    if BASH_EXECUTABLE is None:
        raise AssertionError("native Git Bash is required for production-shaped shell tests")
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        script = root / "worker.sh"
        arguments = root / "curl-arguments.txt"
        script.write_text(shell, encoding="utf-8", newline="\n")
        environment = os.environ.copy()
        environment.update({"SITE_URL": site_url, "MOCK_CURL_ARGUMENTS": str(arguments), "MOCK_CURL_STATUS": curl_status, "MOCK_CURL_EXIT": str(curl_exit)})
        if secret is None:
            environment.pop("PREMIUM_EMAIL_WORKER_SECRET", None)
        else:
            environment["PREMIUM_EMAIL_WORKER_SECRET"] = secret
        mock_curl = "curl() { printf '%s\\n' \"$@\" > \"$MOCK_CURL_ARGUMENTS\"; printf '%s' \"$MOCK_CURL_STATUS\"; return \"$MOCK_CURL_EXIT\"; }; source \"$1\""
        completed = subprocess.run([BASH_EXECUTABLE, "-c", mock_curl, "premium-email-test", str(script)], capture_output=True, text=True, env=environment, check=False)
        return completed, arguments.read_text(encoding="utf-8").splitlines() if arguments.exists() else None


def assert_redacted(case, completed, *sensitive_values):
    combined = completed.stdout + completed.stderr
    for value in sensitive_values:
        case.assertNotIn(value, combined)
    case.assertNotIn("Authorization:", combined)


def assert_shell_behavior(case, shell, site_url):
    secret = "premium-email-sentinel-secret"
    missing, missing_arguments = run_shell(shell, site_url=site_url, secret=None)
    case.assertEqual(missing.returncode, 2)
    case.assertIsNone(missing_arguments)
    assert_redacted(case, missing, secret, site_url)

    wrong_url = "https://unapproved-variable-value.example"
    wrong, wrong_arguments = run_shell(shell, site_url=wrong_url, secret=secret)
    case.assertEqual(wrong.returncode, 2)
    case.assertIsNone(wrong_arguments)
    assert_redacted(case, wrong, secret, wrong_url, site_url)

    success, success_arguments = run_shell(shell, site_url=site_url, secret=secret)
    case.assertEqual(success.returncode, 0)
    case.assertEqual(success.stdout, "")
    case.assertEqual(success.stderr, "")
    assert_redacted(case, success, secret, site_url)
    case.assertEqual(success_arguments, ["--silent", "--show-error", "--output", "/dev/null", "--write-out", "%{http_code}", "--request", "POST", "--connect-timeout", "10", "--max-time", "60", "--fail-with-body", "--header", "Authorization: Bearer " + secret, "--header", "Content-Type: application/json", "--data", '{"source":"github-actions"}', site_url + "/premium-email-worker"])

    transport, transport_arguments = run_shell(shell, site_url=site_url, secret=secret, curl_status="000", curl_exit=7)
    case.assertEqual(transport.returncode, 1)
    case.assertEqual(transport.stderr, "Premium email worker request failed during transport.\n")
    case.assertIsNotNone(transport_arguments)
    assert_redacted(case, transport, secret, site_url)

    server_error, server_arguments = run_shell(shell, site_url=site_url, secret=secret, curl_status="500", curl_exit=22)
    case.assertEqual(server_error.returncode, 1)
    case.assertEqual(server_error.stderr, "Premium email worker endpoint returned HTTP 500.\n")
    case.assertIsNotNone(server_arguments)
    assert_redacted(case, server_error, secret, site_url)


if INSTALLED_LAYOUT:
    class Tests(unittest.TestCase):
        def test_installed_sibling_workflow_contract(self):
            document = load_workflow(INSTALLED_WORKFLOW)
            repository = approved_repository_for(document)
            assert_workflow_contract(self, document, repository, {
                "cfpages-admtravelbos/Franchisor.id": {"site_key": "franchisor-id", "site_variable": "FRANCHISOR_SITE_URL", "expected_site_url": "https://franchisor.id", "schedule": []},
                "cfpages-syamsulalam-net/Franchisee.id": {"site_key": "franchisee-id", "site_variable": "FRANCHISEE_SITE_URL", "expected_site_url": "https://franchisee.id", "schedule": ["12,42 * * * *"]},
            })

        def test_old_installed_locators_are_reproducing_poisons(self):
            old_renderer = SCRIPT_DIRECTORY.parent / "canonical" / "scripts" / "render_premium_email_worker.py"
            old_template = SCRIPT_DIRECTORY.parent / "premium-email-worker.template.yml"
            self.assertFalse(old_renderer.exists())
            self.assertFalse(old_template.exists())
            self.assertTrue(INSTALLED_WORKFLOW.is_file())
            self.assertNotIn("render_premium_email_worker", sys.modules)

        def test_installed_shell_behavior(self):
            document = load_workflow(INSTALLED_WORKFLOW)
            repository = approved_repository_for(document)
            expected = "https://franchisor.id" if repository.endswith("Franchisor.id") else "https://franchisee.id"
            assert_shell_behavior(self, extract_shell(document), expected)

else:
    sys.path.insert(0, str(SOURCE_ROOT / "canonical" / "scripts"))
    from render_premium_email_worker import ALLOWED_REPOSITORIES, RenderError, render_workflow

    def parameters(repository):
        return {"repository": repository, "workflow_path": ".github/workflows/premium-email-worker.yaml", **ALLOWED_REPOSITORIES[repository]}

    class Tests(unittest.TestCase):
        def test_rendered_workflows_contract_and_determinism(self):
            for repository in ALLOWED_REPOSITORIES:
                first = render_workflow(parameters(repository))
                self.assertEqual(first, render_workflow(parameters(repository)))
                assert_workflow_contract(self, load_workflow_from_text(first), repository, ALLOWED_REPOSITORIES)

        def test_renderer_cli_idempotence(self):
            repository = "cfpages-syamsulalam-net/Franchisee.id"
            with tempfile.TemporaryDirectory() as temporary:
                output = Path(temporary) / "premium-email-worker.yaml"
                command = [sys.executable, str(SOURCE_ROOT / "canonical" / "scripts" / "render_premium_email_worker.py"), "--parameters-json", json.dumps(parameters(repository)), "--output", str(output)]
                self.assertEqual(subprocess.run(command, capture_output=True, text=True, check=False).returncode, 0)
                first = output.read_bytes()
                self.assertEqual(subprocess.run(command, capture_output=True, text=True, check=False).returncode, 0)
                self.assertEqual(first, output.read_bytes())

        def test_renderer_poison_cases(self):
            valid = parameters("cfpages-admtravelbos/Franchisor.id")
            poisons = [{**valid, "repository": "unknown/repository"}, {key: value for key, value in valid.items() if key != "site_key"}, {**valid, "extra": "field"}, {**valid, "workflow_path": "../premium-email-worker.yaml"}, {**valid, "site_key": "line\n${{ secrets.X }}"}, {**valid, "expected_site_url": "https://wrong.example"}, {**valid, "site_variable": "WRONG_SITE_URL"}, {**valid, "schedule": ["12,42 * * * *"]}]
            for poison in poisons:
                with self.assertRaises(RenderError):
                    render_workflow(poison)

        def test_template_poison_cases(self):
            template = (SOURCE_ROOT / "canonical" / "premium-email-worker.template.yml").read_text(encoding="utf-8")
            poisons = [template + "# duplicate {{site_key}}\n", template.replace("{{site_key}}", "{{unknown_placeholder}}", 1), template.replace("secrets.PREMIUM_EMAIL_WORKER_SECRET", "secrets.OTHER_SECRET")]
            for poison in poisons:
                with self.assertRaises(RenderError):
                    render_workflow(parameters("cfpages-admtravelbos/Franchisor.id"), template_text=poison)

        def test_source_shell_behavior(self):
            for repository, expected in ALLOWED_REPOSITORIES.items():
                assert_shell_behavior(self, extract_shell(load_workflow_from_text(render_workflow(parameters(repository)))), expected["expected_site_url"])

        def test_exact_installed_layout_without_renderer_or_template(self):
            repository = "cfpages-syamsulalam-net/Franchisee.id"
            with tempfile.TemporaryDirectory() as temporary:
                root = Path(temporary)
                script_directory = root / ".github" / "scripts"
                workflow_directory = root / ".github" / "workflows"
                script_directory.mkdir(parents=True)
                workflow_directory.mkdir(parents=True)
                shutil.copy2(SCRIPT_PATH, script_directory / "test_premium_email_worker.py")
                (workflow_directory / "premium-email-worker.yaml").write_text(render_workflow(parameters(repository)), encoding="utf-8", newline="\n")
                completed = subprocess.run([sys.executable, str(script_directory / "test_premium_email_worker.py")], capture_output=True, text=True, check=False)
                self.assertEqual(completed.returncode, 0, completed.stderr)
                self.assertIn("Ran 3 tests", completed.stderr)


if __name__ == "__main__":
    unittest.main()
