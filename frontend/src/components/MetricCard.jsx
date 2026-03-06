import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const MetricCard = ({ testId, title, value, helper, positive }) => (
  <Card className="panel animated-in" data-testid={testId}>
    <CardHeader className="pb-3">
      <CardTitle className="text-xs uppercase tracking-[0.15em] text-zinc-500">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <p
        className={`metric-value text-3xl font-bold ${
          positive === undefined ? "text-zinc-100" : positive ? "text-green-400" : "text-red-400"
        }`}
        data-testid={`${testId}-value`}
      >
        {value}
      </p>
      {helper && (
        <p className="mt-2 text-xs text-zinc-500" data-testid={`${testId}-helper`}>
          {helper}
        </p>
      )}
    </CardContent>
  </Card>
);
