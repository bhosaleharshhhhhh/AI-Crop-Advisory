---
name: Cropwise AI integration
description: Provider and validation constraints for Cropwise's Gemini-backed advisory features.
---

The app uses the official `@google/genai` SDK from the API server with `GEMINI_API_KEY` kept in Replit Secrets. Gemini output is requested as JSON and validated before database writes.

**Why:** The managed Gemini integration may be unavailable when the workspace cannot upgrade, but crop diagnosis and market guidance are core product flows.

**How to apply:** Keep AI initialization and prompts server-only, preserve `responseMimeType: "application/json"` plus a response schema, and do not add the key to client env vars or source files.