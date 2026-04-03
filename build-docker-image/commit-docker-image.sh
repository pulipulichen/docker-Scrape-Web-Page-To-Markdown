#!/bin/bash

new_version=$(date '+%Y%m%d.%H%M%S')
script_dir=$(dirname "$0")
yaml_file="$script_dir/docker-compose-template.yml"

# 判斷是否為 rootless Docker 模式
# Determine if it's rootless Docker mode
is_rootless() {
    docker info 2>&1 | grep -q "Rootless: true"
}

SUDO_CMD=""
if ! is_rootless; then
    SUDO_CMD="sudo"
fi

# ========



# Get the line starting with "image:"
image_line=$(awk '/^ *image:/ {print $0}' "$yaml_file")

# Extract the string before the last "-"
image_config=$(echo "$image_line" | rev | cut -d':' -f2- | rev)

# Replace the line with the new version
sed -i "s|^ *image:.*|${image_config}:${new_version}|" "$yaml_file"

# ========

IMAGE_NAME=$(awk '/^ *image:/ {sub(/^ *image: */, ""); sub(/ *$/, ""); print $0}' "$yaml_file")

# Strip tag (first ':' separates name and tag for this project's image:tag layout)
BASE_NAME="${IMAGE_NAME%%:*}"

# Reject names that violate Docker image reference rules (lowercase path segments, ._- separators).
# See: https://docs.docker.com/reference/cli/docker/image/tag/
validate_image_base_name() {
    local n="$1"
    if [[ -z "$n" ]]; then
        echo "ERROR: Image base name is empty." >&2
        return 1
    fi
    if [[ "$n" == *:* || "$n" == *@* || "$n" == *[[:space:]]* ]]; then
        echo "ERROR: Image base name must not contain tag, digest, or whitespace: ${n}" >&2
        return 1
    fi
    if [[ ! "$n" =~ ^[a-z0-9][a-z0-9._-]*(/[a-z0-9][a-z0-9._-]*)+$ ]]; then
        echo "ERROR: Image base name does not match Docker image name rules (use lowercase letters, digits, ._- and /): ${n}" >&2
        return 1
    fi
    return 0
}

open_browser_url() {
    local url="$1"
    if command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$url" >/dev/null 2>&1 &
    elif command -v open >/dev/null 2>&1; then
        open "$url"
    else
        echo "Open this URL in a browser: ${url}" >&2
    fi
}

# For Docker Hub namespace/repo, verify the public repo exists; if not, open the namespace repositories page and exit.
maybe_require_docker_hub_repository() {
    local base="$1"
    local hub_path=""
    local ns=""
    local repo=""
    local code

    case "$base" in
        docker.io/*)
            hub_path="${base#docker.io/}"
            ;;
        *.*/*)
            # e.g. registry.example.com/user/repo — not checked against hub.docker.com
            return 0
            ;;
        */*)
            hub_path="$base"
            ;;
        *)
            return 0
            ;;
    esac

    # Hub API is namespace/repository (single slash inside path after optional docker.io/)
    if [[ "$hub_path" == */*/* ]]; then
        return 0
    fi

    ns="${hub_path%%/*}"
    repo="${hub_path#*/}"
    if [[ -z "$ns" || -z "$repo" || "$repo" == */* ]]; then
        return 0
    fi

    code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 15 \
        "https://hub.docker.com/v2/repositories/${ns}/${repo}/" 2>/dev/null) || code="000"

    case "$code" in
        200)
            return 0
            ;;
        404)
            echo "ERROR: Docker Hub repository '${ns}/${repo}' was not found (public API returned 404)." >&2
            echo "Private repositories also return 404 without authentication; create the repo on Hub if you intend to push there." >&2
            echo "Opening https://hub.docker.com/repositories/${ns} — create the repository if needed, then re-run this script." >&2
            open_browser_url "https://hub.docker.com/repositories/${ns}"
            exit 1
            ;;
        401|403)
            echo "INFO: Skipping Docker Hub repository check (HTTP ${code}); cannot verify without access." >&2
            return 0
            ;;
        *)
            echo "INFO: Docker Hub check inconclusive (HTTP ${code}); continuing." >&2
            return 0
            ;;
    esac
}

validate_image_base_name "$BASE_NAME" || exit 1
maybe_require_docker_hub_repository "$BASE_NAME"

IMAGE_NAME_LATEST="${BASE_NAME}:latest"

CONTAINER_NAME=$(awk -F= '/^ *- CONTAINER_NAME=/ {gsub(/ /,"",$2); print $2}' "$yaml_file")

# 根據是否為 rootless 模式，決定是否使用 sudo
# Use sudo conditionally based on whether it's rootless mode

${SUDO_CMD} docker compose build

${SUDO_CMD} docker tag ${CONTAINER_NAME} ${IMAGE_NAME}
${SUDO_CMD} docker push "${IMAGE_NAME}"

${SUDO_CMD} docker tag ${CONTAINER_NAME} ${IMAGE_NAME_LATEST}
${SUDO_CMD} docker push ${IMAGE_NAME_LATEST}

# echo ${IMAGE_NAME}
# echo ${IMAGE_NAME_LATEST}

echo ${IMAGE_NAME} > ./tag.txt

# =========

git add .
git commit -m "${new_version}"
git push --force-with-lease
