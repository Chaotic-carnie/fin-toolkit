import { redirect } from "next/navigation";

export default function CapitalRootPage() {
  // Automatically route users to the first tab in the Capital suite
  redirect("/capital/budgeting");
}