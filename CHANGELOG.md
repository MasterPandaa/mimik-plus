# Changelog

All notable changes to Mimik will be documented in this file.

## [Unreleased]

### Added
- **Google Gemini Provider**: Added support for Google Gemini as a built-in AI provider using Google's official OpenAI-compatible REST endpoint (`https://generativelanguage.googleapis.com/v1beta/openai`).
  - Supported models: `gemini-3.8-flash`, `gemini-3.7-flash`, `gemini-3.6-flash`.
  - Support for custom model input selection.

### Fixed
- **Custom Provider Key Check & Inference Fallback**:
  - Fixed logic bug where valid custom provider servers failed validation if inference probing returned HTTP 400/500, even when the model was present in the `/models` catalog.
  - Added inference probe fallback retry without `max_tokens` (resolves issues with reasoning and modern OpenAI-compatible endpoints).
  - Fixed custom provider state synchronization in `SettingsView.tsx` where API keys were wiped or not saved during provider switching or form editing.
  - Fixed error when initializing custom providers without API keys (e.g. local Ollama / LM Studio instances).
  - Enabled API key checking in onboarding wizard for custom providers.
