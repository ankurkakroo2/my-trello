import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Board from "@/components/Board";

export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return <Board />;
}
