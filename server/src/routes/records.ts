import { Router } from 'express';
import { z } from 'zod';
import { Parser as CsvParser } from 'json2csv';
import ExcelJS from 'exceljs';
import { v4 as uuid } from 'uuid';
import {
  deleteRecord,
  getRecordById,
  getRecords,
  saveRecord,
  updateRecord,
} from '../storage';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { YieldRecord } from '../types';

const router = Router();

const createRecordSchema = z.object({
  idNumber: z.string(),
  officer: z.string(),
  location: z.string(),
  treesInSample: z.number(),
  totalPods: z.number(),
  area: z.number(),
  treeDensity: z.number(),
  podsPerTree: z.number(),
  yieldPerHa: z.number(),
  volume: z.number(),
  adjustmentPercentage: z.number(),
  lastYearProduction: z.number(),
  conditions: z.record(z.string(), z.boolean()),
  timestamp: z.string(),
  gps: z.string().optional(),
});

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function applyFilters(records: YieldRecord[], query: any): YieldRecord[] {
  const farmerId = typeof query.farmerId === 'string' ? query.farmerId.toLowerCase() : undefined;
  const officer = typeof query.officer === 'string' ? query.officer.toLowerCase() : undefined;
  const location = typeof query.location === 'string' ? query.location.toLowerCase() : undefined;
  const search = typeof query.search === 'string' ? query.search.toLowerCase() : undefined;
  const startDate = parseDate(query.startDate);
  const endDate = parseDate(query.endDate);

  return records.filter((record) => {
    if (farmerId && !record.idNumber.toLowerCase().includes(farmerId)) {
      return false;
    }
    if (officer && !record.officer.toLowerCase().includes(officer)) {
      return false;
    }
    if (location && !record.location.toLowerCase().includes(location)) {
      return false;
    }
    if (startDate || endDate) {
      const recordDate = new Date(record.timestamp);
      if (startDate && recordDate < startDate) {
        return false;
      }
      if (endDate && recordDate > endDate) {
        return false;
      }
    }
    if (search) {
      const haystack = `${record.idNumber} ${record.officer} ${record.location}`.toLowerCase();
      if (!haystack.includes(search)) {
        return false;
      }
    }
    return true;
  });
}

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function computeAggregates(records: YieldRecord[]) {
  const totals = {
    records: records.length,
    farmers: new Set(records.map((r) => r.idNumber)).size,
    totalVolume: 0,
    averageYield: 0,
    averageVolume: 0,
  };

  const byLocationMap = new Map<string, { volume: number; yield: number; count: number }>();
  const byOfficerMap = new Map<string, { volume: number; yield: number; count: number }>();
  const monthlyVolumeMap = new Map<string, number>();
  const monthlyByLocation = new Map<string, Map<string, number>>();
  const monthlyByOfficer = new Map<string, Map<string, number>>();

  records.forEach((record) => {
    totals.totalVolume += record.volume;
    totals.averageYield += record.yieldPerHa;
    totals.averageVolume += record.volume;

    const locationEntry = byLocationMap.get(record.location) ?? { volume: 0, yield: 0, count: 0 };
    locationEntry.volume += record.volume;
    locationEntry.yield += record.yieldPerHa;
    locationEntry.count += 1;
    byLocationMap.set(record.location, locationEntry);

    const officerEntry = byOfficerMap.get(record.officer) ?? { volume: 0, yield: 0, count: 0 };
    officerEntry.volume += record.volume;
    officerEntry.yield += record.yieldPerHa;
    officerEntry.count += 1;
    byOfficerMap.set(record.officer, officerEntry);

    const monthKey = toMonthKey(new Date(record.timestamp));
    monthlyVolumeMap.set(monthKey, (monthlyVolumeMap.get(monthKey) ?? 0) + record.volume);

    if (!monthlyByLocation.has(record.location)) {
      monthlyByLocation.set(record.location, new Map());
    }
    const locationMonth = monthlyByLocation.get(record.location)!;
    locationMonth.set(monthKey, (locationMonth.get(monthKey) ?? 0) + record.volume);

    if (!monthlyByOfficer.has(record.officer)) {
      monthlyByOfficer.set(record.officer, new Map());
    }
    const officerMonth = monthlyByOfficer.get(record.officer)!;
    officerMonth.set(monthKey, (officerMonth.get(monthKey) ?? 0) + record.volume);
  });

  if (records.length > 0) {
    totals.averageYield = totals.averageYield / records.length;
    totals.averageVolume = totals.averageVolume / records.length;
  }

  const byLocation = Array.from(byLocationMap.entries()).map(([name, values]) => ({
    location: name,
    totalVolume: values.volume,
    averageYield: values.yield / values.count,
    records: values.count,
  }));

  const byOfficer = Array.from(byOfficerMap.entries()).map(([name, values]) => ({
    officer: name,
    totalVolume: values.volume,
    averageYield: values.yield / values.count,
    records: values.count,
  }));

  const monthlyVolume = Array.from(monthlyVolumeMap.entries())
    .map(([month, volume]) => ({ month, totalVolume: volume }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const monthlyLocationSeries: Record<string, { month: string; totalVolume: number }[]> = {};
  monthlyByLocation.forEach((series, name) => {
    monthlyLocationSeries[name] = Array.from(series.entries())
      .map(([month, volume]) => ({ month, totalVolume: volume }))
      .sort((a, b) => a.month.localeCompare(b.month));
  });

  const monthlyOfficerSeries: Record<string, { month: string; totalVolume: number }[]> = {};
  monthlyByOfficer.forEach((series, name) => {
    monthlyOfficerSeries[name] = Array.from(series.entries())
      .map(([month, volume]) => ({ month, totalVolume: volume }))
      .sort((a, b) => a.month.localeCompare(b.month));
  });

  return {
    totals,
    byLocation,
    byOfficer,
    monthlyVolume,
    monthlyLocationSeries,
    monthlyOfficerSeries,
  };
}

function sanitizeRecord(record: YieldRecord) {
  return {
    ...record,
    conditions: record.conditions,
  };
}

function flattenConditions(record: YieldRecord) {
  return {
    ...record,
    conditions: Object.entries(record.conditions)
      .filter(([, value]) => value)
      .map(([key]) => key)
      .join('; '),
  };
}

router.get(
  '/',
  authenticate(['dashboard_admin']),
  async (req: AuthenticatedRequest, res) => {
    const page = Math.max(parseInt(String(req.query.page ?? '1'), 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(String(req.query.pageSize ?? '20'), 10) || 20, 1), 100);

    const records = applyFilters(await getRecords(), req.query);
    records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = records.length;
    const start = (page - 1) * pageSize;
    const data = records.slice(start, start + pageSize).map(sanitizeRecord);

    return res.json({
      data,
      total,
      page,
      pageSize,
    });
  },
);

router.get(
  '/kpis',
  authenticate(['dashboard_admin']),
  async (req, res) => {
    const records = applyFilters(await getRecords(), req.query);
    return res.json(computeAggregates(records));
  },
);

router.get(
  '/export',
  authenticate(['dashboard_admin']),
  async (req, res) => {
    const format = String(req.query.format ?? 'csv').toLowerCase();
    const records = applyFilters(await getRecords(), req.query).map(flattenConditions);

    if (format === 'csv') {
      const parser = new CsvParser();
      const csv = parser.parse(records);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="yield-records.csv"');
      return res.send(csv);
    }

    if (format === 'xlsx' || format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Yield Records');
      if (records.length > 0) {
        const [first] = records;
        worksheet.columns = Object.keys(first!).map((key) => ({
          header: key,
          key,
        }));
        records.forEach((record) => worksheet.addRow(record));
      }
      const buffer = await workbook.xlsx.writeBuffer();
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="yield-records.xlsx"');
      return res.send(Buffer.from(buffer));
    }

    return res.status(400).json({ message: 'Unsupported export format. Use csv or xlsx.' });
  },
);

router.get(
  '/:id',
  authenticate(['dashboard_admin']),
  async (req, res) => {
    const { id } = req.params as { id: string };
    const record = await getRecordById(id);
    if (!record) {
      return res.status(404).json({ message: 'Record not found' });
    }
    return res.json(sanitizeRecord(record));
  },
);

router.post(
  '/',
  authenticate(['field_officer', 'dashboard_admin']),
  async (req: AuthenticatedRequest, res) => {
    const parsed = createRecordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() });
    }

    const { gps, ...rest } = parsed.data;
    const record: YieldRecord = {
      id: uuid(),
      ...rest,
      ...(gps ? { gps } : {}),
    };

    if (req.user?.role === 'field_officer') {
      record.officer = req.user.fullName || req.user.username;
    }

    const saved = await saveRecord(record);
    return res.status(201).json(saved);
  },
);

router.put(
  '/:id',
  authenticate(['dashboard_admin']),
  async (req, res) => {
    const partialSchema = createRecordSchema.partial();
    const parsed = partialSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid payload', errors: parsed.error.flatten() });
    }

    const { gps, ...rest } = parsed.data;
    const payload: Partial<YieldRecord> = {
      ...rest,
      ...(gps !== undefined ? { gps } : {}),
    } as Partial<YieldRecord>;

    const { id } = req.params as { id: string };
    const updated = await updateRecord(id, payload);
    if (!updated) {
      return res.status(404).json({ message: 'Record not found' });
    }
    return res.json(updated);
  },
);

router.delete(
  '/:id',
  authenticate(['dashboard_admin']),
  async (req, res) => {
    const { id } = req.params as { id: string };
    const deleted = await deleteRecord(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Record not found' });
    }
    return res.status(204).send();
  },
);

export default router;
