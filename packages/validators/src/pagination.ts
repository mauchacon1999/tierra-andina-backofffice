import { z } from "zod";

export const MAX_PAGE_SIZE = 100;

/** `?page=&pageSize=` for every list endpoint (CLAUDE.md §9: lists are paginated). */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export type PaginatedSchema<Item extends z.ZodType> = z.ZodObject<{
  data: z.ZodArray<Item>;
  total: z.ZodNumber;
  page: z.ZodNumber;
  pageSize: z.ZodNumber;
}>;

/** `{ data, total, page, pageSize }` around any item schema. */
export function paginatedSchema<Item extends z.ZodType>(item: Item): PaginatedSchema<Item> {
  return z.object({
    data: z.array(item),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
  });
}

export type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};
