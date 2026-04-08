import { type ReactElement } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function Attendance(): ReactElement {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">临时工出勤</h2>
        <p className="text-muted-foreground">录入临时工每日出勤记录</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>出勤录入</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">出勤录入功能将在 Phase 3 实现。</p>
        </CardContent>
      </Card>
    </div>
  );
}
