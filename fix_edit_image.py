with open('src/app/api/edit-image/route.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove all lines with =======
content = '\n'.join(line for line in content.split('\n') if '=======' not in line)

# Find and remove duplicate const trimmedPrompt lines
lines = content.split('\n')
new_lines = []
trimmed_count = 0

for i, line in enumerate(lines):
    if 'const trimmedPrompt = editPrompt.trim();' in line:
        trimmed_count += 1
        # Keep only the first occurrence after the try-catch block
        if trimmed_count == 1:
            # Check if we're after the catch block
            prev_lines = '\n'.join(lines[max(0, i-10):i])
            if 'catch (sizeError)' in prev_lines:
                new_lines.append(line)
        elif trimmed_count == 2:
            # This should be the one we keep (after catch block)
            new_lines.append(line)
        # Skip all other occurrences
    else:
        new_lines.append(line)

with open('src/app/api/edit-image/route.ts', 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))

print(f"Fixed! Removed {trimmed_count - 1} duplicate(s)")
