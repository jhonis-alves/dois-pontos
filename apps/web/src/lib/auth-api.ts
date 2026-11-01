import { ApiError, apiRequest } from './http';

export type GenderPalette = 'male' | 'female';
export type ThemeMode = 'light' | 'dark' | 'auto';
export type SpaceRole = 'owner' | 'member';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  genderPalette: GenderPalette;
  themeMode: ThemeMode;
}

export interface AuthSpace {
  id: string;
  name: string;
  role: SpaceRole;
}

export interface SpaceMember {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  role: SpaceRole;
  joinedAt: string;
}

export interface SessionResponse {
  user: AuthUser;
  space: AuthSpace;
  members: SpaceMember[];
}

export interface RegisterInput {
  displayName: string;
  email: string;
  password: string;
  genderPalette?: GenderPalette;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AcceptInviteInput {
  displayName?: string;
  email?: string;
  password?: string;
  genderPalette?: GenderPalette;
}

export interface AcceptInviteResponse extends SessionResponse {
  createdAccount: boolean;
}

export type InviteStatus = 'valid' | 'used' | 'revoked' | 'expired';

export interface InvitePreview {
  spaceName: string;
  inviterName: string;
  email: string | null;
  expiresAt: string;
  status: InviteStatus;
}

export interface InviteSummary {
  id: string;
  email: string | null;
  expiresAt: string;
  createdAt: string;
  status: InviteStatus;
}

export interface CreatedInvite {
  id: string;
  token: string;
  url: string;
  expiresAt: string;
}

export interface SpaceDetailsResponse {
  space: AuthSpace;
  members: SpaceMember[];
  invites: InviteSummary[];
}

export interface CreateInviteInput {
  email?: string;
  expiresInDays?: number;
}

export function registerAccount(
  input: RegisterInput,
): Promise<SessionResponse> {
  return apiRequest('/api/auth/register', { method: 'POST', body: input });
}

export function loginAccount(input: LoginInput): Promise<SessionResponse> {
  return apiRequest('/api/auth/login', { method: 'POST', body: input });
}

export function logoutAccount(): Promise<void> {
  return apiRequest('/api/auth/logout', { method: 'POST' });
}

export async function fetchSession(): Promise<SessionResponse | null> {
  try {
    return await apiRequest<SessionResponse>('/api/auth/me');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export function fetchInvite(
  token: string,
): Promise<{ invite: InvitePreview }> {
  return apiRequest(`/api/invites/${encodeURIComponent(token)}`);
}

export function acceptInvite(
  token: string,
  input: AcceptInviteInput,
): Promise<AcceptInviteResponse> {
  return apiRequest(`/api/invites/${encodeURIComponent(token)}/accept`, {
    method: 'POST',
    body: input,
  });
}

export function fetchSpace(): Promise<SpaceDetailsResponse> {
  return apiRequest('/api/spaces/current');
}

export function createInvite(
  input: CreateInviteInput,
): Promise<{ invite: CreatedInvite }> {
  return apiRequest('/api/spaces/invites', { method: 'POST', body: input });
}

export function revokeInvite(inviteId: string): Promise<void> {
  return apiRequest(`/api/spaces/invites/${encodeURIComponent(inviteId)}`, {
    method: 'DELETE',
  });
}
