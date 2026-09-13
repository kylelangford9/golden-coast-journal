import handler from 'vinext/server/fetch-handler';
import { runEditorialPipeline } from './lib/pipeline';

function secure(response: Response) {
  const secured = new Response(response.body, response);
  secured.headers.set('X-Content-Type-Options', 'nosniff');
  secured.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  secured.headers.set('X-Frame-Options', 'DENY');
  secured.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  secured.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  secured.headers.set('Content-Security-Policy', "default-src 'self'; img-src 'self' data:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  return secured;
}

const worker = {
  async fetch(request: Request, workerEnv: Cloudflare.Env, context: ExecutionContext) {
    return secure(await handler.fetch(request, workerEnv, context));
  },
  async scheduled(_controller: ScheduledController, _workerEnv: Cloudflare.Env, context: ExecutionContext) {
    context.waitUntil(runEditorialPipeline());
  },
};

export default worker;
