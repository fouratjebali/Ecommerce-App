export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'ARTISAN' | 'BUYER';
  avatarUrl: string | null;
  artisanProfile: {
    id: string;
    slug: string;
    studioName: string;
    verificationStatus: string;
    verified: boolean;
    location: string;
  } | null;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: string;
  user: AuthUser;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface BuyerRegistrationPayload {
  email: string;
  fullName: string;
  password: string;
}

export interface ArtisanRegistrationPayload extends BuyerRegistrationPayload {
  studioName: string;
  slug: string;
  headline: string;
  bio: string;
  location: string;
  impactStatement: string;
}
