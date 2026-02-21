#!/usr/bin/env python3

import json
import re


def update_versions():
    with open("web/json/versions.json", "r") as f:
        versions = json.load(f)

    app_version = versions["app_version"]
    mcq_version = versions["mcq_version"]

    # Update controllers.js
    with open("web/js/controllers.js", "r") as f:
        content = f.read()

    content = re.sub(r'\$scope\.version\s*=\s*"[^"]*"', f'$scope.version = "{app_version}"', content)
    content = re.sub(r'\$scope\.qcmVersion\s*=\s*"[^"]*"', f'$scope.qcmVersion = "{mcq_version}"', content)

    with open("web/js/controllers.js", "w") as f:
        f.write(content)

    # Update index.html and manifest.json with same substitution
    for file_path in ["web/index.html", "web/manifest.json"]:
        with open(file_path, "r") as f:
            content = f.read()
        content = re.sub(r'\?v=[^"]*', f"?v={app_version}", content)
        with open(file_path, "w") as f:
            f.write(content)

    print("Updated versions in controllers.js, index.html and manifest.json:")
    print(f"  app_version: {app_version}")
    print(f"  mcq_version: {mcq_version}")


if __name__ == "__main__":
    update_versions()
