import { useId, useState, useTransition } from "react";

import type { ActorReactionRequest, ReactionResponse } from "../contracts/index.js";

function buildDraft(actorName: string, decisionPrompt: string): ActorReactionRequest {
  return {
    actor: {
      id: actorName || "pending-actor",
      name: actorName || "Unknown Actor",
      entityType: "character",
    },
    decisionPrompt,
    options: {
      includeAlternatives: true,
      maxSources: 5,
    },
  };
}

export function App() {
  const actorId = useId();
  const decisionId = useId();
  const [isPending, startTransition] = useTransition();
  const [actorName, setActorName] = useState("Eliana Tanaka");
  const [decisionPrompt, setDecisionPrompt] = useState(
    "Support a controversial infrastructure vote that may require public ratification.",
  );
  const [response, setResponse] = useState<ReactionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const draft = buildDraft(actorName, decisionPrompt);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const request = buildDraft(actorName, decisionPrompt);

    try {
      const apiResponse = await fetch("/api/actor-reaction", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!apiResponse.ok) {
        const payload = (await apiResponse.json()) as { error?: string };
        throw new Error(payload.error ?? "Unable to generate a reaction.");
      }

      const payload = (await apiResponse.json()) as ReactionResponse;
      startTransition(() => {
        setResponse(payload);
      });
    } catch (caughtError) {
      setResponse(null);
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Triathenum Workbench</p>
        <h1>Canon-first reactions, without the overwhelm.</h1>
        <p className="lede">
          A narrow first workflow for selecting an actor, proposing a decision, and reviewing a
          grounded response shape before the full integration work arrives.
        </p>
      </section>

      <section className="workspace">
        <form className="panel input-panel" onSubmit={handleSubmit}>
          <header className="panel-header">
            <h2>Decision Input</h2>
            <p>One actor, one prompt, one focused action.</p>
          </header>

          <label className="field" htmlFor={actorId}>
            <span>Actor</span>
            <input
              id={actorId}
              name="actor"
              type="text"
              value={actorName}
              onChange={(event) => setActorName(event.target.value)}
              placeholder="Eliana Tanaka"
            />
          </label>

          <label className="field" htmlFor={decisionId}>
            <span>Decision Prompt</span>
            <textarea
              id={decisionId}
              name="decisionPrompt"
              value={decisionPrompt}
              onChange={(event) => setDecisionPrompt(event.target.value)}
              rows={5}
            />
          </label>

          <div className="draft-block">
            <h3>Shared Contract Draft</h3>
            <pre>{JSON.stringify(draft, null, 2)}</pre>
          </div>

          <div className="actions">
            <button type="submit" disabled={isPending}>
              {isPending ? "Generating..." : "Generate Reaction"}
            </button>
            {error ? <p className="error">{error}</p> : null}
          </div>
        </form>

        <section className="results">
          <article className="panel">
            <header className="panel-header">
              <h2>Answer</h2>
              <p>Compact by default, with detail available when needed.</p>
            </header>
            {response ? (
              <>
                <p className="summary">{response.summary}</p>
                <div className="response-card">
                  <h3>Likely Reaction</h3>
                  <p>{response.likelyReaction.summary}</p>
                  <ul>
                    {response.likelyReaction.rationale.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <p className="placeholder">
                Submit a decision prompt to populate the first grounded reaction response.
              </p>
            )}
          </article>

          <article className="panel">
            <header className="panel-header">
              <h2>Grounding</h2>
              <p>Sources and canon basis stay visible instead of hidden behind confidence.</p>
            </header>
            {response ? (
              <div className="stack">
                <section>
                  <h3>Canon Basis</h3>
                  <ul>
                    {response.canonBasis.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
                <details open>
                  <summary>Sources</summary>
                  <ul className="sources">
                    {response.sources.map((source) => (
                      <li key={source.path}>
                        <strong>{source.title}</strong>
                        <span>{source.path}</span>
                        <p>{source.excerpt}</p>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            ) : (
              <p className="placeholder">Grounding appears here once the workflow returns source-backed evidence.</p>
            )}
          </article>

          <article className="panel">
            <header className="panel-header">
              <h2>Uncertainty</h2>
              <p>Inference and uncertainty are separate from canon-backed statements.</p>
            </header>
            {response ? (
              <div className="stack">
                <section>
                  <h3>Inferred Elements</h3>
                  <ul>
                    {response.inferredElements.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
                <details>
                  <summary>Alternatives</summary>
                  {response.alternatives.map((option) => (
                    <div className="response-card alt-card" key={option.summary}>
                      <h3>{option.summary}</h3>
                      <ul>
                        {option.rationale.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </details>
                <section>
                  <h3>Open Uncertainty</h3>
                  <ul>
                    {response.uncertainties.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              </div>
            ) : (
              <p className="placeholder">
                Inferred elements and unresolved questions appear here after a response is generated.
              </p>
            )}
          </article>
        </section>
      </section>
    </main>
  );
}
