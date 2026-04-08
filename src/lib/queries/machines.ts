import { execute, select } from '@/lib/db';
import type { Machine, NewMachine } from '@/types';

export async function getMachines(): Promise<Machine[]> {
  return select<Machine>('SELECT * FROM machines ORDER BY id');
}

export async function getMachineById(id: number): Promise<Machine | undefined> {
  const rows = await select<Machine>('SELECT * FROM machines WHERE id = $1', [id]);
  return rows[0];
}

export async function createMachine(data: NewMachine): Promise<number> {
  const result = await execute(
    'INSERT INTO machines (name, model, headCount, status, notes) VALUES ($1, $2, $3, $4, $5)',
    [
      data.name,
      data.model ?? null,
      data.headCount ?? null,
      data.status ?? '正常',
      data.notes ?? null,
    ],
  );
  return result.lastInsertId;
}

export async function updateMachine(id: number, data: NewMachine): Promise<void> {
  await execute(
    'UPDATE machines SET name = $1, model = $2, headCount = $3, status = $4, notes = $5 WHERE id = $6',
    [
      data.name,
      data.model ?? null,
      data.headCount ?? null,
      data.status ?? '正常',
      data.notes ?? null,
      id,
    ],
  );
}

export async function deleteMachine(id: number): Promise<void> {
  await execute('DELETE FROM machines WHERE id = $1', [id]);
}
