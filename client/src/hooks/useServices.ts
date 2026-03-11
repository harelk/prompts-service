import { useState, useEffect, useCallback } from "react";
import { apiClient } from "../api/client";

export interface Service {
  id: string;
  name: string;
  createdAt: string;
}

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Service[]>("/api/services");
      setServices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינת הסרוויסים");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createService = useCallback(async (name: string): Promise<Service> => {
    const service = await apiClient.post<Service>("/api/services", { name });
    setServices((prev) => [...prev, service].sort((a, b) => a.name.localeCompare(b.name)));
    return service;
  }, []);

  const deleteService = useCallback(async (id: string): Promise<void> => {
    await apiClient.delete(`/api/services/${id}`);
    setServices((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { services, loading, error, reload: load, createService, deleteService };
}
