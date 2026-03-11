# Systemd (WSL2) Notes

These unit files are optional. Use them only if systemd is enabled in your WSL2 distro.

Install (inside WSL2):
1. Copy files to ~/.config/systemd/user/
2. Run:
   - systemctl --user daemon-reload
   - systemctl --user enable --now illuvrse-ops.timer

If systemd is not enabled, run `python3 ops/orchestrator.py` manually or via Task Scheduler.
