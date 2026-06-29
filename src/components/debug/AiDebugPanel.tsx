import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { validateAiEnvironmentFn } from "@/lib/ai.functions";
import { runLiveAiTest, type LiveAiTestResult } from "@/lib/geminiApi";

interface Props {
  imageDataUrl?: string | null;
}

type EnvStatus = Awaited<ReturnType<typeof validateAiEnvironmentFn>>;

export function AiDebugPanel({ imageDataUrl }: Props) {
  const [env, setEnv] = useState<EnvStatus | null>(null);
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LiveAiTestResult | null>(null);

  useEffect(() => {
    validateAiEnvironmentFn().then(setEnv).catch(() => setEnv(null));
  }, []);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const r = await runLiveAiTest(imageDataUrl ?? undefined);
      setResult(r);
    } catch (e) {
      setResult({
        env: { geminiKeyLoaded: false, groqKeyLoaded: false },
        model: "unknown",
        request: { url: "", payloadBytes: 0, promptChars: 0, imageBytes: 0, mimeType: "" },
        response: { sent: false, received: false, httpStatus: 0, ok: false, rawBody: "", durationMs: 0 },
        parsed: { json: null, parseError: null },
        validator: { accepted: false, reason: "client_threw", detectedObject: "", isAgricultural: false, confidence: 0 },
        exception: { message: String((e as Error)?.message ?? e), stack: String((e as Error)?.stack ?? "") },
      });
    } finally {
      setLoading(false);
    }
  };

  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div className="flex justify-between gap-2 text-[11px] py-0.5 border-b border-border/40">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono text-right break-all">{v}</span>
    </div>
  );

  const bool = (b: boolean) => (
    <span className={b ? "text-emerald-600" : "text-destructive"}>{b ? "true" : "false"}</span>
  );

  return (
    <div className="glass-card rounded-2xl p-4 mt-4 text-xs">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex justify-between items-center font-bold text-primary"
      >
        <span>AI Debug Panel</span>
        <span className="text-[10px] text-muted-foreground">{open ? "hide" : "show"}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Environment</div>
            <Row k="GEMINI_API_KEY loaded" v={env ? bool(env.gemini) : "…"} />
            <Row k="GROQ_API_KEY loaded" v={env ? bool(env.groq) : "…"} />
            <Row k="Gemini model" v={env?.models.gemini ?? "…"} />
            <Row k="Groq text model" v={env?.models.groqText ?? "…"} />
            <Row k="Image attached" v={bool(Boolean(imageDataUrl))} />
          </div>

          <button
            onClick={run}
            disabled={loading}
            className="w-full min-touch bg-accent text-accent-foreground rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 py-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Run Live AI Test
          </button>

          {result && (
            <div className="space-y-3">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Request</div>
                <Row k="Sent" v={bool(result.response.sent)} />
                <Row k="URL" v={result.request.url || "—"} />
                <Row k="Payload bytes" v={result.request.payloadBytes} />
                <Row k="Prompt chars" v={result.request.promptChars} />
                <Row k="Image bytes" v={result.request.imageBytes} />
                <Row k="MIME" v={result.request.mimeType || "—"} />
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Response</div>
                <Row k="Received" v={bool(result.response.received)} />
                <Row
                  k="HTTP status"
                  v={
                    <span
                      className={
                        result.response.ok
                          ? "text-emerald-600"
                          : result.response.httpStatus === 0
                            ? "text-muted-foreground"
                            : "text-destructive"
                      }
                    >
                      {result.response.httpStatus || "no response"}
                    </span>
                  }
                />
                <Row k="Duration (ms)" v={result.response.durationMs} />
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                  Raw response body
                </div>
                <pre className="max-h-48 overflow-auto rounded-lg bg-secondary/60 p-2 text-[10px] whitespace-pre-wrap break-words">
                  {result.response.rawBody || "(empty)"}
                </pre>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Validator</div>
                <Row k="Accepted" v={bool(result.validator.accepted)} />
                <Row k="Reason" v={result.validator.reason} />
                <Row k="Detected object" v={result.validator.detectedObject || "—"} />
                <Row k="Is agricultural" v={bool(result.validator.isAgricultural)} />
                <Row k="Confidence" v={`${Math.round(result.validator.confidence * 100)}%`} />
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                  Parsed JSON
                </div>
                <pre className="max-h-40 overflow-auto rounded-lg bg-secondary/60 p-2 text-[10px] whitespace-pre-wrap break-words">
                  {result.parsed.parseError
                    ? `parse error: ${result.parsed.parseError}`
                    : result.parsed.json
                      ? JSON.stringify(result.parsed.json, null, 2)
                      : "(none)"}
                </pre>
              </div>

              {result.exception && (
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-destructive mb-1">
                    Exception
                  </div>
                  <Row k="Message" v={result.exception.message} />
                  <pre className="max-h-40 overflow-auto rounded-lg bg-destructive/10 p-2 text-[10px] whitespace-pre-wrap break-words">
                    {result.exception.stack}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
