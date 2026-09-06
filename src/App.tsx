import { useEffect, useMemo, useRef, useState } from "react";
import { parkLabel } from "./data/nearbyParks";
import { Generating } from "./components/Generating";
import { Landing } from "./components/Landing";
import { TripPoster } from "./components/TripPoster";
import { heuristicEstimate, requestFromPlan } from "./lib/estimateCost";
import { defaultStartDate } from "./lib/format";
import { generateTrip } from "./lib/generateTrip";
import {
  trackGenerateFailed,
  trackGenerateTrip,
  trackPlanAnother,
  type GenerateSource,
} from "./lib/analytics";
import { noteTripGenerated, resetFeedbackPrompt } from "./lib/tripFeedback";
import { clearTripUrl, tripFromSearch, writeTripUrl } from "./lib/tripUrl";
import type { TripInput, TripPlan } from "./types";

const DEMO: TripInput = {
  home: "New York, NY",
  parkId: "grand-canyon",
  adults: 2,
  kids: 2,
  days: 7,
  startDate: defaultStartDate(),
};

const DEFAULT_TITLE = "Rimfold — National Park Trip Planner";

export function App() {
  const [input, setInput] = useState<TripInput>({
    home: "",
    parkId: "grand-canyon",
    adults: 2,
    kids: 2,
    days: 7,
    startDate: defaultStartDate(),
  });
  const [status, setStatus] = useState<"form" | "generating" | "ready">("form");
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [returning, setReturning] = useState(false);
  const [forceFeedback, setForceFeedback] = useState(false);
  const bootstrapped = useRef(false);

  const goHome = () => {
    trackPlanAnother();
    clearTripUrl();
    document.title = DEFAULT_TITLE;
    setInput((current) => ({ ...current, startDate: defaultStartDate() }));
    setStatus("form");
  };

  const parkName = useMemo(
    () => parkLabel(input.parkId, input.alsoParkId),
    [input.parkId, input.alsoParkId],
  );

  const run = async (next = input, source: GenerateSource = "form") => {
    setInput(next);
    setError(null);
    setStatus("generating");
    const started = Date.now();
    try {
      const result = await generateTrip(next);
      result.cost = heuristicEstimate(requestFromPlan(result, next));
      const wait = Math.max(0, 1400 - (Date.now() - started));
      await sleep(wait);
      const showFeedback = new URLSearchParams(window.location.search).get("feedback") === "1";
      if (showFeedback) resetFeedbackPrompt();
      setForceFeedback(showFeedback);
      writeTripUrl(next);
      trackGenerateTrip(next, source, {
        flying: result.flying,
        parkName: result.parkName,
      });
      setReturning(noteTripGenerated());
      setPlan(result);
      setStatus("ready");
    } catch {
      trackGenerateFailed(next.parkId);
      await sleep(600);
      setError("Could not generate that trip. Check the home city and try again.");
      setStatus("form");
    }
  };

  useEffect(() => {
    if (bootstrapped.current) return;
    const parsed = tripFromSearch();
    if (!parsed) return;
    bootstrapped.current = true;
    void run(parsed, "shared_link");
  }, []);

  if (status === "generating") {
    return <Generating parkName={parkName} onHome={goHome} />;
  }

  if (status === "ready" && plan) {
    return (
      <TripPoster
        plan={plan}
        trip={input}
        returning={returning}
        forceFeedback={forceFeedback}
        onReset={goHome}
      />
    );
  }

  return (
    <>
      {error ? (
        <div className="fixed top-4 left-1/2 z-20 -translate-x-1/2 rounded-full bg-[#9f1239] px-4 py-2 text-sm text-white shadow">
          {error}
        </div>
      ) : null}
      <Landing
        value={input}
        onChange={setInput}
        onSubmit={() => void run()}
        onDemo={() => {
          void run(DEMO, "demo");
        }}
      />
    </>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
