import { useState, useEffect, useCallback } from 'react';
import {
  getWorkers,
  createWorker,
  updateWorker,
  deleteWorker,
  getWageRecords,
  createWageRecord,
  generateMonthlyWages,
  markWagePaid,
  markWageUnpaid,
  deleteWageRecord,
  getDailyAttendances,
  createDailyAttendance,
  markAttendancePaid,
  markAttendanceUnpaid,
  deleteAttendance,
  getTempWorkerSummary,
  getWorkersByType,
  type TempWorkerSummary,
} from '@/lib/queries/workers';
import type {
  Worker,
  NewWorker,
  WageRecordWithWorker,
  NewWageRecord,
  DailyAttendanceWithWorker,
  NewDailyAttendance,
} from '@/types';

// ── Workers list hook ──

interface UseWorkersResult {
  workers: Worker[];
  loading: boolean;
  reload: () => Promise<void>;
  create: (data: NewWorker) => Promise<number>;
  update: (id: number, data: NewWorker) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export function useWorkers(statusFilter?: string): UseWorkersResult {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await getWorkers(statusFilter);
      setWorkers(data);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(
    async (data: NewWorker): Promise<number> => {
      const id = await createWorker(data);
      await reload();
      return id;
    },
    [reload],
  );

  const update = useCallback(
    async (id: number, data: NewWorker): Promise<void> => {
      await updateWorker(id, data);
      await reload();
    },
    [reload],
  );

  const remove = useCallback(
    async (id: number): Promise<void> => {
      await deleteWorker(id);
      await reload();
    },
    [reload],
  );

  return { workers, loading, reload, create, update, remove };
}

// ── Temp workers for attendance ──

export function useTempWorkers(): { workers: Worker[]; loading: boolean } {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const data = await getWorkersByType('临时工');
        if (!cancelled) setWorkers(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return (): void => {
      cancelled = true;
    };
  }, []);

  return { workers, loading };
}

// ── Wage records hook (permanent workers) ──

interface UseWageRecordsResult {
  records: WageRecordWithWorker[];
  loading: boolean;
  reload: () => Promise<void>;
  createRecord: (data: NewWageRecord) => Promise<number>;
  generate: (month: string) => Promise<number>;
  setPaid: (id: number, paidDate: string) => Promise<void>;
  setUnpaid: (id: number) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export function useWageRecords(month?: string): UseWageRecordsResult {
  const [records, setRecords] = useState<WageRecordWithWorker[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await getWageRecords(month);
      setRecords(data);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createRecord = useCallback(
    async (data: NewWageRecord): Promise<number> => {
      const id = await createWageRecord(data);
      await reload();
      return id;
    },
    [reload],
  );

  const generate = useCallback(
    async (m: string): Promise<number> => {
      const count = await generateMonthlyWages(m);
      await reload();
      return count;
    },
    [reload],
  );

  const setPaid = useCallback(
    async (id: number, paidDate: string): Promise<void> => {
      await markWagePaid(id, paidDate);
      await reload();
    },
    [reload],
  );

  const setUnpaid = useCallback(
    async (id: number): Promise<void> => {
      await markWageUnpaid(id);
      await reload();
    },
    [reload],
  );

  const remove = useCallback(
    async (id: number): Promise<void> => {
      await deleteWageRecord(id);
      await reload();
    },
    [reload],
  );

  return { records, loading, reload, createRecord, generate, setPaid, setUnpaid, remove };
}

// ── Daily attendance hook ──

interface UseAttendanceResult {
  records: DailyAttendanceWithWorker[];
  loading: boolean;
  reload: () => Promise<void>;
  create: (data: NewDailyAttendance) => Promise<number>;
  setPaid: (ids: number[], paidDate: string) => Promise<void>;
  setUnpaid: (ids: number[]) => Promise<void>;
  remove: (id: number) => Promise<void>;
}

export function useAttendance(filters?: {
  date?: string;
  workerId?: number;
  dateFrom?: string;
  dateTo?: string;
  isPaid?: number;
}): UseAttendanceResult {
  const [records, setRecords] = useState<DailyAttendanceWithWorker[]>([]);
  const [loading, setLoading] = useState(true);

  const date = filters?.date;
  const workerId = filters?.workerId;
  const dateFrom = filters?.dateFrom;
  const dateTo = filters?.dateTo;
  const isPaid = filters?.isPaid;

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await getDailyAttendances({ date, workerId, dateFrom, dateTo, isPaid });
      setRecords(data);
    } finally {
      setLoading(false);
    }
  }, [date, workerId, dateFrom, dateTo, isPaid]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = useCallback(
    async (data: NewDailyAttendance): Promise<number> => {
      const id = await createDailyAttendance(data);
      await reload();
      return id;
    },
    [reload],
  );

  const setPaid = useCallback(
    async (ids: number[], paidDate: string): Promise<void> => {
      await markAttendancePaid(ids, paidDate);
      await reload();
    },
    [reload],
  );

  const setUnpaid = useCallback(
    async (ids: number[]): Promise<void> => {
      await markAttendanceUnpaid(ids);
      await reload();
    },
    [reload],
  );

  const remove = useCallback(
    async (id: number): Promise<void> => {
      await deleteAttendance(id);
      await reload();
    },
    [reload],
  );

  return { records, loading, reload, create, setPaid, setUnpaid, remove };
}

// ── Temp worker summary hook ──

export function useTempWorkerSummary(
  dateFrom: string,
  dateTo: string,
): {
  summary: TempWorkerSummary[];
  loading: boolean;
  reload: () => Promise<void>;
  settleWorker: (workerId: number) => Promise<number>;
  unsettleWorker: (workerId: number) => Promise<number>;
  getExportAttendances: () => Promise<DailyAttendanceWithWorker[]>;
} {
  const [summary, setSummary] = useState<TempWorkerSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await getTempWorkerSummary(dateFrom, dateTo);
      setSummary(data);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const settleWorker = useCallback(
    async (workerId: number): Promise<number> => {
      const records = await getDailyAttendances({
        workerId,
        dateFrom,
        dateTo,
        isPaid: 0,
      });

      if (records.length === 0) {
        return 0;
      }

      await markAttendancePaid(
        records.map((record) => record.id),
        new Date().toISOString().slice(0, 10),
      );
      await reload();
      return records.length;
    },
    [dateFrom, dateTo, reload],
  );

  const unsettleWorker = useCallback(
    async (workerId: number): Promise<number> => {
      const records = await getDailyAttendances({
        workerId,
        dateFrom,
        dateTo,
        isPaid: 1,
      });

      if (records.length === 0) {
        return 0;
      }

      await markAttendanceUnpaid(records.map((record) => record.id));
      await reload();
      return records.length;
    },
    [dateFrom, dateTo, reload],
  );

  const getExportAttendances = useCallback(async (): Promise<DailyAttendanceWithWorker[]> => {
    return getDailyAttendances({ dateFrom, dateTo });
  }, [dateFrom, dateTo]);

  return {
    summary,
    loading,
    reload,
    settleWorker,
    unsettleWorker,
    getExportAttendances,
  };
}
