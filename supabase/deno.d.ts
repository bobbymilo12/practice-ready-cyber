// Local tsc check for the Edge Function; deployment uses the Deno runtime.
declare namespace Deno {
  const env: { get(name: string): string | undefined };
  function serve(handler: (request: Request) => Response | Promise<Response>): void;
}
