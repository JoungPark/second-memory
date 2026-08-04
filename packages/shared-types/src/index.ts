export type MemoryId = string;

export interface MemoryRecord {
  id: MemoryId;
  userId: string;
  content: string;
  createdAt: string;
}
