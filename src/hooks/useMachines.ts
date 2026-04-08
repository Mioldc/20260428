import { useState, useEffect, useCallback } from 'react';
import { getMachines, createMachine, updateMachine, deleteMachine } from '@/lib/queries/machines';
import type { Machine, NewMachine } from '@/types';

interface UseMachinesResult {
  machines: Machine[];
  loading: boolean;
  reload: () => Promise<void>;
  create: (data: NewMachine) => Promise<number>;
  update: (id: number, data: NewMachine) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export function useMachines(): UseMachinesResult {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async (): Promise<void> => {
    try {
      const data = await getMachines();
      setMachines(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(
    async (data: NewMachine): Promise<number> => {
      const id = await createMachine(data);
      await reload();
      return id;
    },
    [reload],
  );

  const update = useCallback(
    async (id: number, data: NewMachine): Promise<void> => {
      await updateMachine(id, data);
      await reload();
    },
    [reload],
  );

  const remove = useCallback(
    async (id: number): Promise<void> => {
      await deleteMachine(id);
      await reload();
    },
    [reload],
  );

  return { machines, loading, reload, create, update, remove };
}
