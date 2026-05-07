#!/usr/bin/env bash
OS="$(uname -s)"
AUDIT_COMMAND="/audit-weekly"
send_command() {
    case "$OS" in
        Darwin) osascript -e "tell application \"Antigravity\" to activate" -e "delay 0.5" -e "tell application \"System Events\" to keystroke \"$AUDIT_COMMAND\" & return" ;;
        Linux) xdotool search --name "Antigravity" windowactivate --sync type "$AUDIT_COMMAND" key Return ;;
        CYGWIN*|MINGW*|MSYS*) powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('$AUDIT_COMMAND{ENTER}')" ;;
        *) echo "SO não suportado"; exit 1 ;;
    esac
}
send_command
