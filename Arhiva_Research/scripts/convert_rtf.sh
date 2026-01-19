#!/bin/bash

# convert_rtf.sh
# Directory: /var/www/CerniqAPP/scripts
# Purpose: Convert all .rtf files in a directory (current or specified) to .md
#          and apply markdownlint --fix for formatting.

# Check if pandoc and markdownlint are installed
if ! command -v pandoc &> /dev/null; then
    echo "Error: pandoc is not installed."
    exit 1
fi

if ! command -v markdownlint &> /dev/null; then
    echo "Error: markdownlint-cli is not installed."
    exit 1
fi

# Directory to search (default to current directory if not provided)
TARGET_DIR="${1:-.}"

echo "Scanning '$TARGET_DIR' for .rtf files..."

# Find RTF files and process them
find "$TARGET_DIR" -maxdepth 1 -type f -name "*.rtf" | while read -r file; do
    echo "Processing: $file"
    
    # Define output filename
    base_name=$(basename "$file" .rtf)
    dir_name=$(dirname "$file")
    output_file="$dir_name/$base_name.md"
    
    # 1. Convert RTF to Markdown using Pandoc
    echo "  - Converting to Markdown..."
    if pandoc -f rtf -t markdown -o "$output_file" "$file"; then
        echo "  - Conversion successful: $output_file"
        
        # 2. Format using markdownlint --fix
        echo "  - Formatting with markdownlint..."
        markdownlint --fix "$output_file" || true # Ignore lint errors, just fix what can be fixed
        
        echo "Done: $output_file"
    else
        echo "  - Error: Conversion failed for $file"
    fi
    echo "----------------------------------------"
done

echo "Batch conversion complete."
