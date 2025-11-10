import { vi } from 'vitest';

// Mock environment variables for Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      signIn: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
    },
  },
}));
