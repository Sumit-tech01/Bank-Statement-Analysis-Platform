import { Link } from "react-router-dom";

const NotFoundPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/50 bg-white/80 p-8 text-center shadow-panel backdrop-blur">
        <p className="font-heading text-5xl text-slate-900">404</p>
        <h1 className="mt-2 font-heading text-2xl text-slate-900">Page not found</h1>
        <p className="mt-2 text-slate-600">
          The page you requested does not exist or was moved.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-block rounded-xl bg-teal-600 px-5 py-2 font-semibold text-white transition hover:bg-teal-700"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
