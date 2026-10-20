@echo off
rem Landing refresh (scripts/weekly-refresh.mjs). Task Scheduler runs this twice a week: Mon 09:30 and Thu 09:30 (2026-10-20).
cd /d C:\Users\user1\Desktop\talkB\TalkB-landing
"C:\Program Files\nodejs\node.exe" scripts\weekly-refresh.mjs
