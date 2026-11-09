import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-xl space-y-5">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p>We could not find this page.</p>
      <Link className="tap-link underline underline-offset-4" href="/">
        Go to home page
      </Link>
    </div>
  );
}
