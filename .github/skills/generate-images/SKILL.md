---
name: generating-images
description: Generates images using Azure AI image generation service. Use when the user asks to create, generate, or produce images, illustrations, photos, or visual content from text prompts. Also use when the user mentions image generation, AI art, or visual content creation.
---

# Generating Images

Generates images via Azure AI image generation endpoint using text prompts.

## Quick Start

Run the PowerShell script with a prompt:

```powershell
.\scripts\Invoke-ImageGeneration.ps1 -Prompt "A photograph of a red fox in an autumn forest"
```

## Parameters

| Parameter   | Required | Default | Description                                    |
|-------------|----------|---------|------------------------------------------------|
| Prompt      | Yes      | -       | Text description of the image to generate      |
| Width       | No       | 1024    | Image width in pixels (1-4096)                 |
| Height      | No       | 1024    | Image height in pixels (1-4096)                |
| OutputFile  | No       | generated_image.png | Path to save the generated image     |
| Endpoint    | No       | https://personal-voice-demo.services.ai.azure.com/mai/v1/images/generations | API endpoint |
| ApiKey      | No       | $env:AZURE_API_KEY | API key for authentication          |

## Examples

```powershell
# Basic usage
.\scripts\Invoke-ImageGeneration.ps1 -Prompt "A red fox in autumn forest"

# Custom dimensions
.\scripts\Invoke-ImageGeneration.ps1 -Prompt "A cartoon cat" -Width 512 -Height 512 -OutputFile "cat.png"

# Verbose output
.\scripts\Invoke-ImageGeneration.ps1 -Prompt "Space station" -Verbose
```

## Requirements

- PowerShell 5.1 or later (PowerShell 7 recommended)
- `AZURE_API_KEY` environment variable set, or pass `-ApiKey`

## Workflow

1. Verify the prompt is provided
2. Call the Azure AI image generation endpoint
3. Decode the base64 response
4. Save the image to the specified output path
