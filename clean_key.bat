@echo off
set KEY=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
set PLACEHOLDER=import.meta.env.VITE_GROQ_API_KEY

if exist src\services\aiService.js (
  powershell -Command "(Get-Content 'src\services\aiService.js') -replace '''%KEY%''', 'import.meta.env.VITE_GROQ_API_KEY' | Set-Content 'src\services\aiService.js'"
)
if exist src\services\adminAiService.js (
  powershell -Command "(Get-Content 'src\services\adminAiService.js') -replace '''%KEY%''', 'import.meta.env.VITE_GROQ_API_KEY' | Set-Content 'src\services\adminAiService.js'"
)
