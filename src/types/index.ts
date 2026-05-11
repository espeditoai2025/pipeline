// Shared application types
// Domain-specific types will be added as features are implemented

export type ApiResponse<T> = {
  data: T | null;
  error: string | null;
  meta?: {
    total?: number;
    page?: number;
    perPage?: number;
  };
};
