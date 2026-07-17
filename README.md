# AI Compiler Assistant

A Spring Boot backend (plus an optional React frontend) for exactly this flow:
**write code → run it → if there's an error, ask the AI chatbot to explain/help fix it.**

No question generation, no test cases, no Docker required for the app itself.

---

## Tech stack / versions used

| Component | Version |
|---|---|
| Java (JDK) | **21** |
| Build tool | **Gradle 8.6.0** |
| Spring Boot | **3.3.2** |
| Node.js | 18+ (only needed for the optional React frontend) |
| Frontend | React + Vite |
| Code execution | Judge0 (self-hosted instance, not RapidAPI/Docker) |
| AI provider | OpenRouter (OpenAI-compatible API) |

---

## Project layout

```
ai-compiler-assistant/
├── build.gradle                        # Gradle build config
├── settings.gradle
├── gradlew / gradlew.bat               # Gradle wrapper — no local Gradle install required
├── gradle/wrapper/
├── src/main/java/com/aicompiler/
│   ├── AiCompilerAssistantApplication.java
│   ├── config/WebClientConfig.java     # WebClient beans (Judge0 + OpenRouter)
│   ├── compiler/                       # code execution
│   │   ├── Judge0Client.java           # calls a self-hosted Judge0 instance
│   │   ├── CompilerService.java
│   │   ├── CompilerController.java     # POST /api/compiler/run
│   │   └── dto/
│   └── chatbot/                        # "help me fix this error" AI chatbot
│       ├── ErrorParserService.java     # regex-based error/line detection
│       ├── LlmClient.java              # OpenRouter (OpenAI-compatible) API wrapper
│       ├── PromptTemplates.java
│       ├── ChatbotService.java
│       ├── ChatbotController.java      # POST /api/chatbot/chat
│       └── dto/
├── src/main/resources/application.properties
└── frontend/                           # optional React (Vite) UI
    ├── src/App.jsx                     # multiple compiler tabs, each with its own AI Help chat tabs
    ├── src/api.js
    ├── src/App.css
    └── vite.config.js                  # dev-proxies /api/* to localhost:8080
```

---

## Prerequisites

- **Java 21** (JDK) — verify with `java -version`
- **Gradle wrapper is bundled** (`gradlew.bat` / `gradlew`) — no local Gradle install required.
  If it's missing, install Gradle once and run `gradle wrapper --gradle-version 8.8` to regenerate it.
- **Node.js 18+** (only needed if you're running the optional React frontend)
- An **OpenRouter** API key (free tier available) — get one at https://openrouter.ai/keys
- Access to a **Judge0** instance for code execution. This project does not use Docker or
  RapidAPI/Judge0-CE-on-RapidAPI — it talks to a self-hosted Judge0 server over HTTP
  (see `Judge0Client.java` / `WebClientConfig.java` for the base URL).

---

## 1. Set your AI key

PowerShell:
```powershell
$env:OPENROUTER_API_KEY="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"

# check it's set:
echo $env:OPENROUTER_API_KEY
```
This only lasts for the current terminal session. To avoid re-setting it every time, add
`OPENROUTER_API_KEY` as a permanent environment variable (Windows: search "Environment
Variables" → *Edit environment variables for your account*), then restart your terminal/IDE.

`application.properties` reads it via:
```properties
ai.api.base-url=https://openrouter.ai/api/v1
ai.api.key=${OPENROUTER_API_KEY:}
ai.api.model=openrouter/free
```
`openrouter/free` is OpenRouter's own router model that picks a free underlying model per
request — swap it for any specific model id from https://openrouter.ai/models if you want a
fixed model instead.

---

## 2. Build and run the backend (Gradle)

From the project root:

```powershell
# Build (compiles + runs tests)
.\gradlew.bat clean build

# Run the app
.\gradlew.bat bootRun
```

Once you see `Started AiCompilerAssistantApplication in X.XXX seconds`, the app is live on
`http://localhost:8080`. Swagger UI (for testing the API directly, no frontend needed) is at
`http://localhost:8080/swagger-ui/index.html`.

To stop the server: `Ctrl+C` in that terminal.

---

## 3. (Optional) Run the React frontend

In a **separate terminal** (keep the backend running in the first one):

```powershell
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`. The dev server proxies `/api/*` calls to `http://localhost:8080`,
so keep the backend running at the same time — no CORS setup needed.

### Running both together

| Terminal | Command | Runs on |
|---|---|---|
| 1 (backend) | `.\gradlew.bat bootRun` | `localhost:8080` |
| 2 (frontend) | `npm run dev` | `localhost:5173` |

---

## 4. Try it (via curl / Swagger)

**Run code (intentionally broken Java, to trigger an error):**
```bash
curl -X POST http://localhost:8080/api/compiler/run \
  -H "Content-Type: application/json" \
  -d '{"sourceCode":"public class Main { public static void main(String[] a){ int x = ; } }","language":"java","stdin":""}'
```
`language` is one of: `java`, `python`, `javascript`, `c`, `cpp` (see `LANGUAGE_IDS` in
`Judge0Client.java` to add more — each needs a matching Judge0 `language_id`).

**Ask the AI chatbot to explain the error:**
```bash
curl -X POST http://localhost:8080/api/chatbot/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"s1","code":"public class Main { public static void main(String[] a){ int x = ; } }","language":"java","compilerOutput":"error: illegal start of expression","userMessage":null}'
```

---

## How the flow works

1. User writes code in the editor, clicks **Run**.
2. Frontend calls `POST /api/compiler/run`.
3. `CompilerService` checks the `status` field in the response:
   - `"Accepted"` → just show `stdout`, no AI call made.
   - `"Compilation Error"` / `"Runtime Error"` → `CompilerService` **automatically** calls the
     chatbot itself with the same code + `compilerOutput`/`stderr`, and returns the AI's
     explanation in the `aiReply` field — the frontend never has to make a second call for the
     first explanation.
   - `"Execution Error"` / `"Unsupported Language"` / `"Unknown Error"` / `"Timed Out"` → an
     infrastructure-level failure (Judge0 unreachable, bad language, etc.), returned as HTTP
     `503` instead of `200` so it's distinguishable from a normal code error.
4. The user can keep typing follow-up questions into the same chat panel via
   `POST /api/chatbot/chat` — just keep reusing the same `sessionId` so the AI remembers the
   conversation.
5. The AI is scoped to **code/programming questions only** — it will not answer questions
   about itself, the underlying model/provider, server, or infrastructure (see
   `PromptTemplates.java` / `ChatbotService.java`).

---

## Troubleshooting

**`401 Unauthorized from POST https://openrouter.ai/api/v1/chat/completions`**
(shows up in the server log as a `WebClientResponseException$Unauthorized`, thrown from
`LlmClient.send` → `ChatbotService.sendAndRecord` → `ChatbotService.chat`)

This means the request reached OpenRouter but the API key was missing, malformed, or invalid.
To fix:
1. Confirm the key is actually set in the terminal you launched the app from:
   ```powershell
   echo $env:OPENROUTER_API_KEY
   ```
   If this prints nothing, the app started without a key — `ai.api.key=${OPENROUTER_API_KEY:}`
   silently falls back to an empty string instead of failing at startup.
2. Make sure the key is valid and active at https://openrouter.ai/keys (keys can be revoked or
   expire).
3. Re-set it and **restart the app** — environment variables are only read once, at process
   startup, so setting the variable after `.\gradlew.bat bootRun` is already running has no effect.
4. If you added it as a permanent user/system environment variable, restart your terminal/IDE
   (and VS Code, if it's not picking up the new value) so the new process inherits it.

**Gradle build fails with "Cannot find a Java installation... {languageVersion=21}"**
Gradle's toolchain resolver couldn't find a matching JDK. Install JDK 21, or edit `build.gradle`
and change `JavaLanguageVersion.of(21)` to match whatever JDK you actually have installed
(check with `java -version`).

**Compiler results never come back / requests hang**
Judge0 is polled synchronously (`Thread.sleep` between attempts, up to `MAX_POLL_ATTEMPTS` ×
`POLL_DELAY_MS` ≈ 15 seconds) — if the self-hosted Judge0 instance is slow or unreachable, the
request will block for that long before `Judge0Client` gives up and returns an `"Execution
Error"` status. Check that your configured Judge0 instance is reachable from the machine
running the backend.

**Frontend loads but every action fails / CORS errors**
Make sure the backend is running on `localhost:8080` *before* starting `npm run dev` — the Vite
dev server proxies `/api/*` there, it doesn't start the backend itself.

**VS Code shows stale/incorrect compile errors in the Problems panel**
This is usually a stale Java Language Server cache, not a real error. Run
`Ctrl+Shift+P` → **Java: Clean Java Language Server Workspace** → **Reload and delete**, then
wait for the status bar to show **Java: Ready**.

---

## Notes / next steps

- The frontend supports multiple **compiler tabs**, and within each compiler tab, multiple
  **AI Help chat tabs** — clicking "New chat" opens a fresh conversation without discarding the
  previous one, so several parallel chat threads (each with its own backend `sessionId`) can
  exist per compiler tab.
- Chat history is stored in memory (`ConcurrentHashMap`) — resets if the server restarts.
  Fine for now; swap for a database table later if you want persistence.
- The chatbot call inside `CompilerService` is wrapped in a try/catch — if OpenRouter has a
  transient failure (timeout, connection reset, rate limit), the compiler result is still
  returned with a friendly `aiReply` fallback message instead of a 500. A `401 Unauthorized`
  (bad/missing API key) is the most common cause of these failures in practice — see
  **Troubleshooting** above.
- Judge0 is called via the async token flow (`POST /submissions` → poll `GET
  /submissions/{token}`), not the `wait=true` synchronous mode — this matches the verified
  behavior of the self-hosted instance this project targets.
- No authentication yet — add Spring Security before this is exposed beyond your own machine.
