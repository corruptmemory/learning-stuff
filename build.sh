#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
VENDOR_DIR="$REPO_ROOT/shared/vendor"

# Library versions
PLOTLY_VERSION="2.35.3"
KATEX_VERSION="0.16.11"
D3_VERSION="7.9.0"
REACT_VERSION="18"
BABEL_STANDALONE_VERSION="7"

usage() {
    cat <<'EOF'
Usage: ./build.sh <command> [args...]

Commands:
  refresh-vendor          Download/update vendored JS libraries (Plotly, KaTeX, D3)
  setup <topic-path>      Create venv and install requirements for a topic
  setup-all               Setup venvs for all topics with requirements.txt
  run <topic-path> <script>  Run a Python script in the topic's venv

Examples:
  ./build.sh refresh-vendor
  ./build.sh setup data-science/difference-in-differences
  ./build.sh run data-science/difference-in-differences scripts/generate_data.py
EOF
    exit 1
}

refresh_vendor() {
    echo "==> Downloading vendored libraries to $VENDOR_DIR"
    mkdir -p "$VENDOR_DIR/katex/contrib" "$VENDOR_DIR/katex/fonts"

    # Plotly
    echo "  Plotly $PLOTLY_VERSION..."
    curl -sL "https://cdn.plot.ly/plotly-${PLOTLY_VERSION}.min.js" \
        -o "$VENDOR_DIR/plotly.min.js"

    # D3
    echo "  D3 $D3_VERSION..."
    curl -sL "https://cdn.jsdelivr.net/npm/d3@${D3_VERSION}/dist/d3.min.js" \
        -o "$VENDOR_DIR/d3.min.js"

    # React
    echo "  React $REACT_VERSION..."
    curl -sL "https://unpkg.com/react@${REACT_VERSION}/umd/react.development.js" \
        -o "$VENDOR_DIR/react.development.js"
    curl -sL "https://unpkg.com/react-dom@${REACT_VERSION}/umd/react-dom.development.js" \
        -o "$VENDOR_DIR/react-dom.development.js"

    # Babel standalone (in-browser JSX transform)
    echo "  Babel standalone $BABEL_STANDALONE_VERSION..."
    curl -sL "https://unpkg.com/@babel/standalone@${BABEL_STANDALONE_VERSION}/babel.min.js" \
        -o "$VENDOR_DIR/babel.min.js"

    # KaTeX core
    echo "  KaTeX $KATEX_VERSION..."
    curl -sL "https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.js" \
        -o "$VENDOR_DIR/katex/katex.min.js"
    curl -sL "https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/katex.min.css" \
        -o "$VENDOR_DIR/katex/katex.min.css"
    curl -sL "https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/contrib/auto-render.min.js" \
        -o "$VENDOR_DIR/katex/contrib/auto-render.min.js"

    # KaTeX fonts
    echo "  KaTeX fonts..."
    local FONT_BASE="https://cdn.jsdelivr.net/npm/katex@${KATEX_VERSION}/dist/fonts"
    local FONTS=(
        KaTeX_AMS-Regular.woff2
        KaTeX_Caligraphic-Bold.woff2
        KaTeX_Caligraphic-Regular.woff2
        KaTeX_Fraktur-Bold.woff2
        KaTeX_Fraktur-Regular.woff2
        KaTeX_Main-Bold.woff2
        KaTeX_Main-BoldItalic.woff2
        KaTeX_Main-Italic.woff2
        KaTeX_Main-Regular.woff2
        KaTeX_Math-BoldItalic.woff2
        KaTeX_Math-Italic.woff2
        KaTeX_Math-Regular.woff2
        KaTeX_SansSerif-Bold.woff2
        KaTeX_SansSerif-Italic.woff2
        KaTeX_SansSerif-Regular.woff2
        KaTeX_Script-Regular.woff2
        KaTeX_Size1-Regular.woff2
        KaTeX_Size2-Regular.woff2
        KaTeX_Size3-Regular.woff2
        KaTeX_Size4-Regular.woff2
        KaTeX_Typewriter-Regular.woff2
    )
    for font in "${FONTS[@]}"; do
        curl -sL "$FONT_BASE/$font" -o "$VENDOR_DIR/katex/fonts/$font"
    done

    echo "==> Done. Vendored libraries are in $VENDOR_DIR"
}

setup_topic() {
    local topic_path="$1"
    local full_path="$REPO_ROOT/$topic_path"

    if [[ ! -d "$full_path" ]]; then
        echo "Error: topic directory '$topic_path' not found" >&2
        exit 1
    fi

    if [[ ! -f "$full_path/requirements.txt" ]]; then
        echo "No requirements.txt in $topic_path — nothing to set up"
        return 0
    fi

    echo "==> Setting up venv for $topic_path"
    python3 -m venv "$full_path/.venv"
    "$full_path/.venv/bin/pip" install --quiet --upgrade pip
    "$full_path/.venv/bin/pip" install --quiet -r "$full_path/requirements.txt"
    echo "==> Done. Activate with: source $topic_path/.venv/bin/activate"
}

setup_all() {
    echo "==> Setting up all topics with requirements.txt"
    find "$REPO_ROOT" -name requirements.txt -not -path '*/.venv/*' | while read -r req; do
        local topic_dir
        topic_dir="$(dirname "$req")"
        local rel_path="${topic_dir#$REPO_ROOT/}"
        setup_topic "$rel_path"
    done
    echo "==> All topics set up"
}

run_script() {
    local topic_path="$1"
    local script="$2"
    local full_path="$REPO_ROOT/$topic_path"
    local venv_python="$full_path/.venv/bin/python"

    if [[ ! -f "$venv_python" ]]; then
        echo "Error: no venv found for '$topic_path'. Run: ./build.sh setup $topic_path" >&2
        exit 1
    fi

    echo "==> Running $script in $topic_path venv"
    "$venv_python" "$full_path/$script"
}

[[ $# -lt 1 ]] && usage

case "$1" in
    refresh-vendor)
        refresh_vendor
        ;;
    setup)
        [[ $# -lt 2 ]] && { echo "Usage: ./build.sh setup <topic-path>" >&2; exit 1; }
        setup_topic "$2"
        ;;
    setup-all)
        setup_all
        ;;
    run)
        [[ $# -lt 3 ]] && { echo "Usage: ./build.sh run <topic-path> <script>" >&2; exit 1; }
        run_script "$2" "$3"
        ;;
    *)
        usage
        ;;
esac
