import { execute, select } from '@/lib/db';
import type { Customer, NewCustomer } from '@/types';

export async function getCustomers(keyword?: string): Promise<Customer[]> {
  if (keyword && keyword.trim()) {
    const pattern = `%${keyword.trim()}%`;
    return select<Customer>(
      `SELECT * FROM customers
       WHERE name LIKE $1 OR phone LIKE $1 OR contactPerson LIKE $1
       ORDER BY createdAt DESC`,
      [pattern],
    );
  }
  return select<Customer>('SELECT * FROM customers ORDER BY createdAt DESC');
}

export async function getCustomerById(id: number): Promise<Customer | undefined> {
  const rows = await select<Customer>('SELECT * FROM customers WHERE id = $1', [id]);
  return rows[0];
}

export async function createCustomer(data: NewCustomer): Promise<number> {
  const result = await execute(
    `INSERT INTO customers (name, contactPerson, phone, address, settlementType, invoiceInfo, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      data.name,
      data.contactPerson ?? null,
      data.phone ?? null,
      data.address ?? null,
      data.settlementType ?? '现结',
      data.invoiceInfo ?? null,
      data.notes ?? null,
    ],
  );
  return result.lastInsertId;
}

export async function updateCustomer(id: number, data: NewCustomer): Promise<void> {
  await execute(
    `UPDATE customers SET name = $1, contactPerson = $2, phone = $3, address = $4,
     settlementType = $5, invoiceInfo = $6, notes = $7 WHERE id = $8`,
    [
      data.name,
      data.contactPerson ?? null,
      data.phone ?? null,
      data.address ?? null,
      data.settlementType ?? '现结',
      data.invoiceInfo ?? null,
      data.notes ?? null,
      id,
    ],
  );
}

export async function deleteCustomer(id: number): Promise<void> {
  await execute('DELETE FROM customers WHERE id = $1', [id]);
}
