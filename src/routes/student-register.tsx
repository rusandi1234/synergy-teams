import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/student-register")({
  beforeLoad: () => {
    throw redirect({ to: "/auth" });
  },
  component: () => null,
});
