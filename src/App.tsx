import { useEffect, useMemo, useRef, useState } from "react";
import { parkLabel } from "./data/nearbyParks";
import { Generating } from "./components/Generating";
import { Landing } from "./components/Landing";
import { TripPoster } from "./components/TripPoster";
import { heuristicEstimate, requestFromPlan } from "./lib/estimateCost";
import { defaultStartDate } from "./lib/format";
import { generateTrip } from "./lib/generateTrip";
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
  const bootstrapped = useRef(false);

  const goHome = () => {
    clearTripUrl();
    document.title = DEFAULT_TITLE;
    setInput((current) => ({ ...current, startDate: defaultStartDate() }));
    setStatus("form");
  };

  const parkName = useMemo(
    () => parkLabel(input.parkId, input.alsoParkId),
    [input.parkId, input.alsoParkId],
  );

  const run = async (next = input) => {
    setInput(next);
    setError(null);
    setStatus("generating");
    const started = Date.now();
    try {
      const result = await generateTrip(next);
      result.cost = heuristicEstimate(requestFromPlan(result, next));
      const wait = Math.max(0, 1400 - (Date.now() - started));
      await sleep(wait);
      writeTripUrl(next);
      setPlan(result);
      setStatus("ready");
    } catch {
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
    void run(parsed);
  }, []);

  if (status === "generating") {
    return <Generating parkName={parkName} onHome={goHome} />;
  }

  if (status === "ready" && plan) {
    return <TripPoster plan={plan} onReset={goHome} />;
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
          void run(DEMO);
        }}
      />
    </>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
