// src/components/features/CalorieChart.tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, Cell, XAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  Calendar, ChevronLeft, ChevronRight,
  ArrowLeft, Utensils,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface FoodLog {
  id: string;
  mealType: string;
  foodName: string;
  calories: number;
  recordedAt: string | Date;
}

interface CalorieChartProps {
  todayLogs: FoodLog[];
  allLogs: FoodLog[];
  goalCalories: number;
  targetPerMeal: number;
}

type Timeframe = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

interface ChartPoint {
  name: string;
  calories: number;
  isToday: boolean;
  isOverGoal?: boolean;
  /** key สำหรับ drill‑down: dateKey (weekly/monthly), mealType (daily), monthIdx (yearly) */
  drillKey?: string;
}

interface DrillDownState {
  label: string;
  mode: 'meals' | 'days';        // meals = แสดงรายการอาหาร, days = สรุปรายวัน
  logs: FoodLog[];
  totalCalories: number;
}

interface DaySummaryRow {
  dateDisplay: string;
  totalCalories: number;
  mealCount: number;
  isOverGoal: boolean;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const MEAL_CONFIG: Record<string, { label: string; icon: string; cls: string }> = {
  BREAKFAST: { label: 'มื้อเช้า',   icon: '☀️', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  LUNCH:     { label: 'มื้อเที่ยง', icon: '🌤️', cls: 'bg-green-500/10 text-green-400 border-green-500/20' },
  DINNER:    { label: 'มื้อเย็น',   icon: '🌙', cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  SNACK:     { label: 'ของว่าง',    icon: '☕', cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
};

const THAI_DAYS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const THAI_MONTHS_FULL  = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

const TIMEFRAME_TABS: { id: Timeframe; label: string }[] = [
  { id: 'DAILY',   label: 'วัน' },
  { id: 'WEEKLY',  label: 'สัปดาห์' },
  { id: 'MONTHLY', label: 'เดือน' },
  { id: 'YEARLY',  label: 'ปี' },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
/** สร้าง key สำหรับเปรียบเทียบวัน (ใช้ timezone ของ client) */
function dateKey(d: Date): string {
  return d.toDateString();
}

function thaiDateShort(d: Date): string {
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
}

function thaiDateFull(d: Date): string {
  return d.toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'long' });
}

function mealCfg(type: string) {
  return MEAL_CONFIG[type] ?? { label: type, icon: '🍽️', cls: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };
}

// ═════════════════════════════════════════════
// Main Component
// ═════════════════════════════════════════════
export default function CalorieChart({
  todayLogs,
  allLogs,
  goalCalories,
  targetPerMeal,
}: CalorieChartProps) {
  // ── State ──────────────────────────────────
  const [timeframe, setTimeframe]   = useState<Timeframe>('WEEKLY');
  const [drillDown, setDrillDown]   = useState<DrillDownState | null>(null);
  const [monthOffset, setMonthOffset] = useState(0); // 0 = เดือนนี้

  // ── Chart Data ─────────────────────────────
  const chartData = useMemo<ChartPoint[]>(() => {
    const now = new Date();
    const todayKey = dateKey(now);

    switch (timeframe) {
      // ─── วัน (แบ่งตามมื้อ) ────────────────
      case 'DAILY': {
        const grouped: Record<string, number> = { BREAKFAST: 0, LUNCH: 0, DINNER: 0, SNACK: 0 };
        todayLogs.forEach(l => { grouped[l.mealType] = (grouped[l.mealType] || 0) + l.calories; });
        return [
          { name: 'เช้า',    calories: grouped.BREAKFAST, isToday: false, drillKey: 'BREAKFAST' },
          { name: 'เที่ยง',  calories: grouped.LUNCH,     isToday: false, drillKey: 'LUNCH' },
          { name: 'เย็น',    calories: grouped.DINNER,    isToday: false, drillKey: 'DINNER' },
          { name: 'ว่าง',    calories: grouped.SNACK,     isToday: false, drillKey: 'SNACK' },
        ];
      }

      // ─── สัปดาห์ (7 วันย้อนหลัง) ──────────
      case 'WEEKLY': {
        const grouped: Record<string, number> = {};
        allLogs.forEach(l => {
          const dk = dateKey(new Date(l.recordedAt));
          grouped[dk] = (grouped[dk] || 0) + l.calories;
        });
        return Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          const dk = dateKey(d);
          const isToday = dk === todayKey;
          return {
            name: isToday ? 'วันนี้' : THAI_DAYS[d.getDay()],
            calories: grouped[dk] || 0,
            isToday,
            isOverGoal: (grouped[dk] || 0) > goalCalories,
            drillKey: dk,
          };
        });
      }

      // ─── เดือน (ทุกวันของเดือน) ────────────
      case 'MONTHLY': {
        const ref = new Date();
        ref.setMonth(ref.getMonth() + monthOffset);
        const year = ref.getFullYear();
        const month = ref.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const grouped: Record<string, number> = {};
        allLogs.forEach(l => {
          const ld = new Date(l.recordedAt);
          if (ld.getFullYear() === year && ld.getMonth() === month) {
            const dk = dateKey(ld);
            grouped[dk] = (grouped[dk] || 0) + l.calories;
          }
        });

        return Array.from({ length: daysInMonth }, (_, i) => {
          const d = new Date(year, month, i + 1);
          const dk = dateKey(d);
          return {
            name: `${i + 1}`,
            calories: grouped[dk] || 0,
            isToday: dk === todayKey,
            isOverGoal: (grouped[dk] || 0) > goalCalories,
            drillKey: dk,
          };
        });
      }

      // ─── ปี (12 เดือน) ─────────────────────
      case 'YEARLY': {
        const year = now.getFullYear();
        const currentMonth = now.getMonth();
        const grouped: Record<number, number> = {};
        allLogs.forEach(l => {
          const ld = new Date(l.recordedAt);
          if (ld.getFullYear() === year) {
            grouped[ld.getMonth()] = (grouped[ld.getMonth()] || 0) + l.calories;
          }
        });
        return THAI_MONTHS_SHORT.map((m, i) => ({
          name: m,
          calories: grouped[i] || 0,
          isToday: i === currentMonth,
          drillKey: `month-${i}`,
        }));
      }

      default: return [];
    }
  }, [todayLogs, allLogs, timeframe, goalCalories, monthOffset]);

  // ── Subtitle ───────────────────────────────
  const subtitle = useMemo(() => {
    switch (timeframe) {
      case 'DAILY':   return 'แบ่งตามมื้อวันนี้';
      case 'WEEKLY':  return '7 วันล่าสุด';
      case 'MONTHLY': {
        const d = new Date();
        d.setMonth(d.getMonth() + monthOffset);
        return `${THAI_MONTHS_FULL[d.getMonth()]} ${d.getFullYear() + 543}`;
      }
      case 'YEARLY':  return `ปี พ.ศ. ${new Date().getFullYear() + 543}`;
      default: return '';
    }
  }, [timeframe, monthOffset]);

  // ── Bar click handler ──────────────────────
  const handleBarClick = useCallback(
    (point: ChartPoint) => {
      if (point.calories === 0) return;

      if (timeframe === 'DAILY') {
        // drill ลงไปดูเมนูของมื้อนั้น
        const mealType = point.drillKey!;
        const filtered = todayLogs.filter(l => l.mealType === mealType);
        setDrillDown({
          label: `${mealCfg(mealType).label} — วันนี้`,
          mode: 'meals',
          logs: filtered,
          totalCalories: point.calories,
        });
      } else if (timeframe === 'WEEKLY' || timeframe === 'MONTHLY') {
        // drill ลงไปดูรายการอาหารของวันนั้น
        const targetKey = point.drillKey!;
        const filtered = allLogs.filter(l => dateKey(new Date(l.recordedAt)) === targetKey);
        setDrillDown({
          label: thaiDateFull(new Date(targetKey)),
          mode: 'meals',
          logs: filtered,
          totalCalories: point.calories,
        });
      } else if (timeframe === 'YEARLY') {
        // drill ลงไปดูสรุปรายวันของเดือนนั้น
        const monthIdx = parseInt(point.drillKey!.replace('month-', ''));
        const year = new Date().getFullYear();
        const filtered = allLogs.filter(l => {
          const ld = new Date(l.recordedAt);
          return ld.getFullYear() === year && ld.getMonth() === monthIdx;
        });
        setDrillDown({
          label: `${THAI_MONTHS_FULL[monthIdx]} ${year + 543}`,
          mode: 'days',
          logs: filtered,
          totalCalories: point.calories,
        });
      }
    },
    [timeframe, todayLogs, allLogs],
  );

  // ── Switch timeframe (reset drill‑down) ────
  const switchTimeframe = (tf: Timeframe) => {
    setTimeframe(tf);
    setDrillDown(null);
    if (tf !== 'MONTHLY') setMonthOffset(0);
  };

  // ── Drill‑down meal summary pills ──────────
  const mealSummary = useMemo(() => {
    if (!drillDown) return [];
    const map: Record<string, { count: number; cal: number }> = {};
    drillDown.logs.forEach(l => {
      if (!map[l.mealType]) map[l.mealType] = { count: 0, cal: 0 };
      map[l.mealType].count++;
      map[l.mealType].cal += l.calories;
    });
    return Object.entries(map).map(([type, v]) => ({ type, ...v, cfg: mealCfg(type) }));
  }, [drillDown]);

  // ── Drill‑down day summary (YEARLY mode) ───
  const daySummary = useMemo<DaySummaryRow[]>(() => {
    if (!drillDown || drillDown.mode !== 'days') return [];
    const map: Record<string, { cal: number; count: number; date: Date }> = {};
    drillDown.logs.forEach(l => {
      const d = new Date(l.recordedAt);
      const dk = dateKey(d);
      if (!map[dk]) map[dk] = { cal: 0, count: 0, date: d };
      map[dk].cal += l.calories;
      map[dk].count++;
    });
    return Object.values(map)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map(v => ({
        dateDisplay: thaiDateShort(v.date),
        totalCalories: v.cal,
        mealCount: v.count,
        isOverGoal: v.cal > goalCalories,
      }));
  }, [drillDown, goalCalories]);

  // ── Dynamic bar size ───────────────────────
  const barSize = timeframe === 'MONTHLY' ? 7 : timeframe === 'YEARLY' ? 22 : 32;

  // ── Max calories for day‑summary progress ──
  const maxDayCal = useMemo(
    () => Math.max(goalCalories, ...daySummary.map(d => d.totalCalories), 1),
    [daySummary, goalCalories],
  );

  // ═══════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════
  return (
    <div className="bg-[#111113] border border-gray-800 rounded-3xl p-6 shadow-2xl">

      {/* ── HEADER ─────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-white flex items-center truncate">
            <Calendar size={20} className="text-orange-500 mr-2 flex-shrink-0" />
            แคลอรี — {subtitle}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {drillDown ? '← กดปุ่มย้อนกลับเพื่อดูภาพรวม' : 'กดที่แท่งกราฟเพื่อดูรายละเอียด'}
          </p>
        </div>

        {/* Timeframe tabs */}
        <div className="flex bg-[#050506] p-1 rounded-xl border border-gray-800 w-full md:w-auto flex-shrink-0">
          {TIMEFRAME_TABS.map(tf => (
            <button
              key={tf.id}
              onClick={() => switchTimeframe(tf.id)}
              className={`flex-1 md:w-[4.5rem] py-2 text-xs font-bold rounded-lg transition-all ${
                timeframe === tf.id
                  ? 'bg-gray-800 text-white shadow-inner'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── MONTH NAVIGATION (MONTHLY only) ── */}
      {timeframe === 'MONTHLY' && !drillDown && (
        <div className="flex items-center justify-center gap-3 mb-4">
          <button
            onClick={() => setMonthOffset(p => p - 1)}
            className="p-2 rounded-lg border border-gray-800 hover:border-gray-600 text-gray-400 hover:text-white transition-all"
            aria-label="เดือนก่อนหน้า"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-bold text-white min-w-[150px] text-center">
            {subtitle}
          </span>
          <button
            onClick={() => setMonthOffset(p => Math.min(p + 1, 0))}
            disabled={monthOffset >= 0}
            className="p-2 rounded-lg border border-gray-800 hover:border-gray-600 text-gray-400 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="เดือนถัดไป"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── BODY: Chart OR Drill‑down ──────── */}
      {drillDown ? (
        <DrillDownView
          drillDown={drillDown}
          mealSummary={mealSummary}
          daySummary={daySummary}
          goalCalories={goalCalories}
          maxDayCal={maxDayCal}
          onBack={() => setDrillDown(null)}
        />
      ) : (
        <ChartView
          data={chartData}
          timeframe={timeframe}
          goalCalories={goalCalories}
          targetPerMeal={targetPerMeal}
          barSize={barSize}
          onBarClick={handleBarClick}
        />
      )}

      {/* ── LEGEND ─────────────────────────── */}
      {!drillDown && (
        <div className="flex items-center justify-center mt-4 gap-4 text-[10px] text-gray-600 font-mono flex-wrap">
          <LegendDot color="bg-orange-500" label="วันนี้ / เดือนนี้" />
          <LegendDot color="bg-[#27272a]" label="วันอื่น ๆ" />
          {timeframe !== 'DAILY' && (
            <LegendDot color="bg-red-500" label="เกินเป้า" />
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub‑component: ChartView
// ─────────────────────────────────────────────
function ChartView({
  data,
  timeframe,
  goalCalories,
  targetPerMeal,
  barSize,
  onBarClick,
}: {
  data: ChartPoint[];
  timeframe: Timeframe;
  goalCalories: number;
  targetPerMeal: number;
  barSize: number;
  onBarClick: (p: ChartPoint) => void;
}) {
  return (
    <div className="h-60 w-full" style={{ cursor: 'pointer' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="name"
            stroke="#555"
            fontSize={timeframe === 'MONTHLY' ? 9 : 11}
            tickLine={false}
            axisLine={false}
            interval={timeframe === 'MONTHLY' ? 4 : 0}
          />

          {/* เส้นเป้าหมาย */}
          {timeframe === 'DAILY' && (
            <ReferenceLine
              y={targetPerMeal}
              stroke="#f97316"
              strokeDasharray="4 4"
              strokeOpacity={0.35}
            />
          )}
          {(timeframe === 'WEEKLY' || timeframe === 'MONTHLY') && (
            <ReferenceLine
              y={goalCalories}
              stroke="#f97316"
              strokeDasharray="4 4"
              strokeOpacity={0.25}
              label={{
                value: `เป้า ${goalCalories.toLocaleString()}`,
                position: 'insideTopRight',
                fill: '#f97316',
                fontSize: 9,
              }}
            />
          )}

          <Tooltip
            cursor={{ fill: '#17171a' }}
            contentStyle={{
              backgroundColor: '#111113',
              borderColor: '#333',
              borderRadius: '12px',
              color: '#fff',
            }}
            itemStyle={{ color: '#fff', fontWeight: 'bold' }}
            formatter={(value) => [`${Number(value).toLocaleString()} kcal`, 'แคลอรี']}
          />

          <Bar
            dataKey="calories"
            radius={[4, 4, 4, 4]}
            barSize={barSize}
            onClick={(entry) => onBarClick(entry as unknown as ChartPoint)}
          >
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={
                  entry.isToday
                    ? '#f97316'
                    : entry.isOverGoal
                      ? '#ef4444'
                      : entry.calories > 0
                        ? '#27272a'
                        : '#1a1a1d'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub‑component: DrillDownView
// ─────────────────────────────────────────────
function DrillDownView({
  drillDown,
  mealSummary,
  daySummary,
  goalCalories,
  maxDayCal,
  onBack,
}: {
  drillDown: DrillDownState;
  mealSummary: { type: string; count: number; cal: number; cfg: { label: string; icon: string; cls: string } }[];
  daySummary: DaySummaryRow[];
  goalCalories: number;
  maxDayCal: number;
  onBack: () => void;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">

      {/* ── Back + total header ──────────── */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-orange-500 transition-colors px-3 py-2 rounded-xl border border-gray-800 hover:border-orange-500/30 bg-[#050506]"
        >
          <ArrowLeft size={14} />
          ย้อนกลับ
        </button>
        <div className="text-right">
          <span className="text-2xl font-black text-white font-mono">
            {drillDown.totalCalories.toLocaleString()}
          </span>
          <span className="text-xs text-gray-500 ml-1">kcal</span>
          {drillDown.totalCalories > goalCalories && drillDown.mode === 'meals' && (
            <span className="ml-2 text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20 font-bold">
              เกินเป้า +{(drillDown.totalCalories - goalCalories).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* ── Meal summary pills ───────────── */}
      {mealSummary.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {mealSummary.map(({ type, count, cal, cfg }) => (
            <div
              key={type}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${cfg.cls}`}
            >
              <span className="text-base leading-none">{cfg.icon}</span>
              <div className="min-w-0">
                <span className="text-xs font-bold block truncate">{cfg.label}</span>
                <span className="text-[10px] font-mono opacity-70">
                  {cal.toLocaleString()} kcal · {count} เมนู
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Content (meals list OR day summary) */}
      {drillDown.mode === 'days' ? (
        <DaySummaryList rows={daySummary} goalCalories={goalCalories} maxCal={maxDayCal} />
      ) : (
        <MealLogList logs={drillDown.logs} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub‑component: MealLogList (รายการอาหารทีละเมนู)
// ─────────────────────────────────────────────
function MealLogList({ logs }: { logs: FoodLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="bg-[#050506] rounded-2xl border border-gray-800/80 py-10 text-center">
        <Utensils size={24} className="mx-auto text-gray-600 mb-2" />
        <p className="text-sm text-gray-500">ไม่มีข้อมูลอาหาร</p>
      </div>
    );
  }

  return (
    <div className="bg-[#050506] rounded-2xl border border-gray-800/80 overflow-hidden max-h-[340px] overflow-y-auto custom-scrollbar">
      {logs.map((log, idx) => {
        const cfg = mealCfg(log.mealType);
        const d = new Date(log.recordedAt);
        const isToday = d.toDateString() === new Date().toDateString();
        const timeDisplay = isToday
          ? d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
          : `${thaiDateShort(d)} ${d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`;

        return (
          <div
            key={log.id ?? idx}
            className="flex items-center justify-between px-4 py-3 border-b border-gray-800/50 last:border-0 hover:bg-[#111113]/60 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg border whitespace-nowrap ${cfg.cls}`}>
                {cfg.label}
              </span>
              <div className="min-w-0">
                <span className="text-sm font-bold text-gray-100 block truncate">{log.foodName}</span>
                <span className="text-[10px] text-gray-500 font-mono">{timeDisplay}</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-3">
              <span className="text-sm font-bold text-white font-mono">{log.calories}</span>
              <span className="text-[10px] text-gray-500 block font-mono">kcal</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// Sub‑component: DaySummaryList (สรุปรายวัน — YEARLY drill‑down)
// ─────────────────────────────────────────────
function DaySummaryList({
  rows,
  goalCalories,
  maxCal,
}: {
  rows: DaySummaryRow[];
  goalCalories: number;
  maxCal: number;
}) {
  if (rows.length === 0) {
    return (
      <div className="bg-[#050506] rounded-2xl border border-gray-800/80 py-10 text-center">
        <Calendar size={24} className="mx-auto text-gray-600 mb-2" />
        <p className="text-sm text-gray-500">ไม่มีข้อมูลในเดือนนี้</p>
      </div>
    );
  }

  const avgCal = Math.round(rows.reduce((s, r) => s + r.totalCalories, 0) / rows.length);

  return (
    <div className="space-y-2">
      {/* Average badge */}
      <div className="flex items-center justify-between bg-[#050506] rounded-xl border border-gray-800/60 px-4 py-2.5 text-xs">
        <span className="text-gray-400 font-medium">ค่าเฉลี่ยต่อวัน</span>
        <span className={`font-mono font-bold ${avgCal > goalCalories ? 'text-red-400' : 'text-green-400'}`}>
          {avgCal.toLocaleString()} kcal
        </span>
      </div>

      {/* Day rows */}
      <div className="bg-[#050506] rounded-2xl border border-gray-800/80 overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar">
        {rows.map((row, i) => {
          const pct = Math.min(100, (row.totalCalories / maxCal) * 100);
          return (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-800/40 last:border-0 hover:bg-[#111113]/40 transition-colors"
            >
              <span className="text-xs font-mono text-gray-400 w-14 flex-shrink-0">
                {row.dateDisplay}
              </span>

              {/* Progress bar */}
              <div className="flex-1 h-[6px] bg-[#1a1a1d] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    row.isOverGoal ? 'bg-red-500' : 'bg-orange-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <span className="text-xs font-mono font-bold text-white w-[70px] text-right flex-shrink-0">
                {row.totalCalories.toLocaleString()}
              </span>
              <span className="text-[10px] text-gray-500 font-mono w-12 text-right flex-shrink-0">
                {row.mealCount} เมนู
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Tiny helper: Legend dot
// ─────────────────────────────────────────────
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`w-2 h-2 rounded-sm ${color} inline-block`} />
      {label}
    </span>
  );
}
