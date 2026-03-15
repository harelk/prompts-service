import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../api/client";

export type PromptStatus = "draft" | "active" | "in_progress" | "done" | "archived";

export interface Service {
  id: string;
  name: string;
  createdAt: string;
}

export interface Prompt {
  id: string;
  title: string;
  content: string;
  note: string | null;
  rawTranscription: string | null;
  status: PromptStatus;
  createdAt: string;
  updatedAt: string;
  services: Service[];
}

export interface PromptsFilter {
  status?: string;
  search?: string;
  serviceId?: string;
}

export function usePrompts(filter: PromptsFilter = {}) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filter.status) params.set("status", filter.status);
      if (filter.search) params.set("search", filter.search);
      if (filter.serviceId) params.set("serviceId", filter.serviceId);
      const query = params.toString() ? `?${params.toString()}` : "";
      const data = await apiClient.get<Prompt[]>(`/api/prompts${query}`);
      setPrompts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינת הפרומפטים");
    } finally {
      setLoading(false);
    }
  }, [filter.status, filter.search, filter.serviceId]);

  useEffect(() => {
    load();
  }, [load]);

  return { prompts, loading, error, reload: load };
}

export function usePrompt(id: string) {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Prompt>(`/api/prompts/${id}`);
      setPrompt(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינת הפרומפט");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const updatePrompt = useCallback(
    async (updates: Partial<Omit<Prompt, "id" | "createdAt" | "updatedAt"> & { serviceIds: string[] }>) => {
      const updated = await apiClient.patch<Prompt>(`/api/prompts/${id}`, updates);
      setPrompt(updated);
      return updated;
    },
    [id]
  );

  const deletePrompt = useCallback(async () => {
    await apiClient.delete(`/api/prompts/${id}`);
  }, [id]);

  return { prompt, loading, error, reload: load, updatePrompt, deletePrompt };
}

export async function createPrompt(data: {
  title: string;
  content: string;
  note?: string;
  status?: PromptStatus;
  serviceIds?: string[];
  rawTranscription?: string;
}): Promise<Prompt> {
  return apiClient.post<Prompt>("/api/prompts", data);
}
