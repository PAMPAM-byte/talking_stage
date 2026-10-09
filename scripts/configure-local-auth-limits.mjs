import { execFileSync } from 'node:child_process';
import { request } from 'node:http';
import { resolve } from 'node:path';

// Local CLI v2.120.0 omits GOTRUE_RATE_LIMIT_HEADER. Auth v2.197.0 then
// skips its native IP limits. Reconfigure only this project's Auth container;
// retain the stopped original until the replacement passes its health check.
// Apply the owner-selected direct email/password signup policy at the same time.
const name = 'supabase_auth_talking_stage';
const previous = `${name}_rate_limit_rollback`;
const inspect = target => JSON.parse(execFileSync('docker', ['inspect', target], { encoding: 'utf8', windowsHide: true }))[0];
const auth = inspect(name);
const gateway = inspect('supabase_kong_talking_stage');
const env = Object.fromEntries(auth.Config.Env.map(value => { const at = value.indexOf('='); return [value.slice(0, at), value.slice(at + 1)]; }));
const gatewayEnv = Object.fromEntries(gateway.Config.Env.map(value => { const at = value.indexOf('='); return [value.slice(0, at), value.slice(at + 1)]; }));
if (auth.Config.Labels?.['com.supabase.cli.project'] !== 'talking_stage' ||
    resolve(auth.Config.Labels?.['com.supabase.cli.workdir'] ?? '') !== resolve('.') ||
    auth.Config.Image !== 'public.ecr.aws/supabase/gotrue:v2.197.0' ||
    auth.HostConfig.NetworkMode !== 'supabase_network_talking_stage' ||
    Object.keys(auth.HostConfig.PortBindings ?? {}).length ||
    gateway.Config.Labels?.['com.supabase.cli.project'] !== 'talking_stage' ||
    gatewayEnv.KONG_TRUSTED_IPS || gatewayEnv.KONG_REAL_IP_HEADER) {
  throw new Error('Unexpected local Auth/gateway configuration; no container was changed.');
}
if (env.GOTRUE_RATE_LIMIT_HEADER === 'X-Real-IP' && env.GOTRUE_MAILER_AUTOCONFIRM === 'true') {
  if (auth.State.Health?.Status !== 'healthy') throw new Error('Configured local Auth is not healthy. Restart the local backend before testing.');
  console.log('Local Auth native IP limits and direct signup already enabled.');
  process.exit(0);
}
if (env.GOTRUE_RATE_LIMIT_HEADER && env.GOTRUE_RATE_LIMIT_HEADER !== 'X-Real-IP') throw new Error('An existing rate-limit header will not be overwritten.');
const host = execFileSync('docker', ['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'], { encoding: 'utf8', windowsHide: true }).trim();
const socketPath = host.startsWith('npipe://') ? host.slice(8) : host.startsWith('unix://') ? host.slice(7) : null;
if (!socketPath) throw new Error('Only a local Docker socket is supported.');
function api(method, path, data) {
  return new Promise((resolveRequest, reject) => {
    const body = data ? JSON.stringify(data) : '';
    const req = request({ socketPath, method, path, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, response => {
      let output = '';
      response.on('data', chunk => { output += chunk; });
      response.on('end', () => {
        // Docker error bodies/configuration can include secrets: never log them.
        if ((response.statusCode ?? 500) >= 400) return reject(new Error(`Local Docker operation failed (${response.statusCode}).`));
        resolveRequest(output ? JSON.parse(output) : null);
      });
    });
    req.setTimeout(30000, () => req.destroy(new Error('Local Docker operation timed out.')));
    req.on('error', () => reject(new Error('Local Docker socket operation failed.')));
    req.end(body);
  });
}
const existing = await api('GET', '/containers/json?all=true');
if (existing.some(container => container.Names.includes(`/${previous}`))) throw new Error('A previous local rollback container needs review; nothing was changed.');
const endpoints = Object.fromEntries(Object.entries(auth.NetworkSettings.Networks).map(([network, settings]) => [network, { Aliases: settings.Aliases }]));
const replacement = {
  ...auth.Config,
  Env: [...auth.Config.Env.filter(value=>!value.startsWith('GOTRUE_RATE_LIMIT_HEADER=')&&!value.startsWith('GOTRUE_MAILER_AUTOCONFIRM=')), 'GOTRUE_RATE_LIMIT_HEADER=X-Real-IP', 'GOTRUE_MAILER_AUTOCONFIRM=true'],
  HostConfig: auth.HostConfig,
  NetworkingConfig: { EndpointsConfig: endpoints },
};
let renamed = false;
let created = false;
try {
  await api('POST', `/containers/${name}/stop?t=10`);
  await api('POST', `/containers/${name}/rename?name=${previous}`);
  renamed = true;
  await api('POST', `/containers/create?name=${name}`, replacement);
  created = true;
  await api('POST', `/containers/${name}/start`);
  let healthy = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const state = await api('GET', `/containers/${name}/json`);
    if (state.State.Health?.Status === 'healthy') { healthy = true; break; }
    if (!state.State.Running) break;
    await new Promise(done => setTimeout(done, 500));
  }
  if (!healthy) throw new Error('Replacement local Auth did not pass its health check.');
  await api('DELETE', `/containers/${previous}`);
  console.log('Local Auth direct signup and native IP limits enabled; database and credentials preserved.');
} catch (error) {
  try {
    if (created) await api('DELETE', `/containers/${name}?force=true`);
    if (renamed) await api('POST', `/containers/${previous}/rename?name=${name}`);
    await api('POST', `/containers/${name}/start`);
  } catch { throw new Error('Local Auth rollback needs operator review. No database containers were changed.'); }
  throw error;
}
