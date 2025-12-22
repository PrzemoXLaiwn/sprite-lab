with open('src/app/api/variations/route.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove all merge conflict markers
content = content.replace('=======\n', '')
content = content.replace('<<<<<<< SEARCH\n', '')
content = content.replace('>>>>>>> REPLACE\n', '')

# Remove duplicate lines
lines = content.split('\n')
cleaned_lines = []
skip_until_line = -1

for i, line in enumerate(lines):
    if i < skip_until_line:
        continue
        
    # Skip duplicate "if (numVariations < 1 || numVariations > 4)" blocks
    if 'if (numVariations < 1 || numVariations > 4)' in line:
        # Check if this is a duplicate
        if any('if (numVariations < 1 || numVariations > 4)' in cleaned_lines[j] for j in range(max(0, len(cleaned_lines)-20), len(cleaned_lines))):
            # Skip this duplicate block (next 5 lines)
            skip_until_line = i + 6
            continue
    
    # Skip lines that are just "} catch (sizeError) {" if we already have the full catch block
    if line.strip() == '} catch (sizeError) {':
        # Check if we already have a catch block nearby
        recent = '\n'.join(cleaned_lines[-10:])
        if 'catch (sizeError)' in recent:
            skip_until_line = i + 3  # Skip the duplicate catch
            continue
    
    cleaned_lines.append(line)

content = '\n'.join(cleaned_lines)

with open('src/app/api/variations/route.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed! Removed merge conflicts and duplicates")
