# /spec-check

Usage: /spec-check [filepath]

Action:
1. Read the file at [filepath]
2. Identify which spec document(s) govern this file
3. Cross-reference implementation against spec
4. Output in this exact format:

SPEC CHECK: [filepath]
Governed by: [spec document name + section]

COMPLIANT:
- [list what matches]

DEVIATION:
- [exact mismatch — quote spec line]

ACTION REQUIRED:
- [precise fix needed]

If fully compliant output: ALL CLEAR — no deviations found.
