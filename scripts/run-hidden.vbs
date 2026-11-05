' Runs run-weekly-refresh.cmd with no console window (2026-11-06).
' Two scheduled runs on 11/5 died with 0xC000013A (console closed) right after start.
CreateObject("WScript.Shell").Run """C:\Users\user1\Desktop\talkB\TalkB-landing\scripts\run-weekly-refresh.cmd""", 0, True
