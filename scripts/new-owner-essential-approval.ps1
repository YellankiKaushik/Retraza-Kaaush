param(
    [Parameter(Mandatory = $true)][string]$AppOrigin,
    [switch]$Approve
)
$ErrorActionPreference = 'Stop'
if (-not $Approve) { throw 'Owner only: review the hosted acceptance checkpoint, then run manually with -Approve. No approval was created.' }
$origin = [uri]$AppOrigin
if ($origin.Scheme -ne 'https' -or $origin.Host -notmatch '^retraza-kaaush-[a-z0-9-]+\.vercel\.app$' -or $origin.AbsolutePath -ne '/' -or $origin.Query -or $origin.Fragment) {
    throw 'Use the exact reviewed independent Retraza Preview origin only.'
}
$root = Split-Path -Parent $PSScriptRoot
$proofPath = Join-Path $root 'logs/shared-schema-verification.json'
$proof = Get-Content -LiteralPath $proofPath -Raw | ConvertFrom-Json
$age = [DateTimeOffset]::UtcNow - [DateTimeOffset]::Parse($proof.checkedAt)
if ($proof.projectRef -ne 'usvopldwiwzlvoqawvcu' -or -not $proof.compatible -or -not $proof.catalogVerified -or $age.TotalHours -lt 0 -or $age.TotalHours -ge 24) {
    throw 'Fresh compatible catalog evidence is required. Refresh read-only evidence, never migrations.'
}
$runId = [guid]::NewGuid().ToString()
$approval = [ordered]@{
    projectRef = 'usvopldwiwzlvoqawvcu'
    acknowledgement = 'I approve temporary test records in shared project usvopldwiwzlvoqawvcu.'
    scope = 'golden-live'
    workflow = 'essential'
    runId = $runId
    maxUsers = 2
    maxAiOperations = 6
    expiresAt = [DateTimeOffset]::UtcNow.AddMinutes(45).ToString('o')
    schemaEvidenceFile = $proofPath
    schemaEvidenceSha256 = (Get-FileHash -LiteralPath $proofPath -Algorithm SHA256).Hash.ToLowerInvariant()
    appOrigin = $origin.GetLeftPart([System.UriPartial]::Authority)
}
$path = Join-Path $root "logs/owner-golden-live-$runId.approval.json"
$bytes = [Text.UTF8Encoding]::new($false).GetBytes(($approval | ConvertTo-Json -Depth 4))
$stream = [IO.File]::Open($path, [IO.FileMode]::CreateNew)
try { $stream.Write($bytes, 0, $bytes.Length) } finally { $stream.Dispose() }
Write-Output "Owner approval created: $path"
Write-Output 'No test, account creation, inference, database write or deployment was executed. The harness must revalidate evidence, manifest, expiry, origin and unused run lock before any live run.'
