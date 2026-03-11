param(
  [string]$Distro = "Ubuntu"
)

wsl.exe -d $Distro -- python3 /home/ryan/ILLUVRSE/ops/orchestrator.py
