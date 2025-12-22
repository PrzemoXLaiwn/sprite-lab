with open('src/app/api/edit-image/route.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
added = False

for i, line in enumerate(lines):
    new_lines.append(line)
    
    # Add const trimmedPrompt after the catch block
    if '// Continue anyway - size check is not critical' in line and not added:
        # Add it after the closing brace of catch
        # Look for the next line with just }
        if i + 1 < len(lines) and lines[i + 1].strip() == '}':
            new_lines.append(lines[i + 1])  # Add the closing }
            new_lines.append('\n')
            new_lines.append('    const trimmedPrompt = editPrompt.trim();\n')
            added = True
            # Skip the next line since we already added it
            continue

with open('src/app/api/edit-image/route.ts', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Fixed! Added const trimmedPrompt after catch block")
