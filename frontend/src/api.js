const API_BASE = ""; // same-origin as backend; set to "http://localhost:8080" if served separately

/**
 * POSTs JSON to the given path and returns the parsed JSON body.
 * Throws a readable Error if the server responds with a non-2xx status,
 * so every caller gets the same error-handling behavior for free.
 */
export async function postJson(path, payload) {
    const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server returned ${res.status}: ${text.slice(0, 200)}`);
    }

    return res.json();
}

/** True when a compiler result's status string means "ran successfully". */
export function isAccepted(status) {
    return String(status || "").toLowerCase() === "accepted";
}