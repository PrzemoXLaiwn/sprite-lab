with open('src/app/api/edit-image/route.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip_next_trimmed = False

for i, line in enumerate(lines):
    # Skip the trimmedPrompt that's inside the try-catch block
    if 'const trimmedPrompt = editPrompt.trim();' in line:
        # Check if we're inside try-catch (look back for 'catch')
        prev_10_lines = ''.join(lines[max(0, i-10):i])
        if 'catch (sizeError)' in prev_10_lines and '// CORE LOGIC' not in ''.join(lines[i:min(len(lines), i+5)]):
            # This is the one inside try-catch, skip it
            print(f"Skipping line {i+1}: inside try-catch block")
            continue
    
    new_lines.append(line)

with open('src/app/api/edit-image/route.ts', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Fixed! Removed trimmedPrompt from inside try-catch block")
