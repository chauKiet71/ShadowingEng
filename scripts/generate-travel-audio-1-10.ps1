$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$lessonsPath = Join-Path $root 'client\src\data\lessons.json'
$outputDir = Join-Path $root 'client\public\audio'

$targetIds = @(
  'lesson-01','lesson-02','lesson-03','lesson-04','lesson-05',
  'lesson-06','lesson-07','lesson-08','lesson-09','lesson-10'
)

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$lessons = Get-Content $lessonsPath -Raw -Encoding UTF8 | ConvertFrom-Json
Add-Type -AssemblyName System.Speech

foreach ($lesson in $lessons) {
  if ($targetIds -notcontains $lesson.id) { continue }

  $text = ($lesson.sentences | ForEach-Object { $_.english }) -join ' '
  $outFile = Join-Path $outputDir ("{0}.wav" -f $lesson.id)

  $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $voice = $synth.GetInstalledVoices() |
    Where-Object { $_.VoiceInfo.Culture.Name -like 'en-*' } |
    Select-Object -First 1

  if ($voice) {
    $synth.SelectVoice($voice.VoiceInfo.Name)
    Write-Host "Voice: $($voice.VoiceInfo.Name)"
  }

  $synth.Rate = -1
  $synth.SetOutputToWaveFile($outFile)
  $synth.Speak($text)
  $synth.Dispose()

  Write-Host "Generated $outFile"
}

Write-Host "Done. Generated $($targetIds.Count) files."
