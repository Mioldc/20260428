import { type ReactElement } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function Statement(): ReactElement {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">客户对账单</h2>
        <p className="text-muted-foreground">按客户和时间段生成对账单</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>对账单</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">对账单功能将在 Phase 3 实现。</p>
        </CardContent>
      </Card>
    </div>
  );
}
