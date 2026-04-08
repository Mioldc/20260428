import { type ReactElement } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function Finance(): ReactElement {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">收款对账</h2>
          <p className="text-muted-foreground">管理收款记录和客户对账</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/finance/statement">生成对账单</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>收款记录</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">收款对账功能将在 Phase 3 实现。</p>
        </CardContent>
      </Card>
    </div>
  );
}
