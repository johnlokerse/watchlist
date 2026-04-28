<#
.SYNOPSIS
    Generates an image using Azure AI image generation service.

.DESCRIPTION
    Sends a prompt to the Azure AI image generation endpoint and saves the resulting image to a file.

.PARAMETER Prompt
    The text prompt describing the image to generate.

.PARAMETER Width
    The width of the generated image in pixels. Default is 1024.

.PARAMETER Height
    The height of the generated image in pixels. Default is 1024.

.PARAMETER OutputFile
    The path to save the generated image. Default is "generated_image.png".

.PARAMETER Endpoint
    The Azure AI image generation endpoint URL.

.PARAMETER ApiKey
    The API key for authentication. Defaults to the AZURE_API_KEY environment variable.

.EXAMPLE
    .\Invoke-ImageGeneration.ps1 -Prompt "A photograph of a red fox in an autumn forest"

.EXAMPLE
    .\Invoke-ImageGeneration.ps1 -Prompt "A cartoon cat" -Width 512 -Height 512 -OutputFile "cat.png"
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, HelpMessage = "Text prompt describing the image to generate")]
    [ValidateNotNullOrEmpty()]
    [string]$Prompt,

    [Parameter(Mandatory = $false)]
    [ValidateRange(1, 4096)]
    [int]$Width = 1024,

    [Parameter(Mandatory = $false)]
    [ValidateRange(1, 4096)]
    [int]$Height = 1024,

    [Parameter(Mandatory = $false)]
    [string]$OutputFile = "generated_image.png",

    [Parameter(Mandatory = $false)]
    [string]$Endpoint = "https://personal-voice-demo.services.ai.azure.com/mai/v1/images/generations",

    [Parameter(Mandatory = $false)]
    [string]$ApiKey = $env:AZURE_API_KEY
)

begin {
    if ([string]::IsNullOrWhiteSpace($ApiKey)) {
        throw "AZURE_API_KEY environment variable is not set. Provide -ApiKey or set the environment variable."
    }
}

process {
    $body = @{
        prompt = $Prompt
        width  = $Width
        height = $Height
        model  = "MAI-Image-2e-1"
    } | ConvertTo-Json -Compress

    $headers = @{
        "Content-Type" = "application/json"
        "api-key"      = $ApiKey
    }

    try {
        Write-Verbose "Sending request to $Endpoint"

        $response = Invoke-RestMethod -Uri $Endpoint -Method Post -Headers $headers -Body $body

        if (-not $response.data -or $response.data.Count -eq 0) {
            throw "No image data returned from the API."
        }

        $base64Json = $response.data[0].b64_json

        $outputDir = Split-Path $OutputFile -Parent
        if ($outputDir -and -not (Test-Path $outputDir)) {
            New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
        }

        [System.IO.File]::WriteAllBytes($OutputFile, [Convert]::FromBase64String($base64Json))

        Write-Information "Image saved to $OutputFile" -InformationAction Continue
    }
    catch {
        Write-Error "Failed to generate image: $_"
        throw
    }
}
