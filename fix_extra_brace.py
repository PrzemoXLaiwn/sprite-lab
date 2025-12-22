with open('src/app/api/edit-image/route.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    # Skip the extra } after const trimmedPrompt
    if i > 0 and 'const trimmedPrompt = editPrompt.trim();' in lines[i-1] and line.strip() == '}':
        print(f"Removing extra brace at line {i+1}")
        continue
    new_lines.append(line)

with open('src/app/api/edit-image/route.ts', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Fixed! Removed extra closing brace")
