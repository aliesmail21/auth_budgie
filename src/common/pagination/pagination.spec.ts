import { PaginationQuerySchema, createPaginatedResult } from './index';

describe('Pagination Utilities', () => {
  describe('PaginationQuerySchema', () => {
    it('should parse valid query strings with defaults', () => {
      const result = PaginationQuerySchema.parse({});
      expect(result).toEqual({
        page: 1,
        limit: 20,
        sortOrder: 'desc',
      });
    });

    it('should parse numeric strings from query parameters', () => {
      const result = PaginationQuerySchema.parse({
        page: '3',
        limit: '50',
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });
      expect(result).toEqual({
        page: 3,
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });
    });

    it('should reject invalid page and limit values', () => {
      expect(() => PaginationQuerySchema.parse({ page: 0 })).toThrow();
      expect(() => PaginationQuerySchema.parse({ page: -1 })).toThrow();
      expect(() => PaginationQuerySchema.parse({ limit: 101 })).toThrow();
      expect(() => PaginationQuerySchema.parse({ sortOrder: 'invalid' })).toThrow();
    });
  });

  describe('createPaginatedResult', () => {
    it('should calculate metadata correctly for first page', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const result = createPaginatedResult(items, 50, 1, 10);

      expect(result.data).toEqual(items);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        totalItems: 50,
        totalPages: 5,
        hasNextPage: true,
        hasPrevPage: false,
      });
    });

    it('should calculate metadata correctly for middle page', () => {
      const items = [{ id: 3 }];
      const result = createPaginatedResult(items, 50, 3, 10);

      expect(result.meta).toEqual({
        page: 3,
        limit: 10,
        totalItems: 50,
        totalPages: 5,
        hasNextPage: true,
        hasPrevPage: true,
      });
    });

    it('should calculate metadata correctly for last page', () => {
      const items = [{ id: 5 }];
      const result = createPaginatedResult(items, 50, 5, 10);

      expect(result.meta).toEqual({
        page: 5,
        limit: 10,
        totalItems: 50,
        totalPages: 5,
        hasNextPage: false,
        hasPrevPage: true,
      });
    });

    it('should handle empty result sets gracefully', () => {
      const result = createPaginatedResult([], 0, 1, 20);

      expect(result.data).toEqual([]);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        totalItems: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });
  });
});
