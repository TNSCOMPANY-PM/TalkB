@echo off
rem Landing refresh (scripts/weekly-refresh.mjs). Task Scheduler runs this via run-hidden.vbs (no console window, 2026-11-06).
rem Output goes to _internal\task.out so a killed run leaves a trace.
cd /d C:\Users\user1\Desktop\talkB\TalkB-landing
echo [%date% %time%] start>> _internal\task.out
"C:\Program Files\nodejs\node.exe" scripts\weekly-refresh.mjs >> _internal\task.out 2>&1
>> _internal\task.out echo [%date% %time%] exit %errorlevel%
