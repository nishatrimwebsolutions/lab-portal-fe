import type { NextRequest } from "next/server";

// Same-origin proxy to the backend API. The browser calls /api/* on this app; the server forwards the call to
// BACKEND_URL (read at runtime). BACKEND_SHARE_TOKEN is appended for GoDaddy private preview backends.
export const dynamic = "force-dynamic";

const REQUEST_HEADERS = ["authorization", "content-type", "accept"];
const RESPONSE_HEADERS = ["content-type", "content-disposition", "cache-control"];

const backendBaseUrl = () => (process.env.BACKEND_URL || "http://localhost:5001").replace(/\/+$/, "");

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }): Promise<Response> {
  const { path } = await ctx.params;
  const target = new URL(`${backendBaseUrl()}/api/${path.map(encodeURIComponent).join("/")}`);
  req.nextUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value));
  if (process.env.BACKEND_SHARE_TOKEN) target.searchParams.set("airoShareToken", process.env.BACKEND_SHARE_TOKEN);

  const headers = new Headers();
  for (const name of REQUEST_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer(),
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return Response.json({ message: "Backend server is unreachable. Please try again shortly." }, { status: 502 });
  }

  const responseHeaders = new Headers();
  for (const name of RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
