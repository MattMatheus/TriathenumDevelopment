#!/usr/bin/env bash
set -euo pipefail

flywheel_repo_root() {
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  git -C "$script_dir" rev-parse --show-toplevel 2>/dev/null || (cd "$script_dir/../../.." && pwd)
}

flywheel_harness_dir() {
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  cd "$script_dir/../.." && pwd
}

flywheel_config_file() {
  local repo_root harness_dir harness_parent
  repo_root="$(flywheel_repo_root)"
  harness_dir="$(flywheel_harness_dir)"
  harness_parent="$(cd "$harness_dir/.." && pwd)"

  if [[ -f "$repo_root/flywheel.yaml" ]]; then
    printf '%s/flywheel.yaml' "$repo_root"
    return 0
  fi

  if [[ -f "$harness_parent/flywheel.yaml" ]]; then
    printf '%s/flywheel.yaml' "$harness_parent"
    return 0
  fi

  printf '%s/flywheel.yaml' "$repo_root"
}

flywheel_config_dir() {
  dirname "$(flywheel_config_file)"
}

flywheel_repo_relative_path() {
  local path="$1"
  local root
  root="$(flywheel_repo_root)"
  if [[ "$path" == "$root" ]]; then
    printf '.\n'
  elif [[ "$path" == "$root"/* ]]; then
    printf '%s\n' "${path#"$root"/}"
  else
    printf '%s\n' "$path"
  fi
}

flywheel_config_get() {
  local key="$1"
  ruby -e '
    require "yaml"
    path = ARGV.shift
    key = ARGV.shift
    data = YAML.load_file(path)
    value = key.split(".").reduce(data) { |acc, part| acc.fetch(part) }
    case value
    when TrueClass then puts "true"
    when FalseClass then puts "false"
    else puts value
    end
  ' "$(flywheel_config_file)" "$key"
}

flywheel_config_has() {
  local key="$1"
  ruby -e '
    require "yaml"
    path = ARGV.shift
    key = ARGV.shift
    data = YAML.load_file(path)
    found = key.split(".").reduce(data) do |acc, part|
      break :missing unless acc.is_a?(Hash) && acc.key?(part)
      acc.fetch(part)
    end
    exit(found == :missing ? 1 : 0)
  ' "$(flywheel_config_file)" "$key"
}

flywheel_config_get_optional() {
  local key="$1"
  local default_value="${2:-}"
  if flywheel_config_has "$key"; then
    flywheel_config_get "$key"
  else
    printf '%s\n' "$default_value"
  fi
}

flywheel_path() {
  local key="$1"
  local base_dir value
  base_dir="$(flywheel_config_dir)"
  value="$(flywheel_config_get "$key")"
  printf '%s/%s' "$base_dir" "$value"
}

flywheel_template_path() {
  local template_key="$1"
  printf '%s/%s' "$(flywheel_path paths.templates)" "$(flywheel_config_get "templates.${template_key}")"
}

flywheel_artifact_name() {
  local pattern_key="$1"
  local token_name="$2"
  local token_value="$3"
  local pattern
  pattern="$(flywheel_config_get "artifacts.${pattern_key}")"
  pattern="${pattern//\{${token_name}\}/$token_value}"
  printf '%s' "$pattern"
}

flywheel_feature_enabled() {
  local key="$1"
  [[ "$(flywheel_config_get_optional "$key" "false")" == "true" ]]
}
