file = 'src/components/shared/attendance-scanner.tsx'
with open(file, 'r') as f:
    text = f.read()

def check_balance(text):
    stack = []
    pairs = {')': '(', '}': '{', ']': '>', '>': '<'} # wait, let's just do () {} []
    for i, char in enumerate(text):
        if char in "({[":
            stack.append((char, i))
        elif char in ")}]":
            if not stack:
                return f"Unmatched {char} at index {i}"
            top, top_i = stack.pop()
            if (char == ')' and top != '(') or \
               (char == '}' and top != '{') or \
               (char == ']' and top != '['):
                return f"Mismatched {char} at {i}, expected match for {top} at {top_i}"
    if stack:
        top, top_i = stack.pop()
        # Find line number
        lines = text[:top_i].split('\n')
        return f"Unclosed {top} at line {len(lines)}"
    return "Balanced!"

print(check_balance(text))
