// Tiny OpenAI-compatible mock so the worker can execute tasks end-to-end
// during UAT without a paid provider. Returns a canned completion + usage.
import http from "node:http";

const PORT = process.env.MOCK_LLM_PORT || 11434;

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    if (req.method === "GET" && req.url.includes("/models")) {
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({ data: [{ id: "mock-gpt", object: "model" }] }));
    }
    if (req.method === "POST" && req.url.includes("/chat/completions")) {
      let prompt = "";
      try { prompt = JSON.parse(body).messages?.slice(-1)[0]?.content ?? ""; } catch {}
      const text = `MOCK RESPONSE — ประมวลผลคำสั่งเรียบร้อย: "${String(prompt).slice(0, 80)}"`;
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({
        id: "chatcmpl-mock", object: "chat.completion", model: "mock-gpt",
        choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
        usage: { prompt_tokens: 42, completion_tokens: 58, total_tokens: 100 },
      }));
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  });
});

server.listen(PORT, () => console.log(`mock-llm listening on http://localhost:${PORT}`));
