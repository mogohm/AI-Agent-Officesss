# References

Drop the composition reference image the worker uses as visual guidance here.

**Required for Batch 01:**
```
references/ai-agent-office-reference.png
```
This is the AI Agent Office reference image (the one you want the generated floor
to resemble). The worker verifies it exists and can be opened before generating;
if it's missing, generation stops with:

```
Reference image missing:
references/ai-agent-office-reference.png
```

Any PNG readable by Pillow works. Keep it in this folder so task JSON paths
(`references/…`) resolve from the project root.
