import { Mail, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiErrorMessage } from '@/lib/axios';
import type { ReportKind } from '../types';
import { useEmailReport, useReport } from '../api/report-api';

const kinds: { value: ReportKind; label: string }[] = [
  { value: 'sales', label: 'Sales' },
  { value: 'purchases', label: 'Purchases' },
  { value: 'stock', label: 'Stock' },
  { value: 'profit', label: 'Profit' },
  { value: 'gst', label: 'GST' },
  { value: 'expiry', label: 'Expiry' },
  { value: 'customers', label: 'Customers' },
  { value: 'suppliers', label: 'Suppliers' },
];

export default function ReportsPage() {
  const [kind, setKind] = useState<ReportKind>('sales');
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [email, setEmail] = useState('');
  const filters = { kind, groupBy, from: from || undefined, to: to || undefined };
  const report = useReport(filters);
  const emailReport = useEmailReport();

  return (
    <div>
      <PageHeader title="Reports" description="Operational reports for sales, purchases, stock, GST, expiry, customers, and suppliers." />

      <Card className="mb-4">
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_1fr_1fr_1.2fr_auto_auto]">
          <div>
            <Label>Report</Label>
            <Select value={kind} onValueChange={(value) => setKind(value as ReportKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {kinds.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Group</Label>
            <Select value={groupBy} onValueChange={(value) => setGroupBy(value as 'day' | 'month')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div><Label>Email to</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@example.com" /></div>
          <Button className="self-end" variant="outline" onClick={() => void report.refetch()}><RefreshCw /> Refresh</Button>
          <Button
            className="self-end"
            loading={emailReport.isPending}
            onClick={() => {
              if (!email) {
                toast.error('Enter an email address');
                return;
              }
              emailReport.mutate({ ...filters, to: email }, {
                onSuccess: () => toast.success('Report emailed'),
                onError: (error) => toast.error(apiErrorMessage(error)),
              });
            }}
          >
            <Mail /> Email
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{kinds.find((item) => item.value === kind)?.label} report</CardTitle></CardHeader>
        <CardContent>
          {report.isLoading && <p className="text-sm text-muted-foreground">Loading report...</p>}
          {report.data && (
            <pre className="max-h-[60vh] overflow-auto rounded-lg bg-muted p-4 text-xs">
              {JSON.stringify(report.data.data, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
