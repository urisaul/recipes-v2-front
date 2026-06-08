import { API_BASE } from './constants';
import PortalApiClient from './PortalApiClient';

let apiInstance;

export async function getApiClient() {
  if (apiInstance) {
    return apiInstance;
  }

  apiInstance = new PortalApiClient(API_BASE);
  return apiInstance;
}

export async function getVerifiedUser() {
  const api = await getApiClient();
  return api.auth.verifyToken();
}
