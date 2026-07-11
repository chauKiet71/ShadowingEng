$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$lessonsPath = Join-Path $root 'client\src\data\lessons.json'
$outputDir = Join-Path $root 'client\public\audio'

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$lessons = Get-Content $lessonsPath -Raw -Encoding UTF8 | ConvertFrom-Json

Add-Type -AssemblyName System.Speech

foreach ($lesson in $lessons) {
  $text = ($lesson.sentences | ForEach-Object { $_.english }) -join ' '
  $outFile = Join-Path $outputDir ("{0}.wav" -f $lesson.id)

  $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $voice = $synth.GetInstalledVoices() |
    Where-Object { $_.VoiceInfo.Culture.Name -like 'en-*' } |
    Select-Object -First 1

  if ($voice) {
    $synth.SelectVoice($voice.VoiceInfo.Name)
  }

  $synth.Rate = -1
  $synth.SetOutputToWaveFile($outFile)
  $synth.Speak($text)
  $synth.Dispose()

  Write-Host "Generated $outFile"
}

Write-Host "Done. $($lessons.Count) audio files in $outputDir"
