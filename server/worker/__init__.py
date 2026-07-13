"""AI Agent Office — worker package (workspace + command execution).

MVP is fully mock: no real shell commands or filesystem mutation happen. The
class structure mirrors what a real VPS worker would expose so the switch to
real execution is a drop-in.
"""
