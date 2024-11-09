import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

export async function loader({ params }: LoaderFunctionArgs) {
  return redirect(`/${params.city}/games`);
}

export default function Index() {
  return null;
}
