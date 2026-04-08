import { type ReactElement } from 'react';
import { Link } from 'react-router';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function WorkerList(): ReactElement {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">工人工资</h2>
          <p className="text-muted-foreground">管理工人信息和工资发放</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/workers/attendance">出勤录入</Link>
          </Button>
          <Button>
            <Plus className="h-4 w-4" />
            添加工人
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>工人列表</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">暂无工人数据。</p>
        </CardContent>
      </Card>
    </div>
  );
}
