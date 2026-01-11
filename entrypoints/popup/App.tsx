import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getOrpc } from "@/shared/orpc/query";
import "./App.css";

const formatError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error);
};

function App() {
  const orpc = getOrpc();
  const queryClient = useQueryClient();
  const pingQuery = useQuery(orpc.ping.queryOptions());
  const counterQuery = useQuery(orpc.counter.get.queryOptions());
  const incrementMutation = useMutation(
    orpc.counter.increment.mutationOptions({
      onSuccess: (value) => {
        queryClient.setQueryData(orpc.counter.get.queryKey(), value);
      },
    })
  );

  return (
    <>
      <h1>oRPC + React Query</h1>
      <div className="card">
        <p>
          Ping:{" "}
          {pingQuery.isError
            ? `Error: ${formatError(pingQuery.error)}`
            : pingQuery.data ?? "..."}
        </p>
        <p>
          Counter:{" "}
          {counterQuery.isError
            ? `Error: ${formatError(counterQuery.error)}`
            : counterQuery.data ?? "..."}
        </p>
        <button
          type="button"
          onClick={() => incrementMutation.mutate(undefined)}
          disabled={incrementMutation.isPending}
        >
          {incrementMutation.isPending ? "Incrementing..." : "Increment"}
        </button>
        {incrementMutation.isError ? (
          <p>Increment failed: {formatError(incrementMutation.error)}</p>
        ) : null}
      </div>
      <p className="read-the-docs">Popup background via oRPC message-port</p>
    </>
  );
}

export default App;
