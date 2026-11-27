import { datadogRum } from '@datadog/browser-rum';
import { reactPlugin } from '@datadog/browser-rum-react';

let rumInitialized = false;

/**
 * Initialize Datadog Real User Monitoring (RUM) once before React mounts.
 * Skips initialization in local development unless VITE_DD_ENABLE_DEV=true,
 * and requires VITE_DD_APPLICATION_ID and VITE_DD_CLIENT_TOKEN to be set.
 */
export function initDatadogRum(): void {
  if (rumInitialized || typeof window === 'undefined') {
    return;
  }

  const isDev = import.meta.env.DEV;
  const enableInDev = import.meta.env.VITE_DD_ENABLE_DEV === 'true';
  if (isDev && !enableInDev) {
    return;
  }

  const applicationId = (import.meta.env.VITE_DD_APPLICATION_ID || '').trim();
  const clientToken = (import.meta.env.VITE_DD_CLIENT_TOKEN || '').trim();
  if (!applicationId || !clientToken) {
    return;
  }

  const site = (import.meta.env.VITE_DD_SITE || 'us5.datadoghq.com').trim();
  const service = (import.meta.env.VITE_DD_SERVICE || 'geosat-intelligence-frontend').trim();
  const env = (import.meta.env.VITE_DD_ENV || 'production').trim();
  const version = (import.meta.env.VITE_DD_VERSION || '1.0.0').trim();
  const remoteConfigId = (import.meta.env.VITE_DD_REMOTE_CONFIG_ID || '').trim();

  datadogRum.init({
    applicationId,
    clientToken,
    site,
    service,
    env,
    version,
    sessionSampleRate: 100,
    sessionReplaySampleRate: 20,
    trackUserInteractions: true,
    trackResources: true,
    trackLongTasks: true,
    defaultPrivacyLevel: 'mask-user-input',
    plugins: [reactPlugin({ router: false })],
    ...(remoteConfigId ? { remoteConfiguration: { id: remoteConfigId } } : {}),
  });

  rumInitialized = true;
}
